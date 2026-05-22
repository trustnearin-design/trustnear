import { prisma, Prisma, type BookingStatus } from '@sevalink/db';
import {
  ConflictError,
  DomainError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
} from '@sevalink/types';
import { generateBookingNumber, generateOtp, sha256, timingSafeEqual } from '@sevalink/utils';
import { logger } from '../../logger.js';
import { broadcastBookingStatus } from '../../sockets/broadcaster.js';
import { findNearbyPros } from '../pros/service.js';
import {
  applyScoreEvent,
  classifyPunctuality,
  classifyResponseSpeed,
  isRepeatBooking,
} from '../trust-score/service.js';
import {
  notifyBookingArrived,
  notifyBookingCompleted,
  notifyBookingEnRoute,
  notifyBookingMatched,
} from '../notifications/service.js';
import { calculatePrice } from './pricing.js';
import { assertTransition, isTerminal } from './state-machine.js';

const BOOKING_OTP_TTL_MINUTES = 60; // OTP burns 60 min after arrival
const MAX_BOOKING_ADVANCE_DAYS = 7;

export interface CreateBookingInput {
  customerId: string;
  categoryId: string;
  scheduledAt: Date;
  durationMinutes: number;
  addressLine: string;
  addressLat: number;
  addressLng: number;
  addressArea?: string;
  addressCity: string;
  notes?: string;
  promoCode?: string;
  preferredProId?: string;
}

/**
 * Create a booking + try to match a pro synchronously.
 *
 * Flow:
 *   1. Validate scheduled_at (future, within 7 days)
 *   2. Calculate price from category + duration + app_config
 *   3. Generate booking_number + OTP (hashed in DB, plain shown to customer)
 *   4. Try to find a nearby online pro for the category. If found, status
 *      becomes 'matched' and pro is assigned. If none, 'pending_match'.
 *   5. Persist within a transaction so the booking + OTP land atomically.
 */
export async function createBooking(input: CreateBookingInput): Promise<{
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  otp: string; // plain — show to customer once, never returned again
}> {
  const now = new Date();
  const maxAdvance = new Date(now.getTime() + MAX_BOOKING_ADVANCE_DAYS * 24 * 60 * 60 * 1000);

  if (input.scheduledAt.getTime() < now.getTime() - 5 * 60 * 1000) {
    throw new DomainError(ErrorCode.SL_303_BOOKING_TIME_PAST, 'Scheduled time is in the past', 422);
  }
  if (input.scheduledAt.getTime() > maxAdvance.getTime()) {
    throw new DomainError(
      ErrorCode.SL_304_BOOKING_TOO_FAR,
      `Scheduled time exceeds max advance of ${String(MAX_BOOKING_ADVANCE_DAYS)} days`,
      422,
    );
  }

  // Confirm category exists + active (price calc will catch invalid)
  const price = await calculatePrice({
    categoryId: input.categoryId,
    durationMinutes: input.durationMinutes,
  });

  // Match attempt — look for online pros near the address for this category
  const category = await prisma.serviceCategory.findUnique({
    where: { id: input.categoryId },
    select: { slug: true },
  });
  if (!category) {
    throw new NotFoundError('Category not found');
  }

  let matchedProId: string | null = null;
  if (input.preferredProId) {
    // Direct-book a specific pro (skip matching) if they offer the category + online
    const pro = await prisma.professional.findFirst({
      where: {
        id: input.preferredProId,
        availabilityStatus: 'online',
        deletedAt: null,
        serviceOfferings: { some: { categoryId: input.categoryId, isActive: true } },
      },
      select: { id: true },
    });
    if (!pro) {
      throw new DomainError(
        ErrorCode.SL_201_PRO_UNAVAILABLE,
        'Selected pro unavailable or does not offer this service',
        409,
      );
    }
    matchedProId = pro.id;
  } else {
    const candidates = await findNearbyPros({
      lat: input.addressLat,
      lng: input.addressLng,
      categorySlug: category.slug,
      radiusKm: 8,
      limit: 1,
    });
    if (candidates.length > 0) {
      matchedProId = candidates[0]!.professionalId;
    }
  }

  const initialStatus: BookingStatus = matchedProId ? 'matched' : 'pending_match';
  const otpPlain = generateOtp();
  const otpHash = sha256(otpPlain);
  const otpExpiresAt = new Date(input.scheduledAt.getTime() + BOOKING_OTP_TTL_MINUTES * 60 * 1000);

  const booking = await prisma.booking.create({
    data: {
      bookingNumber: generateBookingNumber(),
      customerId: input.customerId,
      professionalId: matchedProId,
      categoryId: input.categoryId,
      status: initialStatus,
      scheduledAt: input.scheduledAt,
      durationMinutes: input.durationMinutes,
      addressLine: input.addressLine,
      addressLat: input.addressLat,
      addressLng: input.addressLng,
      addressArea: input.addressArea ?? null,
      addressCity: input.addressCity,
      otpCodeHash: otpHash,
      otpExpiresAt,
      basePrice: price.basePrice,
      platformFee: price.platformFee,
      promoDiscount: price.promoDiscount,
      commission: price.commission,
      totalAmount: price.totalAmount,
      proPayout: price.proPayout,
      notes: input.notes ?? null,
    },
    select: { id: true, bookingNumber: true, status: true },
  });

  logger.info(
    {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
      matchedProId,
      customerId: input.customerId,
      totalPaise: price.totalAmount,
    },
    'booking created',
  );

  // Broadcast initial status so connected clients see immediately
  broadcastBookingStatus(booking.id, booking.status);

  return {
    bookingId: booking.id,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    otp: otpPlain,
  };
}

