import { prisma, type Prisma } from '@sevalink/db';
import { logger } from '../../logger.js';
import { isExpoPushToken, sendExpoPush } from './expo.js';
import { renderTemplate } from '../cms/templates-service.js';

/**
 * Resolve title/body from the CMS template if one exists + is active,
 * otherwise fall back to the hardcoded copy passed by the caller. Keeps
 * launches safe (no boot-time dependency on CMS rows) and lets admin
 * edit live copy from the dashboard.
 */
async function resolveCopy(
  eventKey: string,
  vars: Record<string, string | number>,
  fallback: { title: string; body: string },
): Promise<{ title: string; body: string }> {
  const rendered = await renderTemplate(eventKey, vars);
  return rendered ?? fallback;
}

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
  /** Android notification channel — defaults to 'sevalink-booking'. The
   * 'sevalink-alert' channel is MAX importance with bypassDnd for the
   * Zomato-style ringing on Pro new-match alerts. */
  channelId?: string;
  /** iOS notification category — drives the Accept/Decline action buttons
   * on the heads-up. The Pro app registers 'job-alert' with two actions. */
  categoryIdentifier?: string;
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
        channelId: args.channelId ?? 'sevalink-booking',
        ...(args.categoryIdentifier ? { categoryId: args.categoryIdentifier } : {}),
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
  const copy = await resolveCopy(
    'booking_matched_customer',
    { professionalName: args.professionalName, bookingNumber: args.bookingNumber },
    {
      title: `${args.professionalName} accepted your booking`,
      body: `${args.bookingNumber} · Tap to view details`,
    },
  );
  await dispatch({
    userId: args.customerId,
    type: 'booking_matched',
    ...copy,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

export async function notifyBookingEnRoute(args: {
  customerId: string;
  bookingId: string;
  professionalName: string;
}): Promise<void> {
  const copy = await resolveCopy(
    'booking_en_route',
    { professionalName: args.professionalName },
    {
      title: 'Your expert is on the way',
      body: `${args.professionalName} has started the trip. Track live on the map.`,
    },
  );
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    ...copy,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

export async function notifyBookingArrived(args: {
  customerId: string;
  bookingId: string;
  professionalName: string;
}): Promise<void> {
  const copy = await resolveCopy(
    'booking_arrived',
    { professionalName: args.professionalName },
    {
      title: 'Your expert has arrived',
      body: `Share the OTP with ${args.professionalName} to begin the service.`,
    },
  );
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    ...copy,
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
  const copy = await resolveCopy(
    'booking_completed',
    { bookingNumber: args.bookingNumber, amountRupees: rupees },
    {
      title: 'Service complete',
      body: `${args.bookingNumber} done. Pay ₹${rupees} to wrap up.`,
    },
  );
  await dispatch({
    userId: args.customerId,
    type: 'booking_status',
    ...copy,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}

// ─── Pro lifecycle ──────────────────────────────────────────────────

/**
 * Push a new-job alert to the Pro. Routes via the high-priority
 * `sevalink-alert` channel so the device fires its full alarm UX even
 * when the app is backgrounded. The Pro app's notification handler reads
 * `type: 'job_new_match'` + `bookingId` to deep-link straight into the
 * incoming-job overlay; Accept/Decline action buttons resolve via the
 * 'job-alert' category registered on the Pro client.
 */
export async function notifyNewJobMatch(args: {
  proUserId: string;
  bookingId: string;
  bookingNumber: string;
  customerName: string;
  categoryName: string;
  addressArea: string | null;
  proPayoutPaise: number;
}): Promise<void> {
  const rupees = (args.proPayoutPaise / 100).toFixed(0);
  const locationBit = args.addressArea ? ` · ${args.addressArea}` : '';
  const copy = await resolveCopy(
    'job_new_match_pro',
    {
      categoryName: args.categoryName,
      customerName: args.customerName,
      locationBit,
      payoutRupees: rupees,
    },
    {
      title: `New job · ${args.categoryName}`,
      body: `${args.customerName}${locationBit} · ₹${rupees}`,
    },
  );
  // Reuse the 'booking_matched' enum value — semantically this IS a
  // match notification, just delivered to the pro instead of the
  // customer. Keeps the schema lean (no migration) while the in-app
  // notifications row can still be filtered by the data.type below.
  await dispatch({
    userId: args.proUserId,
    type: 'booking_matched',
    ...copy,
    data: {
      bookingId: args.bookingId,
      bookingNumber: args.bookingNumber,
      type: 'job_new_match',
      deepLink: `/job/${args.bookingId}`,
    },
    channelId: 'sevalink-alert',
    categoryIdentifier: 'job-alert',
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
  const copy = await resolveCopy(
    'payment_received',
    { amountRupees: rupees, bookingNumber: args.bookingNumber },
    {
      title: `Payment of ₹${rupees} received`,
      body: `Thank you! ${args.bookingNumber} is fully closed. Rate your expert?`,
    },
  );
  await dispatch({
    userId: args.customerId,
    type: 'payment_received',
    ...copy,
    data: { bookingId: args.bookingId, deepLink: `/booking/${args.bookingId}` },
  });
}
