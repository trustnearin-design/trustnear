import { prisma, type Prisma } from '@sevalink/db';
import { DomainError, ErrorCode, ForbiddenError, NotFoundError } from '@sevalink/types';
import { logger } from '../../logger.js';
import { getPaymentProvider } from '../payments/factory.js';

/**
 * Wallet top-up ("Add money") flow. Mirrors the booking payment flow but is
 * booking-independent: a WalletTopup row binds user + amount + gateway order,
 * then verify (client) and webhook (gateway) both credit the wallet exactly
 * once via a status guard.
 */

const MIN_TOPUP_PAISE = 1000; // ₹10
const MAX_TOPUP_PAISE = 5_000_000; // ₹50,000

export interface CreateTopupResult {
  topupId: string;
  paymentSessionId: string;
  providerOrderId: string;
  amountPaise: number;
  provider: string;
  environment: 'sandbox' | 'production';
  status: string;
}

export async function createWalletTopup(args: {
  userId: string;
  amountPaise: number;
}): Promise<CreateTopupResult> {
  if (args.amountPaise < MIN_TOPUP_PAISE || args.amountPaise > MAX_TOPUP_PAISE) {
    throw new DomainError(
      ErrorCode.SL_906_BAD_REQUEST,
      `Amount must be between ₹${MIN_TOPUP_PAISE / 100} and ₹${MAX_TOPUP_PAISE / 100}`,
      400,
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { id: true, fullName: true, phone: true, email: true },
  });
  if (!user) throw new NotFoundError('User not found');

  // Create the pending row first so its id can serve as the gateway order_id.
  const topup = await prisma.walletTopup.create({
    data: { userId: user.id, amountPaise: args.amountPaise, status: 'pending' },
    select: { id: true },
  });

  const provider = await getPaymentProvider();
  const order = await provider.createOrder({
    bookingId: topup.id, // order_id = topup id (UUID → idempotent)
    bookingNumber: `TOPUP-${topup.id.slice(0, 8)}`,
    amountPaise: args.amountPaise,
    customer: {
      id: user.id,
      name: user.fullName,
      phone: user.phone,
      ...(user.email ? { email: user.email } : {}),
    },
  });

  await prisma.walletTopup.update({
    where: { id: topup.id },
    data: { providerOrderId: order.providerOrderId },
  });

  logger.info(
    { topupId: topup.id, amount: args.amountPaise, provider: order.provider },
    'wallet: top-up order created',
  );

  return {
    topupId: topup.id,
    paymentSessionId: order.paymentSessionId,
    providerOrderId: order.providerOrderId,
    amountPaise: order.amountPaise,
    provider: order.provider,
    environment: order.environment,
    status: order.status,
  };
}

/**
 * Reconcile a top-up against the gateway. Used by both the client verify
 * endpoint and the webhook. Idempotent: a double-call credits the wallet at
 * most once.
 */
export async function reconcileWalletTopup(args: {
  topupId: string;
  /** When set (client verify), the top-up must belong to this user. */
  callerId?: string;
  fromWebhook?: boolean;
  providerPaymentIdOverride?: string | undefined;
}): Promise<{ status: string; alreadyProcessed: boolean; creditedPaise: number }> {
  const topup = await prisma.walletTopup.findUnique({
    where: { id: args.topupId },
    select: { id: true, userId: true, amountPaise: true, status: true, providerOrderId: true },
  });
  if (!topup) throw new NotFoundError('Top-up not found');
  if (args.callerId && topup.userId !== args.callerId) {
    throw new ForbiddenError('Not your top-up');
  }
  if (topup.status === 'paid') {
    return { status: 'paid', alreadyProcessed: true, creditedPaise: topup.amountPaise };
  }

  const provider = await getPaymentProvider();
  const order = await provider.getOrderStatus(topup.providerOrderId ?? topup.id);

  if (order.status === 'PAID') {
    const credited = await creditTopup({
      topupId: topup.id,
      userId: topup.userId,
      amountPaise: topup.amountPaise,
      providerPaymentId: args.providerPaymentIdOverride ?? order.providerPaymentId,
      fromWebhook: args.fromWebhook ?? false,
    });
    return { status: 'paid', alreadyProcessed: !credited, creditedPaise: topup.amountPaise };
  }
  if (order.status === 'FAILED') {
    await prisma.walletTopup.updateMany({
      where: { id: topup.id, status: { not: 'paid' } },
      data: { status: 'failed' },
    });
    return { status: 'failed', alreadyProcessed: false, creditedPaise: 0 };
  }
  return { status: order.status.toLowerCase(), alreadyProcessed: false, creditedPaise: 0 };
}

/**
 * Atomic credit: flip the top-up to paid, bump walletBalance, write the
 * ledger row. Returns false if another caller already processed it.
 */
async function creditTopup(args: {
  topupId: string;
  userId: string;
  amountPaise: number;
  providerPaymentId?: string | undefined;
  fromWebhook: boolean;
}): Promise<boolean> {
  const credited = await prisma.$transaction(async (tx) => {
    const fresh = await tx.walletTopup.findUnique({
      where: { id: args.topupId },
      select: { status: true },
    });
    if (!fresh || fresh.status === 'paid') return false;

    const user = await tx.user.update({
      where: { id: args.userId },
      data: { walletBalance: { increment: args.amountPaise } },
      select: { walletBalance: true },
    });

    await tx.walletTransaction.create({
      data: {
        userId: args.userId,
        type: 'credit',
        reason: 'wallet_topup',
        amount: args.amountPaise,
        balanceAfter: user.walletBalance,
        referenceId: args.topupId,
        metadata: {
          providerPaymentId: args.providerPaymentId ?? null,
          processedVia: args.fromWebhook ? 'webhook' : 'verify',
        } as Prisma.InputJsonValue,
      },
    });

    await tx.walletTopup.update({
      where: { id: args.topupId },
      data: {
        status: 'paid',
        ...(args.providerPaymentId ? { providerPaymentId: args.providerPaymentId } : {}),
      },
    });
    return true;
  });

  if (credited) {
    logger.info(
      { topupId: args.topupId, amount: args.amountPaise, fromWebhook: args.fromWebhook },
      'wallet: top-up credited',
    );
  }
  return credited;
}

/** True if the given gateway order id corresponds to a wallet top-up. */
export async function isWalletTopupOrder(orderId: string): Promise<boolean> {
  const row = await prisma.walletTopup.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  return row !== null;
}
