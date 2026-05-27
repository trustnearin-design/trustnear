import '../global.css';

import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { IncomingJobOverlay } from '../src/components/IncomingJobOverlay';
import { apiFetch } from '../src/api/client';

const noop = () => undefined;
SplashScreen.preventAutoHideAsync().catch(noop);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

/**
 * Auth-aware redirect — corrects the route group whenever Expo Router
 * restores a deep URL on cold start that doesn't match the current auth
 * state. Identical strategy to the customer app.
 */
function useAuthRouteGuard(ready: boolean) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const inAppGroup = group === '(app)';

    if (isAuthed && (inAuthGroup || (!inAppGroup && !inAuthGroup))) {
      router.replace('/(app)');
    } else if (!isAuthed && (inAppGroup || (!inAuthGroup && !inAppGroup))) {
      router.replace('/(auth)/welcome');
    }
  }, [ready, isAuthed, segments, router]);
}

/**
 * Push notifications:
 *   • New job match → /(app)/job/[id] (when a customer's match request lands)
 *   • Booking update → /(app)/job/[id] (cancellation, OTP confirmation, etc)
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
        | { bookingId?: string; deepLink?: string; type?: string }
        | undefined;
      const bookingId = data?.bookingId;
      if (!bookingId) return;

      // Heads-up action buttons on a 'job-alert' category push — fire the
      // matching backend mutation directly without waiting for the user
      // to land on a screen. The default identifier means "tap on the
      // body" → open the job (foreground overlay will pick it up too if
      // the socket alert is still queued).
      const action = response.actionIdentifier;
      if (action === 'accept') {
        void apiFetch(`/bookings/${bookingId}/accept`, { method: 'POST' }).catch(() => undefined);
        router.push({ pathname: '/(app)/job/[id]', params: { id: bookingId } });
        return;
      }
      if (action === 'decline') {
        void apiFetch(`/bookings/${bookingId}/cancel`, {
          method: 'POST',
          body: { reason: 'Pro declined from notification' },
        }).catch(() => undefined);
        return;
      }
      router.push({ pathname: '/(app)/job/[id]', params: { id: bookingId } });
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
          <AuthedJobAlerts />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Renders the live job-alert overlay only when the pro is authed — when
 * they're on the (auth) stack the socket isn't connected with a JWT yet,
 * so the listener would never receive events anyway.
 */
function AuthedJobAlerts() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  if (!isAuthed) return null;
  return <IncomingJobOverlay />;
}
