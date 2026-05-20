import { prisma } from '@sevalink/db';
import { rateLimit } from '../../shared/rate-limit.js';
import { generateTicketNumber } from '@sevalink/utils';
import { logger } from '../../logger.js';
import { ROOMS } from '../events.js';
import type { AppSocket } from '../auth.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../events.js';
import type { Server } from 'socket.io';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * SOS emergency:
 *   1. Anyone authenticated in the booking room may trigger
 *   2. Strict rate limit: 1 per user per minute (prevents accidental spam)
 *   3. Persist a high-priority support ticket
 *   4. Broadcast 'sos:alert' to the admin room — ops team sees instantly
 *
 * Phase 2 will also: push FCM to ops phones + auto-dial emergency contacts.
 */
export function registerSosHandler(io: AppServer, socket: AppSocket): void {
  socket.on('sos:trigger', async (payload, ack) => {
    try {
      const { bookingId, latitude, longitude, reason } = payload;

      if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
        ack?.({ ok: false, error: 'Invalid booking id' });
        return;
      }

      const rl = await rateLimit({
        key: `sos:${socket.data.userId}`,
        limit: 1,
        windowSeconds: 60,
      });
      if (!rl.allowed) {
        ack?.({ ok: false, error: 'SOS already triggered — ops team alerted' });
        return;
      }

      const room = ROOMS.booking(bookingId);
      if (!socket.data.joinedRooms.has(room)) {
        ack?.({ ok: false, error: 'Not a participant of this booking' });
        return;
      }

      // Fetch context for the alert
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
          customer: { select: { id: true, fullName: true, phone: true } },
        },
      });
      if (!booking) {
        ack?.({ ok: false, error: 'Booking not found' });
        return;
      }

      // Persist a high-priority support ticket for ops triage
      await prisma.supportTicket.create({
        data: {
          ticketNumber: generateTicketNumber(),
          userId: socket.data.userId,
          bookingId,
          type: 'other',
          status: 'open',
          subject: `🚨 SOS: ${reason ?? 'Emergency triggered'}`,
          messages: [
            {
              sender: socket.data.userId,
              role: socket.data.role,
              message: reason ?? 'SOS button pressed',
              latitude,
              longitude,
              ts: new Date().toISOString(),
            },
          ],
        },
      });

      io.to(ROOMS.admin).emit('sos:alert', {
        bookingId,
        customerId: booking.customer.id,
        customerName: booking.customer.fullName,
        customerPhone: booking.customer.phone,
        latitude,
        longitude,
        reason: reason ?? undefined,
        timestamp: new Date().toISOString(),
      });

      logger.warn(
        { bookingId, userId: socket.data.userId, role: socket.data.role, reason },
        '🚨 SOS triggered',
      );
      ack?.({ ok: true });
    } catch (err) {
      logger.error({ err, userId: socket.data.userId }, 'sos:trigger failed');
      ack?.({ ok: false, error: 'Internal error' });
    }
  });
}