/**
 * Generic state transition. Validates current → next per the state machine,
 * checks the caller has the right role for that transition, and persists.
 */
export async function transitionBooking(args: {
  bookingId: string;
  actorUserId: string;
  actorRole: 'customer' | 'professional' | 'admin';
  nextStatus: BookingStatus;
  patch?: Prisma.BookingUpdateInput;
}): Promise<{ id: string; status: BookingStatus }> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      status: true,
      customerId: true,
      professionalId: true,
      scheduledAt: true,
      startedAt: true,
      createdAt: true,
      professional: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (isTerminal(booking.status)) {
    throw new ConflictError(`Booking is already ${booking.status}`);
  }

  // Authorization: customer can act on their own booking; pro can act on assigned;
  // admin can override (audit log captures the override).
  const isCustomer = args.actorRole === 'customer' && booking.customerId === args.actorUserId;
  const isPro =
    args.actorRole === 'professional' && booking.professional?.userId === args.actorUserId;
  const isAdmin = args.actorRole === 'admin';
  if (!isCustomer && !isPro && !isAdmin) {
    throw new ForbiddenError('Not authorized to modify this booking');
  }

  // Per-status authorization rules — which role may trigger which transition
  const role = isAdmin ? 'admin' : isCustomer ? 'customer' : 'professional';
  enforceRoleForTransition(booking.status, args.nextStatus, role);

  assertTransition(booking.status, args.nextStatus);

  const updated = await prisma.booking.update({
    where: { id: args.bookingId },
    data: {
      status: args.nextStatus,
      ...args.patch,
    },
    select: { id: true, status: true },
  });

  logger.info(
    {
      bookingId: updated.id,
      from: booking.status,
      to: updated.status,
      actorUserId: args.actorUserId,
      actorRole: role,
    },
    'booking status changed',
  );

  // Fire trust score side-effects — never fail the user action if these throw.
  await applyTransitionTrustEffects(booking, updated.status).catch((err: unknown) => {
    logger.error({ err, bookingId: updated.id }, 'trust: post-transition effects failed');
  });

  // Fire push notifications — also best-effort, never blocks the action.
  void applyTransitionNotifications(booking, updated.status).catch((err: unknown) => {
    logger.error({ err, bookingId: updated.id }, 'notify: post-transition dispatch failed');
  });

  broadcastBookingStatus(updated.id, updated.status);

  return updated;
}

/**
 * Push-notify the customer on every state change they care about.
 *
 *   matched → confirmed       "X accepted your booking"
 *   confirmed → pro_en_route  "Your expert is on the way"
 *   * → otp_verified          "Your expert has arrived" (sent on otp_verified
 *                              rather than at the geofence event because
 *                              that's when the customer's UX needs the hint
 *                              to share the OTP — and matches the state
 *                              that actually proves arrival)
 *   * → completed             "Service complete · Pay ₹X"
 *
 * Lookups are minimized to one row read for the pro name + booking number.
 */
async function applyTransitionNotifications(
  prevBooking: {
    id: string;
    customerId: string;
    professionalId: string | null;
  },
  newStatus: BookingStatus,
): Promise<void> {
  if (
    newStatus !== 'confirmed' &&
    newStatus !== 'pro_en_route' &&
    newStatus !== 'otp_verified' &&
    newStatus !== 'completed'
  ) {
    return;
  }

  const detail = await prisma.booking.findUnique({
    where: { id: prevBooking.id },
    select: {
      bookingNumber: true,
      totalAmount: true,
      professional: { select: { user: { select: { fullName: true } } } },
    },
  });
  if (!detail) return;
  const proName = detail.professional?.user.fullName ?? 'Your expert';

  if (newStatus === 'confirmed') {
    await notifyBookingMatched({
      customerId: prevBooking.customerId,
      bookingId: prevBooking.id,
      bookingNumber: detail.bookingNumber,
      professionalName: proName,
    });
    return;
  }
  if (newStatus === 'pro_en_route') {
    await notifyBookingEnRoute({
      customerId: prevBooking.customerId,
      bookingId: prevBooking.id,
      professionalName: proName,
    });
    return;
  }
  if (newStatus === 'otp_verified') {
    await notifyBookingArrived({
      customerId: prevBooking.customerId,
      bookingId: prevBooking.id,
      professionalName: proName,
    });
    return;
  }
  if (newStatus === 'completed') {
    await notifyBookingCompleted({
      customerId: prevBooking.customerId,
      bookingId: prevBooking.id,
      bookingNumber: detail.bookingNumber,
      amountPaise: detail.totalAmount,
    });
  }
}

