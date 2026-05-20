import { createHmac } from 'node:crypto';
import { timingSafeEqual } from '@sevalink/utils';
import { DomainError, ErrorCode } from '@sevalink/types';
import { logger } from '../../logger.js';
import type {
  CreateOrderInput,
  CreateOrderResult,
  OrderStatusResult,
  PaymentProvider,
  WebhookEvent,
  WebhookVerifyInput,
} from './provider.js';

/**
 * Cashfree PG (Payment Gateway) provider.
 *
 * API version: 2023-08-01 (latest stable as of build date).
 * Docs: https://docs.cashfree.com/reference/pg-new-apis-endpoint
 */

const SANDBOX_URL = 'https://sandbox.cashfree.com/pg';
const PRODUCTION_URL = 'https://api.cashfree.com/pg';
const API_VERSION = '2023-08-01';

function paiseToRupeesString(paise: number): string {
  // Cashfree wants order_amount in rupees as a number with 2 decimals.
  return (paise / 100).toFixed(2);
}

function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

function mapStatus(raw: string): CreateOrderResult['status'] {
  // Cashfree order statuses: ACTIVE, PAID, EXPIRED
  // Payment statuses (different field): SUCCESS, FAILED, PENDING, USER_DROPPED, CANCELLED
  switch (raw) {
    case 'PAID':
    case 'SUCCESS':
      return 'PAID';
    case 'ACTIVE':
      return 'ACTIVE';
    case 'EXPIRED':
      return 'EXPIRED';
    case 'FAILED':
    case 'USER_DROPPED':
    case 'CANCELLED':
      return 'FAILED';
    case 'PENDING':
      return 'PENDING';
    default:
      return 'PENDING';
  }
}

interface CashfreeCreateOrderResponse {
  cf_order_id?: number;
  order_id?: string;
  payment_session_id?: string;
  order_status?: string;
  order_amount?: number;
  type?: string;
  message?: string;
  code?: string;
}

interface CashfreeOrderStatusResponse {
  cf_order_id?: number;
  order_id?: string;
  order_status?: string;
  order_amount?: number;
  payments?: {
    cf_payment_id?: number;
    payment_status?: string;
    payment_amount?: number;
    payment_method?: { upi?: object; card?: object; netbanking?: object } | string;
  }[];
}

interface CashfreeWebhookData {
  type?: string;
  event_time?: string;
  data?: {
    order?: { order_id?: string; order_amount?: number };
    payment?: {
      cf_payment_id?: number;
      payment_amount?: number;
      payment_status?: string;
      payment_method?: { upi?: object; card?: object } | string;
    };
  };
}

export class CashfreePaymentProvider implements PaymentProvider {
  readonly name = 'cashfree' as const;
  private readonly baseUrl: string;
  private readonly appId: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(args: {
    environment: 'sandbox' | 'production';
    appId: string;
    secretKey: string;
    webhookSecret?: string;
  }) {
    if (!args.appId || !args.secretKey) {
      throw new Error('Cashfree: appId and secretKey are required');
    }
    this.baseUrl = args.environment === 'production' ? PRODUCTION_URL : SANDBOX_URL;
    this.appId = args.appId;
    this.secretKey = args.secretKey;
    // Webhook secret defaults to the secret key (Cashfree's default behavior
    // when you haven't set a separate webhook secret in their dashboard).
    this.webhookSecret = args.webhookSecret ?? args.secretKey;
  }

