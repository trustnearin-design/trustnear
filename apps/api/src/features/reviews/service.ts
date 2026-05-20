import { prisma } from '@sevalink/db';
import {
  ConflictError,
  DomainError,
  ErrorCode,
  ForbiddenError,
  NotFoundError,
} from '@sevalink/types';
import { logger } from '../../logger.js';
import { applyScoreEvent, classifyReview } from '../trust-score/service.js';

export interface SubmitReviewInput {
  bookingId: string;
  customerId: string;
  rating: number;
  reviewText?: string;
  tags?: string[];
  isPublic: boolean;
}

/**
 * Customer submits a review for a completed booking.
 *
 * Guards:
 *   - Booking must exist + belong to this customer + status = completed
 *   - Booking must have a professional (cancelled bookings never matched)
 *   - One review per booking (unique constraint at DB level too)
 *
 * Side effect: fires a trust score event sized by rating
 * (5★ +3.0, 4★ +1.5, 3★ neutral, 2★ -1.5, 1★ -3.0).
 */
export async function submitReview(input: SubmitReviewInput): Promise<{
  id: string;
  rating: number;
  scoreDelta: number;
}> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    select: {
      id: true,
      customerId: true,
      professionalId: true,
      status: true,
      review: { select: { id: true } },
    },
  });

  if (!booking) {
    throw new NotFoundError('Booking not found');
  }
  if (booking.customerId !== input.customerId) {
    throw new ForbiddenError('You can only review your own bookings');
  }
  if (booking.status !== 'completed') {
    throw new DomainError(
      ErrorCode.SL_302_INVALID_STATUS_TRANSITION,
      `Booking must be completed before review (current: ${booking.status})`,
      409,
    );
  }
  if (!booking.professionalId) {
    throw new DomainError(
      ErrorCode.SL_301_BOOKING_NOT_FOUND,
      'Booking has no assigned professional',
      400,
    );
  }
  if (booking.review) {
    throw new ConflictError('Review already submitted for this booking');
  }

  const created = await prisma.review.create({
    data: {
      bookingId: input.bookingId,
      customerId: input.customerId,
      professionalId: booking.professionalId,
      rating: input.rating,
      reviewText: input.reviewText ?? null,
      tags: input.tags ?? [],
      isPublic: input.isPublic,
    },
    select: { id: true, rating: true },
  });

  // Trust score event
  const classification = classifyReview(input.rating);
  let scoreDelta = 0;
  if (classification) {
    scoreDelta = classification.delta;
    await applyScoreEvent({
      professionalId: booking.professionalId,
      eventType: classification.eventType,
      bookingId: input.bookingId,
      customDelta: classification.delta,
      metadata: { rating: input.rating, reviewId: created.id },
    }).catch((err: unknown) => {
      logger.error({ err, reviewId: created.id }, 'trust: review event apply failed');
    });
  }

  logger.info({ reviewId: created.id, rating: input.rating, scoreDelta }, 'review: submitted');

  return { id: created.id, rating: created.rating, scoreDelta };
}

export interface ListReviewsArgs {
  professionalId: string;
  cursor?: string;
  limit: number;
  minRating?: number;
}

export async function listReviewsForPro(args: ListReviewsArgs) {
  const rows = await prisma.review.findMany({
    where: {
      professionalId: args.professionalId,
      isPublic: true,
      ...(args.minRating ? { rating: { gte: args.minRating } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: args.limit + 1,
    ...(args.cursor ? { cursor: { id: args.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      rating: true,
      reviewText: true,
      tags: true,
      proResponse: true,
      helpfulCount: true,
      createdAt: true,
      customer: { select: { fullName: true, profilePhoto: true } },
    },
  });

  const hasMore = rows.length > args.limit;
  const items = hasMore ? rows.slice(0, args.limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  // Aggregate stats for the pro
  const stats = await prisma.review.aggregate({
    where: { professionalId: args.professionalId, isPublic: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  return {
    items,
    nextCursor,
    stats: {
      avgRating: stats._avg.rating ? Number(stats._avg.rating.toFixed(2)) : null,
      totalReviews: stats._count._all,
    },
  };
}
