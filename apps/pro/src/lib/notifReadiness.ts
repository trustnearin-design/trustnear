import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification-readiness helpers for the first-launch gate.
 *
 * For the Pro app this is CRITICAL: a new-job alert must wake the device even
 * when the app is killed, or the pro silently misses bookings. We can't flip
 * OEM battery / auto-start toggles silently (Android forbids it), but we CAN
 * request the notification permission, fire the one-tap "ignore battery
 * optimizations" dialog, and deep-link to the app's settings (auto-start).
 */

const PKG = 'in.trustnear.pro';
const DONE_KEY = 'notifGate.done.v1';

export async function getNotificationStatus(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

export async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status;
}

/** One-tap "allow this app to run in background" system dialog (Android). */
export async function requestIgnoreBatteryOptimizations(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync(
      'android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      { data: `package:${PKG}` },
    );
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
    } catch {
      /* ignore */
    }
  }
}

/** Open this app's system settings page (where OEM auto-start usually lives). */
export async function openAppSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await IntentLauncher.startActivityAsync('android.settings.APPLICATION_DETAILS_SETTINGS', {
      data: `package:${PKG}`,
    });
  } catch {
    /* ignore */
  }
}

export async function isGateDone(): Promise<boolean> {
  return (await AsyncStorage.getItem(DONE_KEY).catch(() => null)) === '1';
}

export async function markGateDone(): Promise<void> {
  await AsyncStorage.setItem(DONE_KEY, '1').catch(() => undefined);
}
