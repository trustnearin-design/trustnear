import { prisma, type Prisma } from '@sevalink/db';
import {
  ConflictError,
  DomainError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
} from '@sevalink/types';
import { logger } from '../../logger.js';
import { notifyPaymentReceived } from '../notifications/service.js';
import { getPaymentProvider } from './factory.js';
import { isWalletTopupOrder, reconcileWalletTopup } from '../wallet/topup-service.js';
import type { WebhookEvent } from './provider.js';

export interface CreatePaymentInput {
  bookingId: string;
  customerId: string;
  customerEmail?: string;
  /** Apply the customer's wallet balance to this booking. */
  useWallet?: boolean;
}

export interface CreatePaymentResult {
  bookingId: string;
  paymentSessionId: string;
  providerOrderId: string;
  /** Amount the gateway will charge (total − walletApplied). 0 if fully paid by wallet. */
  amountPaise: number;
  provider: string;
  /** Gateway environment — the client opens its SDK in this same env. */
  environment: 'sandbox' | 'production';
  status: string;
  /** Wallet balance applied to this booking (paise). */
  walletApplied: number;
  /**
   * True when the wallet covered the full amount and the booking was settled
   * immediately — the client should SKIP opening the gateway SDK and just
   * confirm. False means open the payment sheet for `amountPaise`.
   */
  paid: boolean;
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
      walletApplied: true,
      paymentStatus: true,
      razorpayOrderId: true,
      status: true,
      customer: { select: { fullName: true, phone: true, email: true, walletBalance: true } },
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

  // Decide how much wallet to apply. On a retry (order already minted, still
  // pending) keep the originally-applied amount stable so the gateway amount
  // matches the existing order; otherwise compute from the live balance.
  const isRetry = !!booking.razorpayOrderId && booking.paymentStatus === 'pending';
  const walletToUse = isRetry
    ? booking.walletApplied
    : input.useWallet
      ? Math.min(booking.customer.walletBalance, booking.totalAmount)
      : 0;
  const gatewayAmount = booking.totalAmount - walletToUse;

  if (!isRetry && walletToUse !== booking.walletApplied) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { walletApplied: walletToUse },
    });
  }

  // Wallet covers the whole amount — settle immediately, no gateway round-trip.
  if (gatewayAmount <= 0) {
    await settleFullyFromWallet({
      bookingId: booking.id,
      customerId: booking.customerId,
      bookingNumber: booking.bookingNumber,
      walletToUse,
    });
    return {
      bookingId: booking.id,
      paymentSessionId: '',
      providerOrderId: '',
      amountPaise: 0,
      provider: 'wallet',
      environment: 'production', // unused when paid=true
      status: 'PAID',
      walletApplied: walletToUse,
      paid: true,
    };
  }

  const provider = await getPaymentProvider();
  const order = await provider.createOrder({
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    amountPaise: gatewayAmount,
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
      walletApplied: walletToUse,
    },
    'payments: order created',
  );

  return {
    bookingId: booking.id,
    paymentSessionId: order.paymentSessionId,
    providerOrderId: order.providerOrderId,
    amountPaise: order.amountPaise,
    provider: order.provider,
    environment: order.environment,
    status: order.status,
    walletApplied: walletToUse,
    paid: false,
  };
}

/**
 * Settle a booking entirely from the customer's wallet — no gateway. Atomic:
 * debit the wallet, write the ledger row, and mark the booking paid together.
 * Idempotent via the in-transaction paymentStatus re-check.
 */
