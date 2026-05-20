import { prisma, Prisma } from '@sevalink/db';
import type { TrustBadge, TrustEventType, BookingStatus } from '@sevalink/db';
import { logger } from '../../logger.js';

/**
 * Trust Score is an incremental composite (0–100) maintained by event deltas.
 * Each meaningful pro action fires applyScoreEvent which:
 *   1. Reads current score
 *   2. Adds the delta (clamped to [0, 100])
 *   3. Persists score + recomputed badge tier
 *   4. Logs the event in trust_score_events (full audit trail)
 *
 * The deltas live here (single source of truth) — easy to tune later from
 * app_config without breaking the schema.
 */

interface EventConfig {
  delta: number;
  description: string;
}

const EVENT_DELTAS: Record<TrustEventType, EventConfig> = {
  on_time_arrival: { delta: 2.5, description: 'Arrived on time (within 5 min)' },
  late_arrival: { delta: -2.0, description: 'Arrived more than 15 min late' },
  positive_review: { delta: 2.5, description: '4–5 star review' },
  negative_review: { delta: -2.0, description: '1–2 star review' },
  repeat_booking: { delta: 1.0, description: 'Customer rebooked' },
  cancellation_pro: { delta: -5.0, description: 'Pro cancelled booking' },
  cancellation_customer: { delta: 0, description: 'Customer cancelled — no penalty' },
  fast_response: { delta: 0.5, description: 'Accepted within 30 seconds' },
  slow_response: { delta: -0.5, description: 'Accepted after 2 minutes' },
  profile_complete: { delta: 0.5, description: 'Profile field completed' },
  aadhaar_verified: { delta: 1.0, description: 'Aadhaar verification cleared' },
  police_verified: { delta: 1.0, description: 'Police verification cleared' },
};

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10) / 10;
}

export function badgeForScore(score: number): TrustBadge {
  if (score >= 90) return 'platinum';
  if (score >= 75) return 'gold';
  if (score >= 60) return 'silver';
  if (score >= 40) return 'bronze';
  return 'none';
}

export interface ApplyScoreEventInput {
  professionalId: string;
  eventType: TrustEventType;
  bookingId?: string;
  /** Override default delta — e.g. review rating modulates the magnitude. */
  customDelta?: number;
  metadata?: Record<string, unknown>;
  /** Use an external transaction client when called inside one. */
  tx?: Prisma.TransactionClient;
}

/**
 * Apply a single score event atomically with the optional outer transaction.
 * Never throws on logical bounds (clamp handles); only on DB errors.
 */
