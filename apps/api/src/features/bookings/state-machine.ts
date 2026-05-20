import type { BookingStatus } from '@sevalink/db';
import { DomainError, ErrorCode } from '@sevalink/types';

/**
 * Booking status transitions. Anything not in this map is forbidden.
 * Keys = current state, values = allowed next states.
 *
 *   pending_match → matched | cancelled_customer
 *   matched       → confirmed | cancelled_customer | cancelled_pro
 *   confirmed     → pro_en_route | cancelled_customer | cancelled_pro
 *   pro_en_route  → otp_verified | cancelled_customer | cancelled_pro
 *   otp_verified  → in_progress
 *   in_progress   → completed | disputed
 *
 *   Terminal: completed, cancelled_*, disputed
 */
const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_match: ['matched', 'cancelled_customer'],
  matched: ['confirmed', 'cancelled_customer', 'cancelled_pro'],
  confirmed: ['pro_en_route', 'cancelled_customer', 'cancelled_pro'],
  pro_en_route: ['otp_verified', 'cancelled_customer', 'cancelled_pro'],
  otp_verified: ['in_progress'],
  in_progress: ['completed', 'disputed'],
  completed: [],
  cancelled_customer: [],
  cancelled_pro: [],
  disputed: [],
};

export function assertTransition(from: BookingStatus, to: BookingStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new DomainError(
      ErrorCode.SL_302_INVALID_STATUS_TRANSITION,
      `Cannot transition booking from ${from} to ${to}`,
      400,
      { from, to, allowed: ALLOWED_TRANSITIONS[from] },
    );
  }
}

export function isTerminal(status: BookingStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
