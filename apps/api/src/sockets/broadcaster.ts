import type { Server } from 'socket.io';
import { ROOMS } from './events.js';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './events.js';

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

/**
 * Module-scoped reference to the Socket.IO server. Set once at boot from
 * server.ts so REST handlers (which don't have socket context) can still
 * broadcast events. Null in test environments that skip socket setup.
 */
let serverRef: AppServer | null = null;

export function setSocketServer(io: AppServer): void {
  serverRef = io;
}

const STATUS_MESSAGES: Record<string, string> = {
  matched: 'A SevaExpert has been matched to your booking',
  confirmed: 'SevaExpert accepted — preparing to start',
  pro_en_route: 'SevaExpert is on the way!',
  otp_verified: 'OTP verified — service starting',
  in_progress: 'Service in progress',
  completed: 'Service completed — please rate your experience',
  cancelled_customer: 'Booking cancelled by customer',
  cancelled_pro: 'Booking cancelled by SevaExpert',
  disputed: 'Booking marked as disputed — support will reach out',
};

/**
 * Broadcast a booking status change to the booking's room.
 * Safe to call from anywhere — no-op if the socket server isn't initialized.
 */
export function broadcastBookingStatus(bookingId: string, status: string): void {
  if (!serverRef) return;
  serverRef.to(ROOMS.booking(bookingId)).emit('booking:status', {
    bookingId,
    status,
    timestamp: new Date().toISOString(),
    message: STATUS_MESSAGES[status] ?? `Status: ${status}`,
  });
}
