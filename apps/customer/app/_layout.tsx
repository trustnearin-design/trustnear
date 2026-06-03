import '../global.css';

import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { bootstrapAuth, useAuthStore } from '../src/stores/auth';
import { registerPushTokenWithBackend } from '../src/lib/notifications';
import { isDeferrablePath, setPendingRedirect } from '../src/lib/pendingRedirect';

const noop = () => undefined;
SplashScreen.preventAutoHideAsync().catch(noop);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

/**
 * Auth-aware redirect that runs after bootstrap completes. Expo Router
 * may restore the last visited URL on cold start, bypassing index.tsx —
 * this guard re-evaluates auth state and corrects the route group.
 */
function useAuthRouteGuard(ready: boolean) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const inAppGroup = group === '(app)';

    if (isAuthed && (inAuthGroup || (!inAppGroup && !inAuthGroup))) {
      router.replace('/(app)');
    } else if (!isAuthed && (inAppGroup || (!inAuthGroup && !inAppGroup))) {
      // A deep link (e.g. a shared /pro/<id>) opened an authed-only screen
      // while logged out — remember it so login can land the user there.
      if (inAppGroup && isDeferrablePath(pathname)) {
        setPendingRedirect(pathname);
      }
      router.replace('/(auth)/welcome');
    }
  }, [ready, isAuthed, segments, pathname, router]);
}

/**
 * Push notification side effects:
 *   • Register the device's Expo push token with the backend whenever we
 *     transition into the authed state (covers login + cold-start-with-
 *     hydrated-auth). Idempotent on the backend.
 *   • If the user kills the app and re-opens via a notification tap,
 *     `getLastNotificationResponseAsync` returns it on mount — read it
 *     once and deep-link to the booking detail.
 *   • While running, `addNotificationResponseReceivedListener` fires on
 *     every tap.
 */
function usePushNotifications(ready: boolean): void {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const router = useRouter();

  useEffect(() => {
    if (!ready || !isAuthed) return;
    void registerPushTokenWithBackend();
  }, [ready, isAuthed]);

  useEffect(() => {
    if (!ready) return;
    const handle = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as
        | { bookingId?: string; deepLink?: string }
        | undefined;
      if (data?.bookingId) {
        router.push({ pathname: '/(app)/booking/[id]', params: { id: data.bookingId } });
      }
    };
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handle(r);
    });
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [ready, router]);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  useAuthRouteGuard(ready && fontsLoaded);
  usePushNotifications(ready && fontsLoaded);

  useEffect(() => {
    if (fontsLoaded) {
      const TextWithDefaults = Text as unknown as { defaultProps?: { style?: object } };
      TextWithDefaults.defaultProps = TextWithDefaults.defaultProps ?? {};
      TextWithDefaults.defaultProps.style = [
        TextWithDefaults.defaultProps.style ?? {},
        { fontFamily: 'PlusJakartaSans_500Medium', color: '#1A1226' },
      ];
    }
  }, [fontsLoaded]);

  useEffect(() => {
    bootstrapAuth()
      .catch(noop)
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(noop);
      });
  }, []);

  if (!ready || !fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
