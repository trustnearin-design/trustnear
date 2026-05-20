import { prisma, type Prisma } from '@sevalink/db';
import {
  ConflictError,
  DomainError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
} from '@sevalink/types';
import { logger } from '../../logger.js';
import { getPaymentProvider } from './factory.js';
import type { WebhookEvent } from './provider.js';

export interface CreatePaymentInput {
  bookingId: string;
  customerId: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  bookingId: string;
  paymentSessionId: string;
  providerOrderId: string;
  amountPaise: number;
  provider: string;
  status: string;
}

/**
 * Create a payment order for a booking.
 *
 * Idempotent at two layers:
 *   • Our X-Idempotency-Key middleware (caller-driven retry safety)
 *   • Cashfree's order_id = our bookingId — repeated creates return the
 *     existing order. We catch that and return the cached row instead.
 */
export async function createPaymentForBooking(
  input: CreatePaymentInput,
): Promise<CreatePaymentResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      bookingNumber: true,
      customerId: true,
      totalAmount: true,
      paymentStatus: true,
      razorpayOrderId: true,
      status: true,
      customer: { select: { fullName: true, phone: true, email: true } },
    },
  });
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.customerId !== input.customerId) {
    throw new ForbiddenError('Not your booking');
  }
  if (booking.paymentStatus === 'paid') {
    throw new ConflictError('Booking already paid');
  }
  if (['cancelled_customer', 'cancelled_pro', 'disputed'].includes(booking.status)) {
    throw new DomainError(
      ErrorCode.SL_302_INVALID_STATUS_TRANSITION,
      `Cannot pay for booking in status ${booking.status}`,
      409,
    );
  }
  if (booking.totalAmount <= 0) {
    throw new DomainError(ErrorCode.SL_906_BAD_REQUEST, 'Booking total is zero', 400);
  }

  const provider = await getPaymentProvider();
  const order = await provider.createOrder({
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    amountPaise: booking.totalAmount,
    customer: {
      id: booking.customerId,
      name: booking.customer.fullName,
      phone: booking.customer.phone,
      ...(booking.customer.email ? { email: booking.customer.email } : {}),
      ...(input.customerEmail ? { email: input.customerEmail } : {}),
    },
  });

  // Persist provider order id on the booking. We reuse razorpayOrderId
  // as the provider-agnostic field (column will be renamed in a later
  // schema migration — keeping it stable for now avoids a breaking change).
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      razorpayOrderId: order.providerOrderId,
      paymentStatus: 'pending',
    },
  });

  logger.info(
    {
      bookingId: booking.id,
      provider: order.provider,
      providerOrderId: order.providerOrderId,
      amount: order.amountPaise,
    },
    'payments: order created',
  );

  return {
    bookingId: booking.id,
    paymentSessionId: order.paymentSessionId,
    providerOrderId: order.providerOrderId,
    amountPaise: order.amountPaise,
    provider: order.provider,
    status: order.status,
  };
}

/**
 * Reconcile the booking with the gateway — used both by the customer's
 * post-payment confirmation request AND by our webhook handler.
 *
 * Atomic + idempotent: any double-call (race between webhook and verify)
 * results in at most one wallet transaction.
 */
export async function reconcilePayment(args: {
  bookingId: string;
  fromWebhook?: boolean;
  providerPaymentIdOverride?: string;
}): Promise<{ status: string; alreadyProcessed: boolean }> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      paymentStatus: true,
      totalAmount: true,
      customerId: true,
      professionalId: true,
      razorpayOrderId: true,
    },
  });
  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.paymentStatus === 'paid') {
    return { status: 'paid', alreadyProcessed: true };
  }

  const provider = await getPaymentProvider();
  const orderId = booking.razorpayOrderId ?? booking.id;
  const order = await provider.getOrderStatus(orderId);

  if (order.status === 'PAID') {
    await markBookingPaid({
      bookingId: booking.id,
      customerId: booking.customerId,
      amountPaise: booking.totalAmount,
      providerPaymentId: args.providerPaymentIdOverride ?? order.providerPaymentId,
      paymentMethod: order.paymentMethod,
      fromWebhook: args.fromWebhook ?? false,
    });
    return { status: 'paid', alreadyProcessed: false };
  }
  if (order.status === 'FAILED') {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: 'failed' },
    });
    return { status: 'failed', alreadyProcessed: false };
  }
  // ACTIVE / PENDING / EXPIRED — leave as-is
  return { status: order.status.toLowerCase(), alreadyProcessed: false };
}

/**
 * Atomic state change: booking → paid + wallet ledger entry.
 * Uses a Prisma transaction so the booking and ledger row land together
 * (or neither, on failure).
 */
