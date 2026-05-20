/**
 * Typed event contracts — shared between server & clients.
 *
 * Naming convention: `domain:action` (lowercase, colon-separated).
 * Add new events here and TypeScript will enforce shape on both sides.
 */

// ─── Client → Server ────────────────────────────────────────────────
export interface ClientToServerEvents {
  'location:update': (
    payload: { latitude: number; longitude: number; heading?: number; speedKmh?: number },
    ack?: (response: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  'booking:join': (
    payload: { bookingId: string },
    ack?: (response: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
  'booking:leave': (payload: { bookingId: string }) => void;
  'chat:send': (
    payload: { bookingId: string; message: string; type?: 'text' | 'image' | 'audio' },
    ack?: (response: { ok: true; messageId: string } | { ok: false; error: string }) => void,
  ) => void;
  'sos:trigger': (
    payload: { bookingId: string; latitude: number; longitude: number; reason?: string },
    ack?: (response: { ok: true } | { ok: false; error: string }) => void,
  ) => void;
}

// ─── Server → Client ────────────────────────────────────────────────
export interface ServerToClientEvents {
  /** Broadcast to booking room when pro position updates */
  'pro:location': (payload: {
    bookingId: string;
    latitude: number;
    longitude: number;
    heading?: number | undefined;
    speedKmh?: number | undefined;
    etaSeconds: number;
    etaText: string;
    distanceMeters: number;
    provider: 'haversine' | 'google';
    timestamp: string;
  }) => void;

  /** Broadcast when booking state machine transitions */
  'booking:status': (payload: {
    bookingId: string;
    status: string;
    timestamp: string;
    message: string;
  }) => void;

  /** Broadcast for in-booking chat */
  'chat:message': (payload: {
    bookingId: string;
    messageId: string;
    senderId: string;
    senderRole: 'customer' | 'professional';
    type: 'text' | 'image' | 'audio';
    message: string;
    timestamp: string;
  }) => void;

  /** Admin room only — emergency alert */
  'sos:alert': (payload: {
    bookingId: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    latitude: number;
    longitude: number;
    reason?: string | undefined;
    timestamp: string;
  }) => void;
}

// ─── Socket-scoped data (attached after auth) ──────────────────────
export interface SocketData {
  userId: string;
  role: 'customer' | 'professional' | 'admin';
  phone: string;
  /** Set of booking room IDs this socket has joined */
  joinedRooms: Set<string>;
}

// ─── Server↔server adapter events (Redis pub/sub) ──────────────────
// Empty for now — we'll add cross-instance message types here later
// (e.g. broadcasting trust-score-changed across instances).
export type InterServerEvents = Record<string, never>;

// Room name helpers — single source of truth
export const ROOMS = {
  /** Per-booking room. Customer + assigned pro + admins. */
  booking: (id: string) => `booking:${id}`,
  /** Admin-only room receiving SOS alerts. */
  admin: 'admin:room',
} as const;
