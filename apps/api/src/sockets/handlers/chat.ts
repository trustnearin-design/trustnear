import { prisma } from '@sevalink/db';
import { rateLimit } from '../../shared/rate-limit.js';
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
 * In-booking chat:
 *   1. Validate sender is in the booking room (they had to authenticate to join)
 *   2. Rate limit: 20 messages / 10s per sender (prevents flooding)
 *   3. Persist to chat_messages table
 *   4. Broadcast to room (sender's other devices included for multi-tab sync)
 */
export function registerChatHandler(io: AppServer, socket: AppSocket): void {
  socket.on('chat:send', async (payload, ack) => {
    try {
      const { bookingId, message, type = 'text' } = payload;

      if (!bookingId || typeof bookingId !== 'string') {
        ack?.({ ok: false, error: 'Invalid booking id' });
        return;
      }
      if (!message || message.trim().length === 0 || message.length > 2000) {
        ack?.({ ok: false, error: 'Message must be 1-2000 chars' });
        return;
      }

      const room = ROOMS.booking(bookingId);
      if (!socket.data.joinedRooms.has(room)) {
        ack?.({ ok: false, error: 'Join the booking room before sending' });
        return;
      }

      const rl = await rateLimit({
        key: `chat:${socket.data.userId}`,
        limit: 20,
        windowSeconds: 10,
      });
      if (!rl.allowed) {
        ack?.({ ok: false, error: 'Too many messages — slow down' });
        return;
      }

      const saved = await prisma.chatMessage.create({
        data: {
          bookingId,
          senderId: socket.data.userId,
          type,
          message: message.trim(),
        },
        select: { id: true, createdAt: true },
      });

      io.to(room).emit('chat:message', {
        bookingId,
        messageId: saved.id,
        senderId: socket.data.userId,
        senderRole: socket.data.role === 'admin' ? 'professional' : socket.data.role,
        type,
        message: message.trim(),
        timestamp: saved.createdAt.toISOString(),
      });

      ack?.({ ok: true, messageId: saved.id });
    } catch (err) {
      logger.error({ err, userId: socket.data.userId }, 'chat:send failed');
      ack?.({ ok: false, error: 'Internal error' });
    }
  });
}
