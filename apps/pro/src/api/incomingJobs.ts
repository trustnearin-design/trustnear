import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
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

/** Shape of one row from GET /pros/me/jobs?segment=pending (status=matched). */
interface PendingJob {
  id: string;
  bookingNumber: string;
  scheduledAt: string;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  /** Optional — older API builds (pre-proPayout) omit it; replay falls back to 0. */
  proPayout?: number;
  category: { slug: string; name: string };
  customer: { fullName: string; profilePhoto: string | null };
}

export interface IncomingJobController {
  current: IncomingJobAlert | null;
  /** Whole seconds left for the *current* alert (0 once expired). */
  secondsLeft: number;
  accept: (onAccepted?: () => void) => void;
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

  // Push an alert into the queue, deduped by bookingId. Shared by the
  // socket listener (live matches) and the pending-job replay (missed
  // matches surfaced on app open / reconnect).
  const enqueue = useCallback((payload: IncomingJobAlert) => {
    setQueue((q) => {
      if (q.some((a) => a.bookingId === payload.bookingId)) return q;
      return [...q, payload];
    });
  }, []);

  // ── Pending-job replay ───────────────────────────────────────────────
  // The `job:new-match` socket event is transient — if the pro's app was
  // closed (or the socket was reconnecting) when the customer booked, that
  // ring is lost forever. So whenever the app becomes active we ask the
  // backend for any `matched` jobs still awaiting our accept and surface
  // them through the SAME overlay + ring. This is what makes the alert
  // reliable in the real world where the app isn't always foregrounded.
  const replayPending = useCallback(async () => {
    try {
      const res = await apiFetch<{ jobs: PendingJob[]; count: number }>(
        '/pros/me/jobs?segment=pending',
      );
      for (const j of res.jobs) {
        enqueue({
          bookingId: j.id,
          bookingNumber: j.bookingNumber,
          // Synthetic deadline — the overlay's countdown is a visual
          // heartbeat only (no server-side auto-timeout), so anchoring it
          // to "now" is correct for a replayed alert.
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          customer: { fullName: j.customer.fullName, profilePhoto: j.customer.profilePhoto },
          category: { slug: j.category.slug, name: j.category.name },
          scheduledAt: j.scheduledAt,
          durationMinutes: j.durationMinutes,
          addressLine: j.addressLine,
          addressArea: j.addressArea,
          distanceKm: null,
          // proPayout was added to the jobs API later — fall back to 0 so a
          // staging API that predates it doesn't crash the overlay.
          proPayout: j.proPayout ?? 0,
        });
      }
    } catch {
      // Best-effort — a failed replay just means no overlay this cycle;
      // the Jobs tab still shows the pending job from its own query.
    }
  }, [enqueue]);

  // Run once on mount + every time the app returns to the foreground.
  useEffect(() => {
    void replayPending();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void replayPending();
    });
    return () => sub.remove();
  }, [replayPending]);

  // ── Socket subscription — always on whenever the user is authed ──────
  useEffect(() => {
    const socket = getSocket();
    const onNewMatch = (payload: IncomingJobAlert) => {
      enqueue(payload);
    };
    const onCancelled = (payload: { bookingId: string }) => {
      // Backend invalidated this match (customer cancelled, admin intervened,
      // etc) — drop the overlay so the pro stops hearing the ring on a
      // booking that no longer exists for them.
      setQueue((q) => q.filter((a) => a.bookingId !== payload.bookingId));
    };
    // On (re)connect, replay pending jobs — covers the gap where a match
    // landed while the socket was down.
    const onConnect = () => {
      void replayPending();
    };
    socket.on('job:new-match', onNewMatch);
    socket.on('job:match-cancelled', onCancelled);
    socket.on('connect', onConnect);
    return () => {
      socket.off('job:new-match', onNewMatch);
      socket.off('job:match-cancelled', onCancelled);
      socket.off('connect', onConnect);
    };
  }, [enqueue, replayPending]);

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

  const accept = useCallback(
    (onAccepted?: () => void) => {
      if (!current) return;
      const bookingId = current.bookingId;
      acceptMut.mutate(bookingId, {
        onSuccess: () => {
          dismissCurrent();
          // Navigate only AFTER a confirmed accept — never optimistically, or a
          // failed accept would strand the pro on an error job screen.
          onAccepted?.();
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
    },
    [acceptMut, current, dismissCurrent],
  );

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
