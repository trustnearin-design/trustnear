import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiFetch, ApiCallError } from '../api/client';

/**
 * Push notification glue.
 *
 *   • registerPushTokenWithBackend()  — call once after auth bootstrap.
 *     Asks for permission, gets the Expo push token, POSTs to backend.
 *     Idempotent: backend overwrites the same user's old token, so calling
 *     on every cold start is fine.
 *
 *   • unregisterPushTokenFromBackend() — call on logout. Best-effort.
 *
 * Foreground display behavior is set globally so notifications still pop
 * a banner when the user has the app open (default RN behavior swallows
 * them otherwise).
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('sevalink-booking', {
    name: 'Booking updates',
    description: 'Live status of your TrustNear bookings + payment confirmations',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 100, 200],
    lightColor: '#FF7A1A',
  });
  // Loud channel for the Zomato-style new-job ring. Mirrors the channel
  // jobAlertSound.ts lazily creates so background pushes route here too —
  // registering eagerly means the channel exists even before the pro has
  // received their first foreground alert.
  await Notifications.setNotificationChannelAsync('sevalink-alert', {
    name: 'New job alerts',
    description: 'Loud ring + vibration when a customer assigns you a new job',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500, 250, 500, 250, 500, 1500],
    sound: 'default',
    enableVibrate: true,
    enableLights: true,
    lightColor: '#D4A24C',
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Register the 'job-alert' notification category so background pushes
 * carry Accept / Decline action buttons in the heads-up notification.
 * Idempotent — setNotificationCategoryAsync overwrites by identifier.
 */
async function ensureJobAlertCategory(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('job-alert', [
    {
      identifier: 'accept',
      buttonTitle: 'Accept',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'decline',
      buttonTitle: 'Decline',
      options: {
        opensAppToForeground: false,
        // Destructive styling on iOS — gives the visual red affordance.
        isDestructive: true,
      },
    },
  ]);
}

/**
 * Try to register this device for push. Resolves whether or not a token
 * was actually obtained — callers shouldn't gate UX on this. Failures are
 * logged but never thrown.
 */
export async function registerPushTokenWithBackend(): Promise<{ ok: boolean; reason?: string }> {
  // eslint-disable-next-line no-console
  console.log('[push] registerPushTokenWithBackend: start', { isDevice: Device.isDevice });
  if (!Device.isDevice) {
    return { ok: false, reason: 'simulator' };
  }
  try {
    await ensureAndroidChannel();
    await ensureJobAlertCategory();

    const { status: existing } = await Notifications.getPermissionsAsync();
    // eslint-disable-next-line no-console
    console.log('[push] existing permission status:', existing);
    let granted = existing === 'granted';
    if (!granted) {
      const { status } = await Notifications.requestPermissionsAsync();
      // eslint-disable-next-line no-console
      console.log('[push] requested permission status:', status);
      granted = status === 'granted';
    }
    if (!granted) {
      // eslint-disable-next-line no-console
      console.log('[push] permission denied, abort');
      return { ok: false, reason: 'permission_denied' };
    }

    // Expo's project ID must be passed explicitly in EAS Build /
    // dev-client builds — Expo Go would auto-resolve it, but standalone
    // builds need it.
    const projectId =
      (Constants.expoConfig?.extra?.['eas'] as { projectId?: string } | undefined)?.projectId ??
      Constants.easConfig?.projectId;
    // eslint-disable-next-line no-console
    console.log('[push] using projectId:', projectId);
    const tokenRes = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    // eslint-disable-next-line no-console
    console.log('[push] got token:', tokenRes.data.slice(0, 40) + '...');

    await apiFetch('/notifications/push-token', {
      method: 'POST',
      body: { token: tokenRes.data },
    });
    // eslint-disable-next-line no-console
    console.log('[push] registered with backend OK');
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('[push] failed:', err instanceof Error ? err.message : String(err));
    if (err instanceof ApiCallError) {
      return { ok: false, reason: `api_${err.code}` };
    }
    return { ok: false, reason: err instanceof Error ? err.message : 'unknown' };
  }
}

/**
 * Tell the backend to drop our push token. Call on logout. Failures are
 * swallowed — token will eventually be cleaned up on next login from
 * a different device or via DeviceNotRegistered errors from Expo.
 */
export async function unregisterPushTokenFromBackend(): Promise<void> {
  try {
    await apiFetch('/notifications/push-token', { method: 'DELETE' });
  } catch {
    // ignore
  }
}
