import { customAlphabet } from 'nanoid';

/**
 * Booking number — human-readable: TN-{YYYY}-{NNNNNN}
 * Uses cryptographically-strong random 6-digit suffix to avoid sequence collisions
 * across distributed instances. For monotonic ids use a DB sequence.
 *
 * Prefix history: SL- (during SEVALINK working-name era); existing SL-* bookings
 * remain untouched in the DB — only newly generated numbers carry TN-.
 */
const bookingDigits = customAlphabet('0123456789', 6);

export function generateBookingNumber(now: Date = new Date()): string {
  return `TN-${String(now.getUTCFullYear())}-${bookingDigits()}`;
}

const ticketDigits = customAlphabet('0123456789', 6);
export function generateTicketNumber(now: Date = new Date()): string {
  return `TKT-${String(now.getUTCFullYear())}-${ticketDigits()}`;
}

/**
 * Referral code — 8-char URL-safe (alphanumeric, no ambiguous chars 0/O/1/l/I).
 */
const referralAlpha = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);
export function generateReferralCode(): string {
  return referralAlpha();
}

/**
 * Idempotency key for clients that don't supply one (best-effort).
 * Real clients SHOULD send their own UUID v4.
 */
const idempotencyAlpha = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 32);
export function generateIdempotencyKey(): string {
  return idempotencyAlpha();
}

/**
 * Request ID — short, log-friendly. Not for security.
 */
const requestIdAlpha = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);
export function generateRequestId(): string {
  return requestIdAlpha();
}