/**
 * Fire trust-score events + maintain pro counters on key transitions.
 *
 *   matched → confirmed       fast_response or slow_response (response time)
 *   * → completed             punctuality event + totalBookings++ + repeat check
 *   * → cancelled_pro         cancellation_pro event + cancellationCount++
 *
 * Idempotency: each event has a single trigger path, so no dedup needed.
 * Failures are logged but never surfaced — the user action still succeeds.
 */
async function applyTransitionTrustEffects(
  prevBooking: {
    id: string;
    professionalId: string | null;
    customerId: string;
    scheduledAt: Date;
    startedAt: Date | null;
    createdAt: Date;
  },
  newStatus: BookingStatus,
): Promise<void> {
  if (!prevBooking.professionalId) return;
  const proId = prevBooking.professionalId;

  if (newStatus === 'confirmed') {
    // Response time = createdAt (proxy for matched_at) → now
    const event = classifyResponseSpeed(prevBooking.createdAt, new Date());
    if (event) {
      await applyScoreEvent({
        professionalId: proId,
        eventType: event,
        bookingId: prevBooking.id,
        metadata: {
          responseSeconds: (Date.now() - prevBooking.createdAt.getTime()) / 1000,
        },
      });
    }
    // Maintain running average of accept time
    await updateAvgResponseTime(proId, prevBooking.createdAt);
    return;
  }

  if (newStatus === 'completed') {
    // Increment totalBookings + maybe repeat
    await prisma.professional.update({
      where: { id: proId },
      data: { totalBookings: { increment: 1 } },
    });

    const isRepeat = await isRepeatBooking({
      customerId: prevBooking.customerId,
      professionalId: proId,
      excludeBookingId: prevBooking.id,
    });
    if (isRepeat) {
      await prisma.professional.update({
        where: { id: proId },
        data: { repeatClientCount: { increment: 1 } },
      });
      await prisma.booking.update({
        where: { id: prevBooking.id },
        data: { isRepeatBooking: true },
      });
      await applyScoreEvent({
        professionalId: proId,
        eventType: 'repeat_booking',
        bookingId: prevBooking.id,
      });
    }

    // Punctuality — needs startedAt (OTP-verified moment)
    if (prevBooking.startedAt) {
      const event = classifyPunctuality(prevBooking.scheduledAt, prevBooking.startedAt);
      if (event) {
        await applyScoreEvent({
          professionalId: proId,
          eventType: event,
          bookingId: prevBooking.id,
          metadata: {
            scheduledAt: prevBooking.scheduledAt.toISOString(),
            startedAt: prevBooking.startedAt.toISOString(),
            lateMinutes:
              (prevBooking.startedAt.getTime() - prevBooking.scheduledAt.getTime()) / 60_000,
          },
        });
      }
    }
    return;
  }

  if (newStatus === 'cancelled_pro') {
    await prisma.professional.update({
      where: { id: proId },
      data: { cancellationCount: { increment: 1 } },
    });
    await applyScoreEvent({
      professionalId: proId,
      eventType: 'cancellation_pro',
      bookingId: prevBooking.id,
    });
  }
}

async function updateAvgResponseTime(proId: string, matchedAt: Date): Promise<void> {
  const responseSeconds = Math.round((Date.now() - matchedAt.getTime()) / 1000);
  const pro = await prisma.professional.findUnique({
    where: { id: proId },
    select: { avgResponseTimeSeconds: true, totalBookings: true },
  });
  if (!pro) return;

  // Running average — totalBookings is incremented on completion, so here we use it
  // as a sample count (close enough for MVP; perfectly-accurate stats would need
  // a dedicated accept counter).
  const sampleCount = Math.max(1, pro.totalBookings);
  const newAvg = Math.round(
    (pro.avgResponseTimeSeconds * (sampleCount - 1) + responseSeconds) / sampleCount,
  );
  await prisma.professional.update({
    where: { id: proId },
    data: { avgResponseTimeSeconds: newAvg },
  });
}

