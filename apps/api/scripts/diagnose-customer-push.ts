import { Expo } from 'expo-server-sdk';
import { prisma } from '@sevalink/db';

/**
 * End-to-end customer push diagnostic.
 *
 *   pnpm --filter @sevalink/api exec tsx scripts/diagnose-customer-push.ts +9198XXXXXXXX
 *
 * Pins down WHY a customer isn't getting notifications:
 *   1. No deviceToken in DB → app never registered (Expo Go, denied perms,
 *      or registerPushTokenWithBackend never ran). Fix is client-side.
 *   2. Token present but Expo ticket = error → bad/expired token.
 *   3. Ticket ok but receipt = error (e.g. MismatchSenderId / InvalidCredentials)
 *      → the CUSTOMER Expo project's FCM V1 credentials are missing/wrong.
 *      Fix: `eas credentials` for the customer app (separate from pro).
 *   4. Ticket + receipt ok but phone shows nothing → channel/permission on
 *      the device, or app was force-stopped.
 */

const phone = process.argv[2];
if (!phone) {
  console.error('Usage: tsx scripts/diagnose-customer-push.ts <phone e.g. +919876500020>');
  process.exit(1);
}

const user = await prisma.user.findFirst({
  where: { phone },
  select: { id: true, fullName: true, role: true, deviceToken: true },
});

if (!user) {
  console.error(`No user with phone ${phone}`);
  process.exit(1);
}

console.log('User:', { id: user.id, name: user.fullName, role: user.role });
console.log('deviceToken:', user.deviceToken ?? '(none)');

if (!user.deviceToken) {
  console.log('\n❌ DIAGNOSIS: No push token stored. The app never registered one.');
  console.log('   → Confirm the user is on a real device (not Expo Go), granted');
  console.log('     notification permission, and that registerPushTokenWithBackend()');
  console.log('     ran after login. Check the app logs for "[push]" lines.');
  process.exit(0);
}

if (!Expo.isExpoPushToken(user.deviceToken)) {
  console.log('\n❌ DIAGNOSIS: Stored value is not a valid Expo push token.');
  process.exit(0);
}

const expo = new Expo();
console.log('\nSending test push on channel "sevalink-booking"…');
const tickets = await expo.sendPushNotificationsAsync([
  {
    to: user.deviceToken,
    title: 'Your service has started',
    body: 'TrustNear push diagnostic — if you see this, customer delivery works ✅',
    sound: 'default',
    priority: 'high',
    channelId: 'sevalink-booking',
    data: { diagnostic: 'true' },
  },
]);
console.log('Tickets:', JSON.stringify(tickets, null, 2));

const okIds = tickets
  .filter((t): t is Expo.PushTicketSuccess => t.status === 'ok')
  .map((t) => t.id);

if (okIds.length === 0) {
  console.log('\n❌ DIAGNOSIS: Expo rejected the send at ticket stage (see error above).');
  process.exit(0);
}

console.log('\nWaiting 15s for Expo to attempt delivery, then fetching receipts…');
await new Promise((r) => setTimeout(r, 15_000));
const receipts = await expo.getPushNotificationReceiptsAsync(okIds);
console.log('Receipts:', JSON.stringify(receipts, null, 2));

const anyError = Object.values(receipts).some((r) => r.status === 'error');
if (anyError) {
  console.log('\n❌ DIAGNOSIS: Delivery failed at the receipt stage.');
  console.log('   If error is MismatchSenderId / InvalidCredentials → the CUSTOMER app');
  console.log('   Expo project is missing FCM V1 credentials. Run `eas credentials`');
  console.log('   for apps/customer and upload the FCM V1 service-account key.');
} else {
  console.log('\n✅ DIAGNOSIS: Expo accepted + delivered. If the phone still shows nothing,');
  console.log('   check device notification settings / that the app was not force-stopped.');
}
process.exit(0);
