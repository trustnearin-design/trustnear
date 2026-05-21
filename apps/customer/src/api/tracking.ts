import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../lib/socket';

export interface ProLocationUpdate {
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  etaSeconds: number;
  etaText: string;
  distanceMeters: number;
  provider: 'haversine' | 'google';
  timestamp: string;
}

export interface BookingStatusUpdate {
  bookingId: string;
  status: string;
  timestamp: string;
  message: string;
}

export type TrackingConnState =
  | 'connecting'
  | 'connected'
  | 'joining'
  | 'joined'
  | 'auth_error'
  | 'join_error'
  | 'disconnected';

export interface TrackingState {
  /** Latest pro position + ETA, or null until the first event arrives. */
  proLocation: ProLocationUpdate | null;
  /** True once the socket has confirmed joining the booking's room. */
  joined: boolean;
  /** Last received `booking:status` event (used for UX toasts). */
  latestStatus: BookingStatusUpdate | null;
  /** Where we are in the socket lifecycle — surfaced to the UI so users see
   * "Connecting…" instead of an indefinite spinner when something stalls. */
  connStatus: TrackingConnState;
  /** Last connect/join error message, if any (shown on the waiting banner). */
  errorMessage: string | null;
}

/**
 * Subscribe to live updates for a booking. Joins the booking room over
 * Socket.IO on mount, leaves on unmount. Returns the latest pro location
 * + ETA + a "joined" flag for UX. Also invalidates the React-Query cache
 * for this booking when a `booking:status` event arrives, which lets the
 * detail screen reflect transitions instantly instead of waiting for the
 * 5s poll.
 */
export function useBookingTracking(bookingId: string | undefined): TrackingState {
  const qc = useQueryClient();
  const [state, setState] = useState<TrackingState>({
    proLocation: null,
    joined: false,
    latestStatus: null,
    connStatus: 'connecting',
    errorMessage: null,
  });
  const joinedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const socket = getSocket();

    const onLocation = (payload: ProLocationUpdate) => {
      if (payload.bookingId !== bookingId) return;
      setState((s) => ({ ...s, proLocation: payload }));
    };
    const onStatus = (payload: BookingStatusUpdate) => {
      if (payload.bookingId !== bookingId) return;
      setState((s) => ({ ...s, latestStatus: payload }));
      void qc.invalidateQueries({ queryKey: ['booking', bookingId] });
      void qc.invalidateQueries({ queryKey: ['bookings.mine'] });
    };

    const join = () => {
      setState((s) => ({ ...s, connStatus: 'joining', errorMessage: null }));
      socket.emit(
        'booking:join',
        { bookingId },
        (resp: { ok: true } | { ok: false; error: string }) => {
          if (resp && 'ok' in resp && resp.ok) {
            joinedIdRef.current = bookingId;
            setState((s) => ({ ...s, joined: true, connStatus: 'joined' }));
          } else {
            setState((s) => ({
              ...s,
              connStatus: 'join_error',
              errorMessage: resp?.error ?? 'Could not join booking room',
            }));
          }
        },
      );
    };

    const onConnect = () => {
      setState((s) => ({ ...s, connStatus: 'connected', errorMessage: null }));
      join();
    };
    const onDisconnect = (reason: string) => {
      setState((s) => ({
        ...s,
        joined: false,
        connStatus: 'disconnected',
        errorMessage: reason,
      }));
    };
    const onConnectError = (err: Error) => {
      setState((s) => ({
        ...s,
        connStatus: 'auth_error',
        errorMessage: err.message,
      }));
    };

    socket.on('pro:location', onLocation);
    socket.on('booking:status', onStatus);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Reflect the current state of the socket at subscribe time so we don't
    // start with "Connecting…" if the socket is already up from a previous
    // screen.
    if (socket.connected) {
      setState((s) => ({ ...s, connStatus: 'connected', errorMessage: null }));
      join();
    }

    return () => {
      socket.off('pro:location', onLocation);
      socket.off('booking:status', onStatus);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
      if (joinedIdRef.current === bookingId) {
        socket.emit('booking:leave', { bookingId });
        joinedIdRef.current = null;
      }
      setState((s) => ({ ...s, joined: false }));
    };
  }, [bookingId, qc]);

  return state;
}

/** Human-readable label for a connection state — used on the waiting banner. */
export function trackingConnLabel(state: TrackingState): string {
  if (state.proLocation) return 'Live'; // not used in the banner; map shows ETA strip
  switch (state.connStatus) {
    case 'connecting':
      return 'Connecting to live tracking…';
    case 'connected':
      return 'Connected. Joining booking room…';
    case 'joining':
      return 'Joining booking room…';
    case 'joined':
      return 'Waiting for live location from your expert…';
    case 'auth_error':
      return `Live tracking unavailable: ${state.errorMessage ?? 'auth failed'}`;
    case 'join_error':
      return `Couldn't join booking room: ${state.errorMessage ?? 'unknown'}`;
    case 'disconnected':
      return `Reconnecting… (${state.errorMessage ?? 'lost connection'})`;
  }
}