async function settleFullyFromWallet(args: {
  bookingId: string;
  customerId: string;
  bookingNumber: string;
  walletToUse: number;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const fresh = await tx.booking.findUnique({
      where: { id: args.bookingId },
      select: { paymentStatus: true },
    });
    if (!fresh || fresh.paymentStatus === 'paid') return;

    const current = await tx.user.findUnique({
      where: { id: args.customerId },
      select: { walletBalance: true },
    });
    const debit = Math.min(args.walletToUse, current?.walletBalance ?? 0);
    const updated = await tx.user.update({
      where: { id: args.customerId },
      data: { walletBalance: { decrement: debit } },
      select: { walletBalance: true },
    });
    await tx.booking.update({
      where: { id: args.bookingId },
      data: { paymentStatus: 'paid', paymentMethod: 'sevalink_wallet', walletApplied: debit },
    });
    await tx.walletTransaction.create({
      data: {
        userId: args.customerId,
        type: 'debit',
        reason: 'booking_payment',
        amount: debit,
        balanceAfter: updated.walletBalance,
        referenceId: args.bookingId,
        metadata: { source: 'wallet', fullCoverage: true } as Prisma.InputJsonValue,
      },
    });
  });

  logger.info(
    { bookingId: args.bookingId, walletApplied: args.walletToUse },
    'payments: booking settled fully from wallet',
  );

  void notifyPaymentReceived({
    customerId: args.customerId,
    bookingId: args.bookingId,
    bookingNumber: args.bookingNumber,
    amountPaise: args.walletToUse,
  }).catch((err: unknown) => {
    logger.error({ err, bookingId: args.bookingId }, 'notify: wallet-settle dispatch failed');
  });
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
  /** When set (customer-initiated verify), the booking must belong to this user. Omitted for the trusted webhook path. */
  callerId?: string;
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
  // Ownership check for customer-initiated verify (prevents cross-tenant IDOR).
  if (args.callerId && booking.customerId !== args.callerId) {
    throw new ForbiddenError('Not your booking');
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
      select: { paymentStatus: true, walletApplied: true },
    });
    if (!fresh || fresh.paymentStatus === 'paid') {
      return; // someone else already processed it
    }

    // If wallet was applied at checkout, debit that portion now (atomically
    // with marking the booking paid). The gateway charged only the remainder.
    let balanceAfter = 0;
    if (fresh.walletApplied > 0) {
      const current = await tx.user.findUnique({
        where: { id: args.customerId },
        select: { walletBalance: true },
      });
      const walletDebit = Math.min(fresh.walletApplied, current?.walletBalance ?? 0);
      const updated = await tx.user.update({
        where: { id: args.customerId },
        data: { walletBalance: { decrement: walletDebit } },
        select: { walletBalance: true },
      });
      balanceAfter = updated.walletBalance;
      await tx.walletTransaction.create({
        data: {
          userId: args.customerId,
          type: 'debit',
          reason: 'booking_payment',
          amount: walletDebit,
          balanceAfter,
          referenceId: args.bookingId,
          metadata: { source: 'wallet' } as Prisma.InputJsonValue,
        },
      });
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

    // Ledger: customer "debit" representing the gateway-paid (out-of-wallet)
    // portion. We DO NOT touch user.walletBalance for this — money came from
    // outside. Row exists purely for the audit trail / transactions screen.
    const externalPaid = args.amountPaise - fresh.walletApplied;
    if (externalPaid > 0) {
      await tx.walletTransaction.create({
        data: {
          userId: args.customerId,
          type: 'debit',
          reason: 'booking_payment',
          amount: externalPaid,
          balanceAfter, // wallet balance unchanged by the gateway portion
          referenceId: args.bookingId,
          metadata: {
            source: 'gateway',
            providerPaymentId: args.providerPaymentId ?? null,
            paymentMethod: args.paymentMethod ?? null,
            processedVia: args.fromWebhook ? 'webhook' : 'verify',
          } as Prisma.InputJsonValue,
        },
      });
    }
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

  // Push-notify the customer (best effort — never blocks the payment flow).
  void (async () => {
    const detail = await prisma.booking.findUnique({
      where: { id: args.bookingId },
      select: { bookingNumber: true },
    });
    if (!detail) return;
    await notifyPaymentReceived({
      customerId: args.customerId,
      bookingId: args.bookingId,
      bookingNumber: detail.bookingNumber,
      amountPaise: args.amountPaise,
    });
  })().catch((err: unknown) => {
    logger.error({ err, bookingId: args.bookingId }, 'notify: payment-received dispatch failed');
  });
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

  // Wallet top-up orders share the gateway webhook. The order_id is a
  // WalletTopup id (not a Booking id), so route those to the topup reconciler.
  if (
    (event.type === 'payment.captured' || event.type === 'payment.failed') &&
    (await isWalletTopupOrder(event.bookingId))
  ) {
    await reconcileWalletTopup({
      topupId: event.bookingId,
      fromWebhook: true,
      providerPaymentIdOverride: event.providerPaymentId,
    });
    return;
  }

  if (event.type === 'payment.captured') {
    const booking = await prisma.booking.findUnique({
      where: { id: event.bookingId },
      select: {
        id: true,
        customerId: true,
        totalAmount: true,
        walletApplied: true,
        paymentStatus: true,
      },
    });
    if (!booking) {
      logger.warn({ event }, 'payments: webhook for unknown booking');
      return;
    }
    if (booking.paymentStatus === 'paid') {
      logger.info({ bookingId: booking.id }, 'payments: webhook replay (already paid)');
      return;
    }
    // The gateway only charged the non-wallet remainder, so compare against
    // that — not the full total.
    const expectedGateway = booking.totalAmount - booking.walletApplied;
    if (event.amountPaise > 0 && event.amountPaise !== expectedGateway) {
      // Defense-in-depth: don't mark paid if amounts disagree
      logger.error(
        { bookingId: booking.id, expected: expectedGateway, got: event.amountPaise },
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