export async function applyScoreEvent(input: ApplyScoreEventInput): Promise<void> {
  const config = EVENT_DELTAS[input.eventType];
  const delta = input.customDelta ?? config.delta;
  const client = input.tx ?? prisma;

  const pro = await client.professional.findUnique({
    where: { id: input.professionalId },
    select: { trustScore: true },
  });
  if (!pro) {
    logger.warn(
      { proId: input.professionalId, eventType: input.eventType },
      'trust: skipped event — pro not found',
    );
    return;
  }

  const scoreBefore = Number(pro.trustScore);
  const scoreAfter = clamp(scoreBefore + delta);
  const newBadge = badgeForScore(scoreAfter);

  await client.professional.update({
    where: { id: input.professionalId },
    data: { trustScore: scoreAfter, trustBadge: newBadge },
  });

  await client.trustScoreEvent.create({
    data: {
      professionalId: input.professionalId,
      bookingId: input.bookingId ?? null,
      eventType: input.eventType,
      scoreDelta: delta,
      scoreBefore,
      scoreAfter,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });

  logger.info(
    {
      proId: input.professionalId,
      eventType: input.eventType,
      delta,
      scoreBefore,
      scoreAfter,
      badge: newBadge,
    },
    'trust: event applied',
  );
}

/**
 * Punctuality helper — bookings.startedAt vs bookings.scheduledAt.
 *   ≤ 5 min late  → on_time_arrival
 *   5–15 min late → no event (neutral)
 *   > 15 min late → late_arrival
 */
export function classifyPunctuality(scheduledAt: Date, startedAt: Date): TrustEventType | null {
  const lateMinutes = (startedAt.getTime() - scheduledAt.getTime()) / 60_000;
  if (lateMinutes <= 5) return 'on_time_arrival';
  if (lateMinutes > 15) return 'late_arrival';
  return null;
}

/**
 * Response speed helper — booking matched → confirmed transition.
 *   ≤ 30s  → fast_response
 *   > 120s → slow_response
 */
export function classifyResponseSpeed(matchedAt: Date, confirmedAt: Date): TrustEventType | null {
  const seconds = (confirmedAt.getTime() - matchedAt.getTime()) / 1000;
  if (seconds <= 30) return 'fast_response';
  if (seconds > 120) return 'slow_response';
  return null;
}

/**
 * Review rating → event type + custom delta.
 * 5★ = +3.0, 4★ = +1.5, 3★ = 0 (no event), 2★ = -1.5, 1★ = -3.0
 */
export function classifyReview(
  rating: number,
): { eventType: TrustEventType; delta: number } | null {
  if (rating === 5) return { eventType: 'positive_review', delta: 3.0 };
  if (rating === 4) return { eventType: 'positive_review', delta: 1.5 };
  if (rating === 2) return { eventType: 'negative_review', delta: -1.5 };
  if (rating === 1) return { eventType: 'negative_review', delta: -3.0 };
  return null; // 3★ is neutral
}

/**
 * Detect if a customer-pro pair already had a completed booking before this one
 * (used to fire repeat_booking on the SECOND+ completion).
 */
export async function isRepeatBooking(args: {
  customerId: string;
  professionalId: string;
  excludeBookingId: string;
  tx?: Prisma.TransactionClient;
}): Promise<boolean> {
  const client = args.tx ?? prisma;
  const prior = await client.booking.findFirst({
    where: {
      customerId: args.customerId,
      professionalId: args.professionalId,
      status: 'completed',
      id: { not: args.excludeBookingId },
    },
    select: { id: true },
  });
  return prior !== null;
}

/**
 * Aggregate snapshot for the pro's own trust-score screen.
 */
export interface TrustScoreSnapshot {
  score: number;
  badge: TrustBadge;
  totalBookings: number;
  repeatClientCount: number;
  cancellationCount: number;
  avgResponseTimeSeconds: number;
  recentEvents: {
    id: string;
    eventType: TrustEventType;
    delta: number;
    scoreBefore: number;
    scoreAfter: number;
    bookingId: string | null;
    createdAt: Date;
  }[];
}

export async function getTrustSnapshot(professionalId: string): Promise<TrustScoreSnapshot> {
  const pro = await prisma.professional.findUnique({
    where: { id: professionalId },
    select: {
      trustScore: true,
      trustBadge: true,
      totalBookings: true,
      repeatClientCount: true,
      cancellationCount: true,
      avgResponseTimeSeconds: true,
    },
  });
  if (!pro) {
    throw new Error('Pro not found');
  }

  const events = await prisma.trustScoreEvent.findMany({
    where: { professionalId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      eventType: true,
      scoreDelta: true,
      scoreBefore: true,
      scoreAfter: true,
      bookingId: true,
      createdAt: true,
    },
  });

  return {
    score: Number(pro.trustScore),
    badge: pro.trustBadge,
    totalBookings: pro.totalBookings,
    repeatClientCount: pro.repeatClientCount,
    cancellationCount: pro.cancellationCount,
    avgResponseTimeSeconds: pro.avgResponseTimeSeconds,
    recentEvents: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      delta: Number(e.scoreDelta),
      scoreBefore: Number(e.scoreBefore),
      scoreAfter: Number(e.scoreAfter),
      bookingId: e.bookingId,
      createdAt: e.createdAt,
    })),
  };
}

export function _internalForTests(): Record<TrustEventType, EventConfig> {
  return EVENT_DELTAS;
}

// Keep BookingStatus import in scope for downstream callers — re-exported here
// so the bookings hook layer doesn't need its own @sevalink/db import for it.
export type { BookingStatus };
