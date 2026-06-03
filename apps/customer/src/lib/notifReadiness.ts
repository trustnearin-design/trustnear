import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification-readiness helpers for the first-launch gate.
 *
 * We can't silently flip OEM battery / auto-start toggles (Android forbids
 * it), but we CAN: request the notification permission, fire the one-tap
 * "ignore battery optimizations" system dialog, and deep-link to the app's
 * settings page (where auto-start lives). This is the Swiggy/UC pattern that
 * keeps background + killed-state pushes reliable on Indian OEM phones.
 */

const PKG = 'in.trustnear.customer';
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
    // Fallback: open the full battery-optimization list.
    try {
      await IntentLauncher.startActivityAsync(
        'android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS',
      );
    } catch {
      /* ignore — device may not expose it */
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