function enforceRoleForTransition(
  from: BookingStatus,
  to: BookingStatus,
  role: 'customer' | 'professional' | 'admin',
): void {
  if (role === 'admin') return;

  // Customer-only transitions
  if (to === 'cancelled_customer' && role !== 'customer') {
    throw new ForbiddenError('Only the customer can cancel their booking');
  }

  // Pro-only transitions
  const proOnly: BookingStatus[] = [
    'confirmed',
    'pro_en_route',
    'otp_verified',
    'in_progress',
    'completed',
    'cancelled_pro',
  ];
  if (proOnly.includes(to) && role !== 'professional') {
    throw new ForbiddenError(`Only the professional can transition to ${to}`);
  }

  void from;
}

/**
 * Pro enters the OTP shared by the customer (proves they're at the location).
 * Validates the OTP timing-safely, transitions matched/confirmed/pro_en_route → otp_verified
 * → in_progress (instant follow-up).
 */
export async function verifyBookingOtp(args: {
  bookingId: string;
  actorUserId: string;
  submittedOtp: string;
}): Promise<{ id: string; status: BookingStatus }> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      status: true,
      otpCodeHash: true,
      otpExpiresAt: true,
      professional: { select: { userId: true } },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.professional?.userId !== args.actorUserId) {
    throw new ForbiddenError('Only the assigned professional can verify the OTP');
  }
  if (!['matched', 'confirmed', 'pro_en_route'].includes(booking.status)) {
    throw new ConflictError(`Cannot verify OTP in status ${booking.status}`);
  }
  if (!booking.otpCodeHash || !booking.otpExpiresAt) {
    throw new DomainError(ErrorCode.SL_102_OTP_EXPIRED, 'No OTP available for this booking', 410);
  }
  if (booking.otpExpiresAt.getTime() < Date.now()) {
    throw new DomainError(ErrorCode.SL_102_OTP_EXPIRED, 'OTP expired', 410);
  }
  if (!timingSafeEqual(booking.otpCodeHash, sha256(args.submittedOtp))) {
    throw new DomainError(ErrorCode.SL_101_INVALID_OTP, 'Incorrect OTP', 401);
  }

  // OTP verified → instant in_progress
  const updated = await prisma.booking.update({
    where: { id: args.bookingId },
    data: {
      status: 'in_progress',
      startedAt: new Date(),
      otpCodeHash: null, // burn after use
    },
    select: { id: true, status: true },
  });

  logger.info({ bookingId: updated.id }, 'booking otp verified — in_progress');
  broadcastBookingStatus(updated.id, updated.status);
  return updated;
}

export interface ListBookingsArgs {
  userId: string;
  role: 'customer' | 'professional' | 'admin';
  status?: BookingStatus;
  limit: number;
  cursor?: string;
}

export async function listBookings(args: ListBookingsArgs) {
  // Customer sees their own; pro sees assigned; admin sees all
  const where: Prisma.BookingWhereInput = {
    deletedAt: null,
    ...(args.status ? { status: args.status } : {}),
  };
  if (args.role === 'customer') {
    where.customerId = args.userId;
  } else if (args.role === 'professional') {
    where.professional = { userId: args.userId };
  }

  const rows = await prisma.booking.findMany({
    where,
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      durationMinutes: true,
      addressLine: true,
      addressArea: true,
      totalAmount: true,
      paymentStatus: true,
      createdAt: true,
      category: { select: { slug: true, name: true, iconUrl: true } },
      professional: {
        select: {
          id: true,
          professionalTitle: true,
          trustScore: true,
          user: { select: { fullName: true, profilePhoto: true, phone: true } },
        },
      },
      customer: { select: { id: true, fullName: true, phone: true } },
    },
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  return { items, nextCursor };
}

export async function getBookingDetail(args: {
  bookingId: string;
  userId: string;
  role: 'customer' | 'professional' | 'admin';
}) {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    include: {
      category: true,
      customer: { select: { id: true, fullName: true, phone: true, profilePhoto: true } },
      professional: {
        select: {
          id: true,
          professionalTitle: true,
          trustScore: true,
          trustBadge: true,
          user: { select: { id: true, fullName: true, profilePhoto: true, phone: true } },
        },
      },
    },
  });

  if (!booking || booking.deletedAt) {
    throw new NotFoundError('Booking not found');
  }

  // Authorization
  if (args.role === 'customer' && booking.customerId !== args.userId) {
    throw new ForbiddenError('Not your booking');
  }
  if (args.role === 'professional' && booking.professional?.user.id !== args.userId) {
    throw new ForbiddenError('Not your booking');
  }

  // Strip OTP hash from response — never expose
  const { otpCodeHash: _otp, ...safe } = booking;
  return safe;
}