  private headers(): Record<string, string> {
    return {
      'x-client-id': this.appId,
      'x-client-secret': this.secretKey,
      'x-api-version': API_VERSION,
      'Content-Type': 'application/json',
    };
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
    const body = {
      // Use our bookingId as order_id — guarantees idempotency.
      // Cashfree rejects duplicate order_ids → caller catches + treats as success.
      order_id: input.bookingId,
      order_amount: Number(paiseToRupeesString(input.amountPaise)),
      order_currency: 'INR',
      customer_details: {
        customer_id: input.customer.id,
        customer_email: input.customer.email ?? `${input.customer.phone}@sevalink.placeholder`,
        customer_phone: input.customer.phone.replace(/^\+91/, ''), // Cashfree wants 10-digit
        customer_name: input.customer.name,
      },
      order_meta: {
        return_url: input.returnUrl ?? 'https://sevalink.in/booking/{order_id}',
        notify_url: undefined as string | undefined,
        ...(input.notes ?? {}),
      },
      order_note: `Booking ${input.bookingNumber}`,
    };

    const res = await fetch(`${this.baseUrl}/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json()) as CashfreeCreateOrderResponse;

    if (!res.ok) {
      logger.error({ status: res.status, json }, 'cashfree createOrder failed');
      throw new DomainError(
        ErrorCode.SL_401_PAYMENT_FAILED,
        json.message ?? `Cashfree returned ${String(res.status)}`,
        502,
        { cashfreeCode: json.code, cashfreeType: json.type },
      );
    }

    if (!json.payment_session_id || !json.order_id) {
      throw new DomainError(
        ErrorCode.SL_401_PAYMENT_FAILED,
        'Cashfree response missing payment_session_id',
        502,
        { raw: json },
      );
    }

    return {
      providerOrderId: json.order_id,
      paymentSessionId: json.payment_session_id,
      status: mapStatus(json.order_status ?? 'ACTIVE'),
      amountPaise: json.order_amount ? rupeesToPaise(json.order_amount) : input.amountPaise,
      provider: this.name,
      raw: json,
    };
  }

  async getOrderStatus(providerOrderId: string): Promise<OrderStatusResult> {
    const res = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(providerOrderId)}`, {
      method: 'GET',
      headers: this.headers(),
      signal: AbortSignal.timeout(10_000),
    });

    const json = (await res.json()) as CashfreeOrderStatusResponse;
    if (!res.ok) {
      throw new DomainError(
        ErrorCode.SL_401_PAYMENT_FAILED,
        `Cashfree order lookup failed (${String(res.status)})`,
        502,
        { raw: json },
      );
    }

    const successful = json.payments?.find((p) => p.payment_status === 'SUCCESS');
    const paymentMethod = describeMethod(successful?.payment_method);

    return {
      providerOrderId: json.order_id ?? providerOrderId,
      status: mapStatus(json.order_status ?? 'PENDING'),
      amountPaise: json.order_amount ? rupeesToPaise(json.order_amount) : 0,
      paymentMethod,
      providerPaymentId:
        successful?.cf_payment_id !== undefined ? String(successful.cf_payment_id) : undefined,
      raw: json,
    };
  }

  /**
   * Cashfree webhook signature = base64( HMAC-SHA256( timestamp + raw_body, secret ) )
   * Headers: `x-webhook-signature`, `x-webhook-timestamp`
   * Reference: https://docs.cashfree.com/docs/webhooks-version-2023-08-01
   */
  verifyWebhookSignature(input: WebhookVerifyInput): void {
    if (!input.timestamp) {
      throw new DomainError(
        ErrorCode.SL_402_INVALID_SIGNATURE,
        'Cashfree webhook missing x-webhook-timestamp header',
        401,
      );
    }
    const expected = createHmac('sha256', this.webhookSecret)
      .update(input.timestamp + input.rawBody)
      .digest('base64');

    if (!timingSafeEqual(expected, input.signature)) {
      throw new DomainError(
        ErrorCode.SL_402_INVALID_SIGNATURE,
        'Cashfree webhook signature mismatch',
        401,
      );
    }
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody) as CashfreeWebhookData;
    const order = payload.data?.order;
    const payment = payload.data?.payment;

    let type: WebhookEvent['type'] = 'unknown';
    const wType = payload.type ?? '';
    if (wType.includes('SUCCESS') || payment?.payment_status === 'SUCCESS') {
      type = 'payment.captured';
    } else if (wType.includes('FAILED') || payment?.payment_status === 'FAILED') {
      type = 'payment.failed';
    } else if (wType.includes('PENDING')) {
      type = 'payment.pending';
    } else if (wType.includes('REFUND')) {
      type = 'refund.processed';
    }

    return {
      type,
      providerOrderId: order?.order_id ?? '',
      bookingId: order?.order_id,
      amountPaise:
        payment?.payment_amount !== undefined
          ? rupeesToPaise(payment.payment_amount)
          : order?.order_amount !== undefined
            ? rupeesToPaise(order.order_amount)
            : 0,
      providerPaymentId:
        payment?.cf_payment_id !== undefined ? String(payment.cf_payment_id) : undefined,
      paymentMethod: describeMethod(payment?.payment_method),
      occurredAt: payload.event_time ? new Date(payload.event_time) : new Date(),
      raw: payload,
    };
  }
}

function describeMethod(
  method: { upi?: object; card?: object; netbanking?: object } | string | undefined,
): string | undefined {
  if (!method) return undefined;
  if (typeof method === 'string') return method;
  if (method.upi) return 'upi';
  if (method.card) return 'card';
  if (method.netbanking) return 'netbanking';
  return 'unknown';
}
