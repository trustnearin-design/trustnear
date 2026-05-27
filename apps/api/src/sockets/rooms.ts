import { prisma } from '@sevalink/db';
import { logger } from '../logger.js';
import { ROOMS } from './events.js';
import type { AppSocket } from './auth.js';

/**
 * Authorize a socket to join a booking room.
 * Allowed: customer of the booking, assigned pro, or admin.
 *
 * Returns true if the socket joined (or was already in) the room; false on rejection.
 */
export async function joinBookingRoom(
  socket: AppSocket,
  bookingId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(bookingId)) {
    return { ok: false, error: 'Invalid booking id' };
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      customerId: true,
      professional: { select: { userId: true } },
      deletedAt: true,
    },
  });

  if (!booking || booking.deletedAt) {
    return { ok: false, error: 'Booking not found' };
  }

  const { userId, role } = socket.data;
  const isCustomer = role === 'customer' && booking.customerId === userId;
  const isPro = role === 'professional' && booking.professional?.userId === userId;
  const isAdmin = role === 'admin';

  if (!isCustomer && !isPro && !isAdmin) {
    return { ok: false, error: 'Not authorized for this booking' };
  }

  const room = ROOMS.booking(bookingId);
  await socket.join(room);
  socket.data.joinedRooms.add(room);
  logger.debug({ socketId: socket.id, room, userId, role }, 'socket: joined booking room');
  return { ok: true };
}

export async function leaveBookingRoom(socket: AppSocket, bookingId: string): Promise<void> {
  const room = ROOMS.booking(bookingId);
  await socket.leave(room);
  socket.data.joinedRooms.delete(room);
}

/**
 * Auto-join admin role into the global admin room on connect.
 */
export async function autoJoinAdmin(socket: AppSocket): Promise<void> {
  if (socket.data.role === 'admin') {
    await socket.join(ROOMS.admin);
    socket.data.joinedRooms.add(ROOMS.admin);
    logger.debug({ socketId: socket.id }, 'socket: admin auto-joined admin room');
  }
}

/**
 * Auto-join the per-user room so user-targeted events (e.g. `job:new-match`)
 * reach this socket regardless of which screen the user is on. Every
 * authenticated socket gets this — the broadcaster decides which userId to
 * emit to, not the client.
 */
export async function autoJoinUser(socket: AppSocket): Promise<void> {
  const room = ROOMS.user(socket.data.userId);
  await socket.join(room);
  socket.data.joinedRooms.add(room);
  logger.debug({ socketId: socket.id, userId: socket.data.userId }, 'socket: joined user room');
}
