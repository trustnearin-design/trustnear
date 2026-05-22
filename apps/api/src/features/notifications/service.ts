import { prisma, type Prisma } from '@sevalink/db';
import { logger } from '../../logger.js';
import { isExpoPushToken, sendExpoPush } from './expo.js';

/**
 * Booking notification dispatcher. One public method per state-machine
 * transition so callers don't have to think about copy or routing data.
 *
 * Each method:
 *   1. Sends a push (best-effort — failures don't break the caller flow)
 *   2. Writes an in-app `notifications` row for history (visible in
 *      future Profile → Notifications screen)
 *
 * `data.bookingId` is on every payload so the customer app can deep-link
 * to /booking/<id> when the user taps the notification.
 */

interface PushArgs {
  userId: string;
  title: string;
  body: string;
  data: Record<string, string>;
  type:
    | 'booking_matched'
    | 'booking_confirmed'
    | 'booking_status'
    | 'payment_received'
    | 'payment_failed'
    | 'system';
}

async function dispatch(args: PushArgs): Promise<void> {
  // Write in-app row first — even if push fails, the user sees it in-app.
  await prisma.notification.create({
    data: {
      userId: args.userId,
      type: args.type,
      title: args.title,
      body: args.body,
      data: args.data as Prisma.InputJsonValue,
    },
  });

  // Send push (best-effort)
  try {
    const user = await prisma.user.findUnique({
      where: { id: args.userId },
      select: { deviceToken: true, fullName: true },
    });
    if (!isExpoPushToken(user?.deviceToken)) {
      logger.debug(
        { userId: args.userId, hasToken: !!user?.deviceToken },
        'notify: skipped (no valid push token)',
      );
      return;
    }
    const tickets = await sendExpoPush([
      {
        to: user.deviceToken,
        title: args.title,
        body: args.body,
        data: args.data,
        sound: 'default',
        priority: 'high',
        channelId: 'sevalink-booking',
      },
    ]);
    const ticket = tickets[0];
    if (ticket?.status === 'error') {
      logger.warn(
        { userId: args.userId, error: ticket.message, details: ticket.details },
        'notify: expo push returned error',
      );
      // DeviceNotRegistered means the customer uninstalled / re-installed;
      // wipe the token so we stop hammering Expo with dead sends.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await prisma.user.update({
          where: { id: args.userId },
          data: { deviceToken: null },
        });
      }
    } else {
      logger.info({ userId: args.userId, type: args.type }, 'notify: push sent');
    }
  } catch (err) {
    logger.error({ err, userId: args.userId, type: args.type }, 'notify: dispatch failed');
  }
}

// ─── Booking lifecycle ──────────────────────────────────────────────

export async function notifyBookingMatched(args: {
  customerId: string;
  bookingId: string;
  bookingNumber: string;
  professionalName: string;
}): Promise<void> {
  await dispatch({
    userId: args.customerId,
    type: 'booking_matched',
    title: `${args.professionalName} accepted your booking`,
    body: `${args.bookingNumber} · Tap to view details`,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

export async function notifyBookingEnRoute(args: {
  customerId: string;
  bookingId: string;
  professionalName: string;
}): Promise<void> {
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    title: 'Your expert is on the way',
    body: `${args.professionalName} has started the trip. Track live on the map.`,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

export async function notifyBookingArrived(args: {
  customerId: string;
  bookingId: string;
  professionalName: string;
}): Promise<void> {
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    title: 'Your expert has arrived',
    body: `Share the OTP with ${args.professionalName} to begin the service.`,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

export async function notifyBookingCompleted(args: {
  customerId: string;
  bookingId: string;
  bookingNumber: string;
  amountPaise: number;
}): Promise<void> {
  const rupees = (args.amountPaise / 100).toFixed(0);
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    title: 'Service complete',
    body: `${args.bookingNumber} done. Pay ₹${rupees} to wrap up.`,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

// ─── Payment lifecycle ──────────────────────────────────────────────

export async function notifyPaymentReceived(args: {
  customerId: string;
  bookingId: string;
  bookingNumber: string;
  amountPaise: number;
}): Promise<void> {
  const rupees = (args.amountPaise / 100).toFixed(0);
  await dispatch({
    userId: args.customerId,
    type: 'payment_received',
    title: `Payment of ₹${rupees} received`,
    body: `Thank you! ${args.bookingNumber} is fully closed. Rate your expert?`,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}
