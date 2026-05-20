/**
 * PaymentProvider — single interface for all gateways.
 *
 * Why this abstraction matters:
 *   We currently use Cashfree, but tomorrow we may swap to Razorpay or Stripe.
 *   Every gateway has the same conceptual surface: create order, verify order
 *   status, verify webhook signature. By implementing this interface, switching
 *   providers means changing ONE config value (app_config.payment_provider) +
 *   adding the env credentials. ZERO caller code changes.
 *
 * All amounts in PAISE (integer). Currency is INR for all Indian gateways.
 */

export interface PaymentCustomerDetails {
  /** Stable identifier — we pass our internal user id */
  id: string;
  email?: string | undefined;
  /** E.164 phone number e.g. +919876543210 */
  phone: string;
  name: string;
}

export interface CreateOrderInput {
  /** Our internal booking id — also used as the gateway's order_id (idempotent) */
  bookingId: string;
  /** Human-readable booking number for the receipt */
  bookingNumber: string;
  amountPaise: number;
  customer: PaymentCustomerDetails;
  /** Where the gateway should redirect the customer's app after payment */
  returnUrl?: string;
  /** Optional extra context for the receipt */
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  /** Gateway-side order id we'll use to look the order up later */
  providerOrderId: string;
  /** Token mobile app passes to the gateway SDK to open the payment sheet */
  paymentSessionId: string;
  /** Status as reported by the gateway right after creation (usually ACTIVE) */
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING';
  /** Amount echoed back from the gateway for audit */
  amountPaise: number;
  /** Provider name (cashfree/razorpay/etc) so caller can store it */
  provider: string;
  /** Raw payload kept for audit/debugging */
  raw: unknown;
}

export interface OrderStatusResult {
  providerOrderId: string;
  status: 'ACTIVE' | 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING';
  amountPaise: number;
  paymentMethod?: string | undefined;
  /** Provider's payment id (for refunds, support tickets) */
  providerPaymentId?: string | undefined;
  raw: unknown;
}

export interface WebhookVerifyInput {
  /** Raw request body — MUST be the unmodified bytes, NOT a re-serialized JSON */
  rawBody: string;
  /** Signature header value from the request */
  signature: string;
  /** Optional timestamp header (Cashfree style) */
  timestamp?: string;
}

export interface WebhookEvent {
  /** What happened: payment captured, payment failed, refund processed, etc. */
  type: 'payment.captured' | 'payment.failed' | 'payment.pending' | 'refund.processed' | 'unknown';
  providerOrderId: string;
  /** Our bookingId if the gateway echoed it back (we always pass it) */
  bookingId?: string | undefined;
  amountPaise: number;
  providerPaymentId?: string | undefined;
  paymentMethod?: string | undefined;
  occurredAt: Date;
  raw: unknown;
}

export interface PaymentProvider {
  readonly name: 'cashfree' | 'razorpay' | 'stripe' | 'mock';

  createOrder(input: CreateOrderInput): Promise<CreateOrderResult>;
  getOrderStatus(providerOrderId: string): Promise<OrderStatusResult>;

  /**
   * Verify webhook signature timing-safely.
   * Throws if signature is invalid (caller catches → returns 401).
   */
  verifyWebhookSignature(input: WebhookVerifyInput): void;

  /**
   * Parse the webhook body into a normalized WebhookEvent.
   * Gateway-specific decoding lives here so our payment service only sees
   * the canonical shape.
   */
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
