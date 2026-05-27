import { prisma } from '@sevalink/db';
import { logger } from '../../logger.js';
import { redis } from '../../redis.js';
import {
  broadcastBookingStatus,
  broadcastJobMatchCancelled,
  broadcastJobNewMatch,
} from '../../sockets/broadcaster.js';
import { notifyNewJobMatch } from '../notifications/service.js';
import { findNearbyPros } from '../pros/service.js';

/**
 * Phase 3e.1 — Pro live-alert + reassignment orchestrator.
 *
 * The pro app pops a Zomato-style ringing alarm when `job:new-match` is
 * received and keeps ringing until the pro explicitly accepts or declines.
 * There is no server-side auto-timeout — Vikas's call: pros have skin in
 * the game (trust score, cancellation count) so we'd rather make them act
 * than silently reassign and leave them confused about what happened.
 *
 * Reassignment is triggered ONLY by:
 *   - Pro tapping Decline (transitionBooking → cancelled_pro → handleProDeclined)
 *   - Admin override (out of scope for MVP)
 *
 * The `RESPONSE_WINDOW_SECONDS` value still gets sent to the client as
 * the *visual* heartbeat — the overlay loops the countdown ring at that
 * interval, but reaching zero just restarts the ring locally; it never
 * cancels the booking.
 *
 * Concerns:
 *   - **Rejected-set** lives in Redis SET so it survives restarts and is
 *     visible across instances. 1-day TTL is a hard ceiling — far more
 *     than any reasonable rematch loop.
 *   - **State changes** during rematch swap `booking.professionalId` and
 *     re-set status to `matched` (or `pending_match` when no candidates
 *     remain). We bypass `transitionBooking` because state-machine
 *     validation would reject matched→matched; this is an internal
 *     reassignment, not a state transition.
 */

const RESPONSE_WINDOW_SECONDS = 60;
const REJECTED_SET_TTL_SECONDS = 60 * 60 * 24;

function rejectedKey(bookingId: string): string {
  return `match:rejected:${bookingId}`;
}

/**
 * Push the alert to the Pro. Idempotent for the same (booking, pro) — re-
 * calling just re-broadcasts. The overlay handles dedupe by bookingId.
 */
export async function sendJobAlert(args: {
  bookingId: string;
  professionalId: string;
}): Promise<void> {
  const detail = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      bookingNumber: true,
      scheduledAt: true,
      durationMinutes: true,
      addressLine: true,
      addressArea: true,
      addressLat: true,
      addressLng: true,
      proPayout: true,
      category: { select: { slug: true, name: true } },
      customer: { select: { fullName: true, profilePhoto: true } },
    },
  });
  if (!detail) {
    logger.warn({ bookingId: args.bookingId }, 'sendJobAlertAndArm: booking not found');
    return;
  }

  const pro = await prisma.professional.findUnique({
    where: { id: args.professionalId },
    select: {
      userId: true,
      location: { select: { latitude: true, longitude: true } },
    },
  });
  if (!pro) {
    logger.warn({ proId: args.professionalId }, 'sendJobAlertAndArm: pro not found');
    return;
  }

  // Approx distance for the alert UI — skip on no location
  let distanceKm: number | null = null;
  if (pro.location) {
    distanceKm = haversineKm(
      Number(pro.location.latitude),
      Number(pro.location.longitude),
      Number(detail.addressLat),
      Number(detail.addressLng),
    );
  }

  const expiresAt = new Date(Date.now() + RESPONSE_WINDOW_SECONDS * 1000).toISOString();

  broadcastJobNewMatch(pro.userId, {
    bookingId: detail.id,
    bookingNumber: detail.bookingNumber,
    // Heartbeat-only — overlay loops the ring at this cadence but reaching
    // zero is a visual cue, not an action. Pro must explicitly decline.
    expiresAt,
    customer: {
      fullName: detail.customer.fullName,
      profilePhoto: detail.customer.profilePhoto,
    },
    category: detail.category,
    scheduledAt: detail.scheduledAt.toISOString(),
    durationMinutes: detail.durationMinutes,
    addressLine: detail.addressLine,
    addressArea: detail.addressArea,
    distanceKm,
    proPayout: detail.proPayout,
  });

  // Layer 2 — also fire a high-priority push so the alarm reaches the
  // pro when the app is backgrounded or killed. Best-effort: socket
  // delivery alone is enough when the app is foreground, so we never
  // let push failures gate the in-app overlay.
  void notifyNewJobMatch({
    proUserId: pro.userId,
    bookingId: detail.id,
    bookingNumber: detail.bookingNumber,
    customerName: detail.customer.fullName,
    categoryName: detail.category.name,
    addressArea: detail.addressArea,
    proPayoutPaise: detail.proPayout,
  }).catch((err: unknown) => {
    logger.error(
      { err, bookingId: args.bookingId, proUserId: pro.userId },
      'match: push notification failed',
    );
  });

  logger.info(
    { bookingId: args.bookingId, professionalId: args.professionalId, expiresAt },
    'match: alert sent (socket + push) — pro must respond',
  );
}

