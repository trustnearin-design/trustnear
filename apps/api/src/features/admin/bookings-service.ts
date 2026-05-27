import { prisma, type BookingStatus, type PaymentStatus } from '@sevalink/db';
import { DomainError, ErrorCode, NotFoundError } from '@sevalink/types';

const BOOKING_LIST_SELECT = {
  id: true,
  bookingNumber: true,
  status: true,
  paymentStatus: true,
  totalAmount: true,
  proPayout: true,
  scheduledAt: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
  customer: { select: { id: true, fullName: true, phone: true } },
  professional: {
    select: {
      id: true,
      user: { select: { fullName: true, phone: true } },
    },
  },
} as const;

export async function listBookings(args: {
  status?: BookingStatus | undefined;
  paymentStatus?: PaymentStatus | undefined;
  search?: string | undefined;
  sortBy?: 'createdAt' | 'scheduledAt' | 'totalAmount';
  sortDir?: 'asc' | 'desc';
  limit: number;
  cursor?: string | undefined;
}) {
  const where: Record<string, unknown> = { deletedAt: null };
  if (args.status) where['status'] = args.status;
  if (args.paymentStatus) where['paymentStatus'] = args.paymentStatus;
  if (args.search) {
    const q = args.search.trim();
    where['OR'] = [
      { bookingNumber: { contains: q, mode: 'insensitive' } },
      { customer: { phone: { contains: q } } },
      { customer: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const sortBy = args.sortBy ?? 'createdAt';
  const sortDir = args.sortDir ?? 'desc';

  const rows = await prisma.booking.findMany({
    where,
    orderBy: { [sortBy]: sortDir },
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: BOOKING_LIST_SELECT,
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  return {
    items,
    nextCursor: hasMore ? items[items.length - 1]!.id : null,
  };
}

/**
 * Bulk admin cancel. Each row passes through `adminCancel` so state-machine
 * guards (terminal-state refusal) apply. Aggregates results.
 */
export async function bulkAdminCancel(input: {
  ids: string[];
  reason: string;
  actorId: string;
}): Promise<{ ok: string[]; failed: Array<{ id: string; reason: string }> }> {
  const ok: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];
  for (const id of input.ids) {
    try {
      await adminCancel({ bookingId: id, reason: input.reason, actorId: input.actorId });
      ok.push(id);
    } catch (e) {
      failed.push({ id, reason: e instanceof Error ? e.message : 'unknown' });
    }
  }
  return { ok, failed };
}

export async function getBookingDetail(id: string) {
  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      ...BOOKING_LIST_SELECT,
      addressLine: true,
      addressArea: true,
      addressCity: true,
      addressLat: true,
      addressLng: true,
      basePrice: true,
      platformFee: true,
      promoDiscount: true,
      commission: true,
      paymentMethod: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      notes: true,
      cancellationReason: true,
      isRepeatBooking: true,
      durationMinutes: true,
      startedAt: true,
      completedAt: true,
      updatedAt: true,
    },
  });
  if (!booking) throw new NotFoundError('Booking not found');
  return booking;
}

/**
 * Admin force-cancel — bypasses the state machine that normally restricts
 * cancellations after pro_en_route. Reason is required for audit.
 */
export async function adminCancel(input: { bookingId: string; reason: string; actorId: string }) {
  const existing = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError('Booking not found');
  if (
    existing.status === 'completed' ||
    existing.status === 'cancelled_customer' ||
    existing.status === 'cancelled_pro'
  ) {
    throw new DomainError(
      ErrorCode.SL_302_INVALID_STATUS_TRANSITION,
      `Cannot cancel a ${existing.status} booking.`,
    );
  }
  const updated = await prisma.booking.update({
    where: { id: input.bookingId },
    data: {
      status: 'cancelled_customer',
      cancellationReason: `[admin] ${input.reason}`,
    },
    select: { id: true, status: true, cancellationReason: true },
  });
  return updated;
}

export async function markDisputed(input: { bookingId: string; reason: string; actorId: string }) {
  const existing = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: { id: true },
  });
  if (!existing) throw new NotFoundError('Booking not found');
  return prisma.booking.update({
    where: { id: input.bookingId },
    data: { status: 'disputed', cancellationReason: `[admin-disputed] ${input.reason}` },
    select: { id: true, status: true },
  });
}
