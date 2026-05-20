import { prisma } from '@sevalink/db';
import { roundCoord } from '@sevalink/utils';
import { logger } from '../../logger.js';
import { redis } from '../../redis.js';
import { etaProvider } from '../../features/eta/index.js';
import { ROOMS } from '../events.js';
import type { AppSocket } from '../auth.js';
import type { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from '../events.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

const THROTTLE_SECONDS = 2;
const ETA_CACHE_SECONDS = 5;

function throttleKey(userId: string): string {
  return `socket:loc:throttle:${userId}`;
}
function etaCacheKey(proLat: number, proLng: number, custLat: number, custLng: number): string {
  return `eta:${roundCoord(proLat, 3)}:${roundCoord(proLng, 3)}:${roundCoord(custLat, 3)}:${roundCoord(custLng, 3)}`;
}

interface CachedEta {
  etaSeconds: number;
  etaText: string;
  distanceMeters: number;
  provider: 'haversine' | 'google';
}

/**
 * Handle a pro's GPS update:
 *   1. Throttle: max one update per pro per THROTTLE_SECONDS (silent drop)
 *   2. Resolve which active booking this pro is on (matched/confirmed/en_route/in_progress)
 *   3. Upsert pro_locations table
 *   4. Compute ETA via etaProvider (Google or Haversine), cache 5s
 *   5. Broadcast 'pro:location' to that booking's room
 *
 * Customers don't emit this — we drop on the floor if a non-pro tries.
 */
export function registerLocationHandler(io: AppServer, socket: AppSocket): void {
  socket.on('location:update', async (payload, ack) => {
    try {
      if (socket.data.role !== 'professional') {
        ack?.({ ok: false, error: 'Only professionals can update location' });
        return;
      }

      const { latitude, longitude, heading, speedKmh } = payload;
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        ack?.({ ok: false, error: 'Invalid coordinates' });
        return;
      }

      // Throttle — Redis SETNX with TTL is atomic; if it returns 0 we're throttled
      const setRes = await redis.set(
        throttleKey(socket.data.userId),
        '1',
        'EX',
        THROTTLE_SECONDS,
        'NX',
      );
      if (setRes !== 'OK') {
        // Silently dropped — not an error, just rate limiting
        ack?.({ ok: true });
        return;
      }

      // Find the pro id + any active booking
      const pro = await prisma.professional.findUnique({
        where: { userId: socket.data.userId },
        select: { id: true },
      });
      if (!pro) {
        ack?.({ ok: false, error: 'Professional profile not found' });
        return;
      }

      // Active bookings worth broadcasting for
      const activeBookings = await prisma.booking.findMany({
        where: {
          professionalId: pro.id,
          status: { in: ['matched', 'confirmed', 'pro_en_route', 'in_progress'] },
          deletedAt: null,
        },
        select: { id: true, addressLat: true, addressLng: true, status: true },
        orderBy: { scheduledAt: 'asc' },
        take: 5, // safety cap
      });

      // Persist latest location (single row per pro)
      await prisma.proLocation.upsert({
        where: { professionalId: pro.id },
        update: {
          latitude,
          longitude,
          ...(typeof heading === 'number' ? { heading } : {}),
          ...(typeof speedKmh === 'number' ? { speedKmh } : {}),
        },
        create: {
          professionalId: pro.id,
          latitude,
          longitude,
          ...(typeof heading === 'number' ? { heading } : {}),
          ...(typeof speedKmh === 'number' ? { speedKmh } : {}),
        },
      });

      // For each active booking, compute ETA + broadcast
      for (const booking of activeBookings) {
        const custLat = Number(booking.addressLat);
        const custLng = Number(booking.addressLng);

        // ETA cache — different pros to same customer addr share cache
        const ck = etaCacheKey(latitude, longitude, custLat, custLng);
        const cached = await redis.get(ck);
        let etaData: CachedEta;
        if (cached) {
          etaData = JSON.parse(cached) as CachedEta;
        } else {
          const fresh = await etaProvider.estimate({
            fromLat: latitude,
            fromLng: longitude,
            toLat: custLat,
            toLng: custLng,
          });
          etaData = {
            etaSeconds: fresh.etaSeconds,
            etaText: fresh.etaText,
            distanceMeters: fresh.distanceMeters,
            provider: fresh.provider,
          };
          await redis.set(ck, JSON.stringify(etaData), 'EX', ETA_CACHE_SECONDS);
        }

        io.to(ROOMS.booking(booking.id)).emit('pro:location', {
          bookingId: booking.id,
          latitude,
          longitude,
          heading: heading ?? undefined,
          speedKmh: speedKmh ?? undefined,
          etaSeconds: etaData.etaSeconds,
          etaText: etaData.etaText,
          distanceMeters: etaData.distanceMeters,
          provider: etaData.provider,
          timestamp: new Date().toISOString(),
        });
      }

      ack?.({ ok: true });
    } catch (err) {
      logger.error({ err, userId: socket.data.userId }, 'location:update failed');
      ack?.({ ok: false, error: 'Internal error' });
    }
  });
}
