import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { getSocket } from '../lib/socket';

/**
 * Pro-side socket integration for an active job:
 *   1. Join the booking room so we receive `booking:status` (used to invalidate
 *      the job-detail cache on remote transitions like customer cancel).
 *   2. Stream the device GPS as `location:update`. Backend throttles to 2s
 *      and rebroadcasts `pro:location` (with ETA) to the same room — we
 *      listen to that echo to surface the live ETA on our own map.
 *
 * Broadcasting only runs while `broadcast === true` (caller passes true once
 * status === 'pro_en_route' or 'in_progress'). On unmount we leave the room
 * and stop the watcher.
 */

export interface ProJobTracking {
  /** Latest GPS reading + ETA returned by the backend. */
  selfLocation: {
    lat: number;
    lng: number;
    etaSeconds: number;
    etaText: string;
    distanceMeters: number;
    provider: 'haversine' | 'google';
  } | null;
  /** True once the socket has joined the booking room. */
  joined: boolean;
  /** Permission state for foreground GPS — surface a hint if denied. */
  locationPermission: 'unknown' | 'granted' | 'denied';
  /** Lifecycle hint for UI ("Connecting…", "Joined", error reason). */
  statusLabel: string;
}

export function useJobTracking(bookingId: string | undefined, broadcast: boolean): ProJobTracking {
  const qc = useQueryClient();
  const [state, setState] = useState<ProJobTracking>({
    selfLocation: null,
    joined: false,
    locationPermission: 'unknown',
    statusLabel: 'Connecting…',
  });
  const joinedRef = useRef<string | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  // ── Socket: join room + subscribe to events ───────────────────────────
  useEffect(() => {
    if (!bookingId) return;
    const socket = getSocket();

    const onProLocation = (payload: {
      bookingId: string;
      latitude: number;
      longitude: number;
      etaSeconds: number;
      etaText: string;
      distanceMeters: number;
      provider: 'haversine' | 'google';
    }) => {
      if (payload.bookingId !== bookingId) return;
      setState((s) => ({
        ...s,
        selfLocation: {
          lat: payload.latitude,
          lng: payload.longitude,
          etaSeconds: payload.etaSeconds,
          etaText: payload.etaText,
          distanceMeters: payload.distanceMeters,
          provider: payload.provider,
        },
      }));
    };

    const onStatus = (payload: { bookingId: string }) => {
      if (payload.bookingId !== bookingId) return;
      void qc.invalidateQueries({ queryKey: ['pro.job', bookingId] });
      void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
    };

    const join = () => {
      socket.emit(
        'booking:join',
        { bookingId },
        (resp: { ok: true } | { ok: false; error: string }) => {
          if (resp?.ok) {
            joinedRef.current = bookingId;
            setState((s) => ({ ...s, joined: true, statusLabel: 'Joined' }));
          } else {
            setState((s) => ({
              ...s,
              statusLabel: resp?.error ?? "Couldn't join room",
            }));
          }
        },
      );
    };

    const onConnect = () => {
      setState((s) => ({ ...s, statusLabel: 'Joining…' }));
      join();
    };
    const onConnectError = (err: Error) => {
      setState((s) => ({ ...s, statusLabel: `Socket: ${err.message}` }));
    };
    const onDisconnect = () => {
      setState((s) => ({ ...s, joined: false, statusLabel: 'Disconnected' }));
    };

    socket.on('pro:location', onProLocation);
    socket.on('booking:status', onStatus);
    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('disconnect', onDisconnect);

    if (socket.connected) {
      setState((s) => ({ ...s, statusLabel: 'Joining…' }));
      join();
    }

    return () => {
      socket.off('pro:location', onProLocation);
      socket.off('booking:status', onStatus);
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('disconnect', onDisconnect);
      if (joinedRef.current === bookingId) {
        socket.emit('booking:leave', { bookingId });
        joinedRef.current = null;
      }
    };
  }, [bookingId, qc]);

  // ── GPS watcher: only while broadcasting ──────────────────────────────
  useEffect(() => {
    if (!bookingId || !broadcast) {
      // Make sure any prior watcher is stopped when broadcast flips off
      if (watcherRef.current) {
        watcherRef.current.remove();
        watcherRef.current = null;
      }
      return;
    }

    let cancelled = false;
    const socket = getSocket();

    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (!perm.granted) {
        setState((s) => ({ ...s, locationPermission: 'denied' }));
        return;
      }
      setState((s) => ({ ...s, locationPermission: 'granted' }));

      // Send one immediate reading so the customer's map updates without
      // waiting for the first distance/time-based delta.
      const initial = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (!cancelled) {
        socket.emit('location:update', {
          latitude: initial.coords.latitude,
          longitude: initial.coords.longitude,
          ...(typeof initial.coords.heading === 'number'
            ? { heading: initial.coords.heading }
            : {}),
          ...(typeof initial.coords.speed === 'number'
            ? { speedKmh: initial.coords.speed * 3.6 }
            : {}),
        });
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          // Min 5 m or 3 s between callbacks — backend re-throttles to 2 s.
          distanceInterval: 5,
          timeInterval: 3000,
        },
        (pos) => {
          socket.emit('location:update', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            ...(typeof pos.coords.heading === 'number' ? { heading: pos.coords.heading } : {}),
            ...(typeof pos.coords.speed === 'number' ? { speedKmh: pos.coords.speed * 3.6 } : {}),
          });
        },
      );
      if (cancelled) {
        sub.remove();
        return;
      }
      watcherRef.current = sub;
    })().catch(() => {
      // expo-location threw — usually no provider available. Surface via the
      // permission flag so the UI hints the pro to enable location.
      setState((s) => ({ ...s, locationPermission: 'denied' }));
    });

    return () => {
      cancelled = true;
      if (watcherRef.current) {
        watcherRef.current.remove();
        watcherRef.current = null;
      }
    };
  }, [bookingId, broadcast]);

  return state;
}
