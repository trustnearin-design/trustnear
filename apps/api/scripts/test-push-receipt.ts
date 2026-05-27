import { Expo } from 'expo-server-sdk';

const TOKEN = 'ExponentPushToken[C8LPNyGaWaZFPT0lJk2r0x]';
const expo = new Expo();

console.log('Sending push to', TOKEN);
const tickets = await expo.sendPushNotificationsAsync([
  {
    to: TOKEN,
    title: '🔔 Direct push test',
    body: 'If you see this, FCM delivery works',
    sound: 'default',
    priority: 'high',
    channelId: 'sevalink-alert',
  },
]);

console.log('Tickets:', JSON.stringify(tickets, null, 2));

const ticketIds = tickets
  .filter((t): t is Expo.PushTicketSuccess => t.status === 'ok')
  .map((t) => t.id);

if (ticketIds.length === 0) {
  console.log('No success tickets — receipts skipped');
  process.exit(0);
}

console.log('\nWaiting 15s before fetching receipts (Expo needs delivery attempt time)...');
await new Promise((r) => setTimeout(r, 15000));

const receipts = await expo.getPushNotificationReceiptsAsync(ticketIds);
console.log('\nReceipts:', JSON.stringify(receipts, null, 2));
process.exit(0);
