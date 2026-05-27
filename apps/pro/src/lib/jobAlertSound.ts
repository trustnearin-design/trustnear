import { Platform, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * The "ringing" half of an incoming-job alert — vibration loop + repeated
 * local notification so the device beeps even when the screen is on but
 * silent. The visual half lives in IncomingJobOverlay.
 *
 * Why local notifications: we don't ship a custom audio file (yet), and
 * expo-audio install is currently blocked by a pnpm/metro race. Repeated
 * `presentNotificationAsync` calls use the system sound, which is loud
 * enough to grab attention and doesn't require any new asset.
 *
 * Why a separate channel on Android: 'sevalink-booking' has IMPORTANCE_HIGH
 * but a soft default vibration. The 'sevalink-alert' channel is MAX with
 * the loud system tone and the heavy 4-pulse pattern so it actually feels
 * like a Zomato ping when the phone is in someone's pocket.
 */

// Long vibration with 4 hard pulses then a beat — loops via Vibration API.
const VIBRATION_PATTERN: number[] = [0, 500, 250, 500, 250, 500, 250, 500, 1500];

// One beep every 4s — pre-cued so the pro feels the rising urgency.
const NOTIF_REPEAT_MS = 4000;

const ALERT_CHANNEL_ID = 'sevalink-alert';
const ALERT_NOTIF_ID = 'job-alert-ringing';

let beepInterval: ReturnType<typeof setInterval> | null = null;
let channelEnsured = false;

async function ensureAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android' || channelEnsured) return;
  await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
    name: 'New job alerts',
    description: 'Loud ring + vibration when a customer assigns you a new job',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: VIBRATION_PATTERN,
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    lightColor: '#D4A24C',
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
  channelEnsured = true;
}

async function presentAlertNotif(title: string, body: string): Promise<void> {
  try {
    await ensureAlertChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: ALERT_NOTIF_ID,
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        sticky: false,
        vibrate: VIBRATION_PATTERN,
      },
      trigger: Platform.OS === 'android' ? { channelId: ALERT_CHANNEL_ID } : null,
    });
  } catch {
    // Permission denied or running in Expo Go on iOS — vibration alone
    // will still fire, which is the worst-case fallback.
  }
}

/**
 * Start the ring: continuous vibration pattern + initial beep + a beep
 * every ~4s. Safe to call multiple times — restarts cleanly.
 */
export function startJobAlertRing(title: string, body: string): void {
  stopJobAlertRing();
  Vibration.vibrate(VIBRATION_PATTERN, true);
  void presentAlertNotif(title, body);
  beepInterval = setInterval(() => {
    void presentAlertNotif(title, body);
  }, NOTIF_REPEAT_MS);
}

/**
 * Stop everything — vibration loop + future beeps + dismiss the lingering
 * notification so the tray is clean after the pro acts.
 */
export function stopJobAlertRing(): void {
  Vibration.cancel();
  if (beepInterval) {
    clearInterval(beepInterval);
    beepInterval = null;
  }
  void Notifications.dismissNotificationAsync(ALERT_NOTIF_ID).catch(() => undefined);
}