/**
 * Pro accepted (or booking moved to a terminal state) — clear the rejected
 * set so a future re-creation of the same booking number won't inherit
 * stale rejections. Also tell the pro app to drop any lingering overlay.
 */
export async function clearMatchState(bookingId: string): Promise<void> {
  await redis.del(rejectedKey(bookingId));
  await broadcastMatchCancelledToAssignedPro(bookingId);
}

/**
 * Tell the currently assigned pro that their incoming-job overlay should
 * dismiss — used when the customer cancels mid-ring, or when an admin
 * manually intervenes. Safe to call even when no pro is assigned.
 */
async function broadcastMatchCancelledToAssignedPro(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { professional: { select: { userId: true } } },
  });
  const proUserId = booking?.professional?.userId;
  if (!proUserId) return;
  broadcastJobMatchCancelled(proUserId, bookingId);
}

/**
 * Pro declined this match. Add them to the rejected set + attempt to
 * reassign to the next-best pro.
 */
export async function handleProDeclined(args: {
  bookingId: string;
  professionalId: string;
}): Promise<void> {
  await redis.sadd(rejectedKey(args.bookingId), args.professionalId);
  await redis.expire(rejectedKey(args.bookingId), REJECTED_SET_TTL_SECONDS);
  logger.info(
    { bookingId: args.bookingId, professionalId: args.professionalId },
    'match: pro declined, attempting rematch',
  );
  await tryRematch(args.bookingId);
}

/**
 * Look for a new pro excluding everyone who already declined / timed out.
 * Swaps the assigned pro on success; flips status to pending_match if no
 * one is left.
 */
export async function tryRematch(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      addressLat: true,
      addressLng: true,
      category: { select: { slug: true } },
    },
  });
  if (!booking) return;

  const rejected = new Set(await redis.smembers(rejectedKey(bookingId)));

  const candidates = await findNearbyPros({
    lat: Number(booking.addressLat),
    lng: Number(booking.addressLng),
    categorySlug: booking.category.slug,
    radiusKm: 8,
    limit: 10,
  });
  const next = candidates.find((c) => !rejected.has(c.professionalId));

  if (!next) {
    // No one left to try — sit in pending_match. Customer's UI surfaces
    // "Looking for an expert" until they cancel or an admin reassigns.
    await prisma.booking.update({
      where: { id: bookingId },
      data: { professionalId: null, status: 'pending_match' },
    });
    broadcastBookingStatus(bookingId, 'pending_match');
    logger.info({ bookingId }, 'match: no candidates left, booking dropped to pending_match');
    return;
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { professionalId: next.professionalId, status: 'matched' },
  });
  broadcastBookingStatus(bookingId, 'matched');
  await sendJobAlert({ bookingId, professionalId: next.professionalId });
}

/**
 * Local copy of the simple Haversine for the alert UI distance.
 * Cheap enough to inline here — etaProvider lives in a heavier module.
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