async function markBookingPaid(args: {
  bookingId: string;
  customerId: string;
  amountPaise: number;
  providerPaymentId?: string | undefined;
  paymentMethod?: string | undefined;
  fromWebhook: boolean;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to win any race vs. webhook ↔ verify
    const fresh = await tx.booking.findUnique({
      where: { id: args.bookingId },
      select: { paymentStatus: true },
    });
    if (!fresh || fresh.paymentStatus === 'paid') {
      return; // someone else already processed it
    }

    const mappedMethod = args.paymentMethod ? mapPaymentMethod(args.paymentMethod) : undefined;
    await tx.booking.update({
      where: { id: args.bookingId },
      data: {
        paymentStatus: 'paid',
        ...(args.providerPaymentId ? { razorpayPaymentId: args.providerPaymentId } : {}),
        ...(mappedMethod ? { paymentMethod: mappedMethod } : {}),
      },
    });

    // Ledger: customer "debit" representing their out-of-wallet spend.
    // We DO NOT touch user.walletBalance — money came from outside.
    // This row exists purely for the audit trail / transactions screen.
    await tx.walletTransaction.create({
      data: {
        userId: args.customerId,
        type: 'debit',
        reason: 'booking_payment',
        amount: args.amountPaise,
        balanceAfter: 0, // not a wallet-balance-affecting txn
        referenceId: args.bookingId,
        metadata: {
          providerPaymentId: args.providerPaymentId ?? null,
          paymentMethod: args.paymentMethod ?? null,
          processedVia: args.fromWebhook ? 'webhook' : 'verify',
        } as Prisma.InputJsonValue,
      },
    });
  });

  logger.info(
    {
      bookingId: args.bookingId,
      amount: args.amountPaise,
      providerPaymentId: args.providerPaymentId,
      fromWebhook: args.fromWebhook,
    },
    'payments: booking marked paid',
  );
}

function mapPaymentMethod(
  method: string,
): 'upi' | 'card' | 'wallet' | 'cash' | 'sevalink_wallet' | undefined {
  switch (method) {
    case 'upi':
      return 'upi';
    case 'card':
      return 'card';
    case 'netbanking':
    case 'wallet':
      return 'wallet';
    default:
      return undefined;
  }
}

/**
 * Process a parsed webhook event from any provider.
 *
 * Trust model: the route already verified the HMAC signature, so the payload
 * came from the gateway. We trust the success/failure indicator + payment id
 * and act directly — NO re-fetch round-trip. Re-fetch is reserved for the
 * customer's defensive /verify endpoint (which has no signature to vet).
 *
 * Idempotency: markBookingPaid re-checks status inside a transaction, so
 * webhook replays + race with /verify both end up creating at most one
 * wallet transaction.
 */
export async function handleWebhookEvent(event: WebhookEvent): Promise<void> {
  if (!event.bookingId) {
    logger.warn({ event }, 'payments: webhook had no bookingId — ignoring');
    return;
  }

  if (event.type === 'payment.captured') {
    const booking = await prisma.booking.findUnique({
      where: { id: event.bookingId },
      select: { id: true, customerId: true, totalAmount: true, paymentStatus: true },
    });
    if (!booking) {
      logger.warn({ event }, 'payments: webhook for unknown booking');
      return;
    }
    if (booking.paymentStatus === 'paid') {
      logger.info({ bookingId: booking.id }, 'payments: webhook replay (already paid)');
      return;
    }
    if (event.amountPaise > 0 && event.amountPaise !== booking.totalAmount) {
      // Defense-in-depth: don't mark paid if amounts disagree
      logger.error(
        { bookingId: booking.id, expected: booking.totalAmount, got: event.amountPaise },
        'payments: webhook amount mismatch — refusing to mark paid',
      );
      return;
    }
    await markBookingPaid({
      bookingId: booking.id,
      customerId: booking.customerId,
      amountPaise: booking.totalAmount,
      ...(event.providerPaymentId ? { providerPaymentId: event.providerPaymentId } : {}),
      ...(event.paymentMethod ? { paymentMethod: event.paymentMethod } : {}),
      fromWebhook: true,
    });
    return;
  }

  if (event.type === 'payment.failed') {
    await prisma.booking.updateMany({
      where: { id: event.bookingId, paymentStatus: { not: 'paid' } },
      data: { paymentStatus: 'failed' },
    });
    logger.info({ bookingId: event.bookingId }, 'payments: webhook recorded failure');
    return;
  }

  logger.info({ type: event.type, bookingId: event.bookingId }, 'payments: webhook ignored');
}
