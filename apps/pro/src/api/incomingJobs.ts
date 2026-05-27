import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiCallError } from './client';
import { getSocket } from '../lib/socket';
import { startJobAlertRing, stopJobAlertRing } from '../lib/jobAlertSound';

/**
 * Live job-alert pipeline.
 *
 *   1. Subscribe to `job:new-match` over the always-on Socket.IO connection.
 *   2. Push each incoming alert onto a queue; the first item drives the
 *      visible IncomingJobOverlay.
 *   3. On Accept → POST /bookings/:id/accept, dismiss, navigate to
 *      /(app)/job/[id]. On failure (e.g. already cancelled by backend
 *      timeout while the pro was tapping) we still dismiss and let the
 *      pro see the next alert if queued.
 *   4. On Decline → POST /bookings/:id/cancel with reason. Backend's
 *      match-orchestrator handles the rematch.
 *   5. On natural expiry → just drop the alert locally; backend has
 *      already moved on.
 *
 * The audio/vibration ring starts when the first alert appears and stops
 * the moment the queue drains.
 */

export interface IncomingJobAlert {
  bookingId: string;
  bookingNumber: string;
  /** ISO 8601 — countdown derives from this. */
  expiresAt: string;
  customer: { fullName: string; profilePhoto: string | null };
  category: { slug: string; name: string };
  scheduledAt: string;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  distanceKm: number | null;
  proPayout: number;
}

export interface IncomingJobController {
  current: IncomingJobAlert | null;
  /** Whole seconds left for the *current* alert (0 once expired). */
  secondsLeft: number;
  accept: () => void;
  decline: () => void;
  acceptPending: boolean;
  declinePending: boolean;
  acceptError: string | null;
}

/**
 * Mount this once at the root layout. Returns the current alert + actions
 * the global overlay uses to drive its UI.
 */
export function useIncomingJobAlerts(): IncomingJobController {
  const qc = useQueryClient();
  const [queue, setQueue] = useState<IncomingJobAlert[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const ringingForRef = useRef<string | null>(null);

  const current = queue[0] ?? null;

  // Pop the head of the queue. Used by accept/decline/expiry — never
  // mutates the rest, so a freshly pushed second alert survives.
  const dismissCurrent = useCallback(() => {
    setQueue((q) => q.slice(1));
    setAcceptError(null);
  }, []);

  // ── Socket subscription — always on whenever the user is authed ──────
  useEffect(() => {
    const socket = getSocket();
    const onNewMatch = (payload: IncomingJobAlert) => {
      setQueue((q) => {
        // Dedupe by bookingId; an at-most-once invariant prevents the
        // ring from re-triggering if the backend re-emits the same
        // match (e.g. after a brief reconnect).
        if (q.some((a) => a.bookingId === payload.bookingId)) return q;
        return [...q, payload];
      });
    };
    const onCancelled = (payload: { bookingId: string }) => {
      // Backend invalidated this match (customer cancelled, admin intervened,
      // etc) — drop the overlay so the pro stops hearing the ring on a
      // booking that no longer exists for them.
      setQueue((q) => q.filter((a) => a.bookingId !== payload.bookingId));
    };
    socket.on('job:new-match', onNewMatch);
    socket.on('job:match-cancelled', onCancelled);
    return () => {
      socket.off('job:new-match', onNewMatch);
      socket.off('job:match-cancelled', onCancelled);
    };
  }, []);

  // ── Ring control: start when a new top-of-queue appears, stop on drain
  useEffect(() => {
    if (!current) {
      if (ringingForRef.current) {
        stopJobAlertRing();
        ringingForRef.current = null;
      }
      return;
    }
    if (ringingForRef.current === current.bookingId) return;
    ringingForRef.current = current.bookingId;
    startJobAlertRing(
      `New job · ${current.category.name}`,
      `${current.customer.fullName} · ${current.addressArea ?? current.addressLine}`,
    );
  }, [current]);

  // Stop the ring on unmount as a belt-and-suspenders (RootLayout never
  // unmounts in practice but tests/hot-reload can).
  useEffect(() => {
    return () => {
      stopJobAlertRing();
    };
  }, []);

  // ── Countdown heartbeat: drives the ring visually only ───────────────
  // The ring loops 60→0→60. Reaching zero is NOT an action — the alert
  // stays on screen until the pro explicitly accepts or declines (Vikas's
  // call: pros must act, no silent auto-reassign). Each loop resets the
  // displayed deadline + re-triggers the beep so the ring stays loud.
  useEffect(() => {
    if (!current) {
      setSecondsLeft(0);
      return;
    }
    // Anchor each loop in local time — we ignore the server's expiresAt
    // after the initial display since this is now a UI heartbeat, not a
    // hard deadline.
    let cycleStart = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - cycleStart) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setSecondsLeft(remaining);
      if (remaining === 0) {
        // Loop: restart the heartbeat + re-trigger the ring so it stays
        // loud through long no-response periods.
        cycleStart = Date.now();
        startJobAlertRing(
          `New job · ${current.category.name}`,
          `${current.customer.fullName} · ${current.addressArea ?? current.addressLine}`,
        );
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [current]);

  // ── Mutations ────────────────────────────────────────────────────────
  const acceptMut = useMutation({
    mutationFn: (bookingId: string) =>
      apiFetch<{ id: string; status: string }>(`/bookings/${bookingId}/accept`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
      void qc.invalidateQueries({ queryKey: ['pro.me.today'] });
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });

  const declineMut = useMutation({
    mutationFn: (bookingId: string) =>
      apiFetch<{ id: string; status: string }>(`/bookings/${bookingId}/cancel`, {
        method: 'POST',
        body: { reason: 'Pro declined the match' },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
    },
  });

  const accept = useCallback(() => {
    if (!current) return;
    const bookingId = current.bookingId;
    acceptMut.mutate(bookingId, {
      onSuccess: () => {
        dismissCurrent();
      },
      onError: (err) => {
        // Most likely: backend timeout fired while pro was tapping —
        // booking is now cancelled and being re-offered elsewhere. Tell
        // the user, then dismiss so the queue moves forward.
        setAcceptError(
          err instanceof ApiCallError
            ? err.message
            : 'Could not accept. The job may have been reassigned.',
        );
        // Give the user 2 seconds to see the message, then drop it.
        setTimeout(() => {
          dismissCurrent();
        }, 2000);
      },
    });
  }, [acceptMut, current, dismissCurrent]);

  const decline = useCallback(() => {
    if (!current) return;
    const bookingId = current.bookingId;
    // Optimistic: dismiss now, fire-and-forget the decline. Worst case
    // the backend rejects (already-cancelled, etc) and the rematch goes
    // ahead — we don't need to wait.
    declineMut.mutate(bookingId);
    dismissCurrent();
  }, [declineMut, current, dismissCurrent]);

  return {
    current,
    secondsLeft,
    accept,
    decline,
    acceptPending: acceptMut.isPending,
    declinePending: declineMut.isPending,
    acceptError,
  };
}
