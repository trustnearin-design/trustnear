import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import type { Server as HTTPServer } from 'node:http';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { authenticateSocket, type AppSocket } from './auth.js';
import { autoJoinAdmin, joinBookingRoom, leaveBookingRoom } from './rooms.js';
import { registerLocationHandler } from './handlers/location.js';
import { registerChatHandler } from './handlers/chat.js';
import { registerSosHandler } from './handlers/sos.js';
import { setSocketServer } from './broadcaster.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events.js';

type AppServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Build a Socket.IO server attached to an existing Node HTTP server.
 *
 * Uses the Redis adapter so pub/sub works across multiple Node instances
 * (essential for horizontal scaling — without it a customer connected to
 * instance A wouldn't receive events from a pro connected to instance B).
 *
 * Returns { io, cleanup }. Caller must invoke cleanup() during shutdown.
 */
export async function createSocketServer(httpServer: HTTPServer): Promise<{
  io: AppServer;
  cleanup: () => Promise<void>;
}> {
  const io: AppServer = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, origin ?? '*');
      },
      credentials: true,
    },
    // Heartbeat — disconnect zombies after 60s of no pong
    pingTimeout: 20_000,
    pingInterval: 25_000,
    // Match REST API's body size guidance
    maxHttpBufferSize: 1e6,
  });

  // Redis pub/sub adapter — duplicate connections per Socket.IO recommendation
  const pubClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  const subClient = pubClient.duplicate();

  await Promise.all([
    new Promise<void>((resolve, reject) => {
      pubClient.once('ready', () => {
        resolve();
      });
      pubClient.once('error', reject);
    }),
    new Promise<void>((resolve, reject) => {
      subClient.once('ready', () => {
        resolve();
      });
      subClient.once('error', reject);
    }),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('socket: Redis adapter ready (pub/sub multiplexed)');

  // Auth middleware on every connection
  io.use((socket, next) => {
    void authenticateSocket(socket as AppSocket, next);
  });

  io.on('connection', (socket) => {
    const s = socket as AppSocket;
    logger.info({ socketId: s.id, userId: s.data.userId, role: s.data.role }, 'socket: connected');

    void autoJoinAdmin(s);

    // Room management
    s.on('booking:join', async ({ bookingId }, ack) => {
      const result = await joinBookingRoom(s, bookingId);
      ack?.(result);
    });
    s.on('booking:leave', async ({ bookingId }) => {
      await leaveBookingRoom(s, bookingId);
    });

    // Domain handlers
    registerLocationHandler(io, s);
    registerChatHandler(io, s);
    registerSosHandler(io, s);

    s.on('disconnect', (reason) => {
      logger.info({ socketId: s.id, userId: s.data.userId, reason }, 'socket: disconnected');
    });
  });

  setSocketServer(io);

  const cleanup = async (): Promise<void> => {
    logger.info('socket: closing connections…');
    await new Promise<void>((resolve) => {
      io.close(() => {
        resolve();
      });
    });
    await Promise.allSettled([pubClient.quit(), subClient.quit()]);
  };

  return { io, cleanup };
}
