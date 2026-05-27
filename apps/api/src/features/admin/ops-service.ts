import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';

// ─────────────────────────────────────────────────────────────
// Refunds
// ─────────────────────────────────────────────────────────────

/**
 * Admin refund — credits the customer wallet + flips booking
 * paymentStatus. Atomic via $transaction so the booking and the ledger
 * never disagree.
 *
 * Partial vs full is decided by amountPaise:
 *   - amountPaise === booking.totalAmount → 'refunded'
 *   - amountPaise <  booking.totalAmount → 'partial_refund'
 *   - amountPaise <= 0 or > totalAmount → rejected
 *
 * We DO NOT clawback the pro's payout in v1 — that lives on a separate
 * lever (pro wallet adjustment) so the support agent can decide whose
 * pocket eats the refund. Phase E.1 adds that on top.
 */
export async function refundBooking(input: {
  bookingId: string;
  amountPaise: number;
  reason: string;
  actorId: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      customerId: true,
      bookingNumber: true,
      totalAmount: true,
      paymentStatus: true,
      status: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.paymentStatus !== 'paid' && booking.paymentStatus !== 'partial_refund') {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Cannot refund a booking with paymentStatus=${booking.paymentStatus}`,
    );
  }
  if (input.amountPaise <= 0 || input.amountPaise > booking.totalAmount) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `amountPaise must be 1..${booking.totalAmount}`,
    );
  }

  const nextStatus = input.amountPaise === booking.totalAmount ? 'refunded' : 'partial_refund';

  return prisma.$transaction(async (tx) => {
    const customer = await tx.user.findUnique({
      where: { id: booking.customerId },
      select: { walletBalance: true },
    });
    if (!customer) throw new NotFoundError('Customer not found');

    const newBalance = customer.walletBalance + input.amountPaise;

    await tx.user.update({
      where: { id: booking.customerId },
      data: { walletBalance: newBalance },
    });

    const txn = await tx.walletTransaction.create({
      data: {
        userId: booking.customerId,
        type: 'refund',
        reason: 'refund',
        amount: input.amountPaise,
        balanceAfter: newBalance,
        referenceId: booking.id,
        metadata: {
          bookingNumber: booking.bookingNumber,
          adminReason: input.reason,
          actorId: input.actorId,
        },
      },
    });

    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { paymentStatus: nextStatus },
      select: { id: true, paymentStatus: true, totalAmount: true },
    });

    return { booking: updated, walletTxnId: txn.id, refundedPaise: input.amountPaise };
  });
}

// ─────────────────────────────────────────────────────────────
// Dispute resolution
// ─────────────────────────────────────────────────────────────

type DisputeResolution =
  | 'in_favor_of_customer' // cancel booking + refund full
  | 'in_favor_of_pro' // close as completed (no refund)
  | 'split'; // partial refund, status stays as agreed

/**
 * Resolve a dispute. Three outcomes; the first one auto-refunds the
 * full amount through the same refund path. The split outcome requires
 * the caller to follow up with a separate refundBooking call — we keep
 * this primitive clean so the audit trail records BOTH actions.
 */
export async function resolveDispute(input: {
  bookingId: string;
  resolution: DisputeResolution;
  notes: string;
  actorId: string;
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      customerId: true,
      bookingNumber: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  if (booking.status !== 'disputed') {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      `Booking is not in dispute (status=${booking.status})`,
    );
  }

  const note = `[admin-resolve:${input.resolution}] ${input.notes}`;

  if (input.resolution === 'in_favor_of_customer') {
    // Refund full + close as cancelled
    if (booking.paymentStatus === 'paid') {
      await refundBooking({
        bookingId: booking.id,
        amountPaise: booking.totalAmount,
        reason: 'dispute resolved in favor of customer',
        actorId: input.actorId,
      });
    }
    return prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'cancelled_customer', cancellationReason: note },
      select: { id: true, status: true, paymentStatus: true, cancellationReason: true },
    });
  }

  if (input.resolution === 'in_favor_of_pro') {
    // Close the dispute as completed — no refund, pro keeps payout
    return prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'completed', cancellationReason: note },
      select: { id: true, status: true, paymentStatus: true, cancellationReason: true },
    });
  }

  // split — admin will follow up with refundBooking for the partial amount
  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'completed', cancellationReason: note },
    select: { id: true, status: true, paymentStatus: true, cancellationReason: true },
  });
}

// ─────────────────────────────────────────────────────────────
// Reviews moderation
// ─────────────────────────────────────────────────────────────

export async function listReviewsForModeration(args: {
  filter: 'all' | 'visible' | 'hidden' | 'lowRating';
  limit: number;
}) {
  const where: Record<string, unknown> = {};
  if (args.filter === 'visible') where['isPublic'] = true;
  if (args.filter === 'hidden') where['isPublic'] = false;
  if (args.filter === 'lowRating') where['rating'] = { lte: 2 };

  return prisma.review.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: args.limit,
    select: {
      id: true,
      rating: true,
      reviewText: true,
      tags: true,
      isPublic: true,
      sentimentScore: true,
      proResponse: true,
      createdAt: true,
      customer: { select: { id: true, fullName: true, phone: true } },
      professional: {
        select: {
          id: true,
          professionalTitle: true,
          user: { select: { fullName: true, phone: true } },
        },
      },
      booking: { select: { id: true, bookingNumber: true } },
    },
  });
}

export async function setReviewVisibility(input: {
  reviewId: string;
  isPublic: boolean;
  actorId: string;
}) {
  const existing = await prisma.review.findUnique({ where: { id: input.reviewId } });
  if (!existing) throw new NotFoundError('Review not found');
  return prisma.review.update({
    where: { id: input.reviewId },
    data: { isPublic: input.isPublic },
    select: { id: true, isPublic: true, rating: true },
  });
}

// ─────────────────────────────────────────────────────────────
// Wallet / payouts view
// ─────────────────────────────────────────────────────────────

export async function listWalletTransactions(args: {
  userId?: string | undefined;
  reason?: string | undefined;
  limit: number;
  cursor?: string | undefined;
}) {
  const where: Record<string, unknown> = {};
  if (args.userId) where['userId'] = args.userId;
  if (args.reason) where['reason'] = args.reason;

  const rows = await prisma.walletTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      userId: true,
      type: true,
      reason: true,
      amount: true,
      balanceAfter: true,
      referenceId: true,
      createdAt: true,
      user: { select: { fullName: true, phone: true, role: true } },
    },
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

/**
 * Pros payouts overview — aggregate by professional. Returns totalEarned
 * (sum of pro_payout credits in 30d) + current wallet balance + recent
 * transactions count. Drives the /payouts page.
 */
export async function listPayoutsSnapshot(args: { limit: number }) {
  // Pro users with their wallet balance + recent payout credits
  const pros = await prisma.user.findMany({
    where: { role: 'professional', isActive: true },
    orderBy: { walletBalance: 'desc' },
    take: args.limit,
    select: {
      id: true,
      fullName: true,
      phone: true,
      walletBalance: true,
      professional: {
        select: {
          id: true,
          trustBadge: true,
          totalBookings: true,
        },
      },
    },
  });

  const since30 = new Date(Date.now() - 30 * 86400_000);

  const agg = await prisma.walletTransaction.groupBy({
    by: ['userId'],
    where: {
      userId: { in: pros.map((p) => p.id) },
      reason: 'pro_payout',
      createdAt: { gte: since30 },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });
  const aggMap = new Map(agg.map((a) => [a.userId, a]));

  return pros.map((p) => {
    const a = aggMap.get(p.id);
    return {
      userId: p.id,
      name: p.fullName ?? p.phone,
      phone: p.phone,
      walletBalance: p.walletBalance,
      proId: p.professional?.id ?? null,
      trustBadge: p.professional?.trustBadge ?? 'none',
      totalBookings: p.professional?.totalBookings ?? 0,
      earned30d: a?._sum.amount ?? 0,
      payouts30d: a?._count._all ?? 0,
    };
  });
}
