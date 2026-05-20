import type { Socket } from 'socket.io';
import { verifyAccessToken } from '../features/auth/jwt.js';
import { logger } from '../logger.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events.js';

export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

/**
 * Socket.IO connection middleware — verify JWT before allowing the connection.
 *
 * Token sources (first match wins):
 *   1. socket.handshake.auth.token (preferred — set via io(url, { auth: { token } }))
 *   2. socket.handshake.headers.authorization "Bearer <token>"
 *
 * Reject with a meaningful error so clients can distinguish "expired" vs "invalid"
 * (they'll trigger a refresh-token flow on expired).
 */
export async function authenticateSocket(
  socket: AppSocket,
  next: (err?: Error) => void,
): Promise<void> {
  const rawToken =
    (socket.handshake.auth as { token?: string } | undefined)?.token ??
    socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!rawToken) {
    next(new Error('Missing auth token'));
    return;
  }

  try {
    const payload = await verifyAccessToken(rawToken);
    socket.data.userId = payload.sub;
    socket.data.role = payload.role;
    socket.data.phone = payload.phone;
    socket.data.joinedRooms = new Set();
    logger.debug(
      { socketId: socket.id, userId: payload.sub, role: payload.role },
      'socket: authenticated',
    );
    next();
  } catch (err) {
    logger.warn({ err, socketId: socket.id }, 'socket: auth failed');
    next(err instanceof Error ? err : new Error('Auth failed'));
  }
}
