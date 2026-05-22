import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';
import { logger } from '../../logger.js';

/**
 * Singleton Expo Push client. Manages chunking + auth headers internally.
 * For our scale (single Jaipur city MVP) one client is plenty.
 */
const expo = new Expo();

/**
 * Whether a candidate string looks like a valid Expo push token. Use this
 * before storing tokens — Cashfree-style test strings or empty values
 * would otherwise propagate to send-time and fail there per-message.
 */
export function isExpoPushToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && Expo.isExpoPushToken(token);
}

/**
 * Send a batch of push notifications. Returns tickets; failed sends are
 * marked `status: 'error'` in their ticket so the caller can log +
 * mark the device token inactive (e.g. on `DeviceNotRegistered`).
 *
 * Expo's SDK auto-chunks into batches of 100. We don't fan out further.
 */
export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
  if (messages.length === 0) return [];
  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      const chunkTickets = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...chunkTickets);
    } catch (err) {
      logger.error({ err, count: chunk.length }, 'expo push: chunk send failed');
      // Continue with remaining chunks — partial success is better than zero
    }
  }
  return tickets;
}

export type { ExpoPushMessage, ExpoPushTicket };
