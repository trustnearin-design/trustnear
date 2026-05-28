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
import { useOnboardingStatus } from '../src/api/onboarding';

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
const ONBOARDING_GROUP = '(onboarding)';
const PENDING_GROUP = '(pending)';
const APP_GROUP = '(app)';
const AUTH_GROUP = '(auth)';

/**
 * Auth + approval-aware redirect (Phase 3g). On every segment change,
 * routes the user into the correct group based on their state:
 *   not authed                    -> (auth)
 *   authed + draft/rejected       -> (onboarding)   wizard
 *   authed + submitted_for_review -> (pending)      locked "under review"
 *   authed + approved             -> (app)          full tabs
 *
 * Status comes from /pros/me/onboarding/status, cached by
 * useOnboardingStatus. While that's loading on cold start we hold the
 * current screen rather than bouncing -- flicker-free.
 */
function useAuthRouteGuard(ready: boolean) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const segments = useSegments();
  const router = useRouter();
  const onboarding = useOnboardingStatus();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];

    if (!isAuthed) {
      if (group !== AUTH_GROUP) router.replace('/(auth)/welcome');
      return;
    }

    // Wait for status to load on cold start so we don't flash tabs
    // before the wizard kicks in for a draft pro.
    if (onboarding.isLoading && !onboarding.data) return;

    const status = onboarding.data?.approvalStatus ?? 'draft';
    const target =
      status === 'approved'
        ? APP_GROUP
        : status === 'submitted_for_review'
          ? PENDING_GROUP
          : ONBOARDING_GROUP; // draft + rejected + all intermediate states

    if (group !== target) {
      const path =
        target === APP_GROUP
          ? '/(app)'
          : target === PENDING_GROUP
            ? '/(pending)'
            : '/(onboarding)/welcome';
      router.replace(path);
    }
  }, [ready, isAuthed, segments, router, onboarding.isLoading, onboarding.data]);
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

      // Phase 3g — approval / rejection pushes: no bookingId, just route.
      // The auth route guard will pull the fresh status from /onboarding/status
      // on next mount, so we just navigate to the right group and let it
      // sort out the exact screen. We DON'T need to invalidate cache here;
      // the guard's useOnboardingStatus refetches on focus.
      if (data?.type === 'pro_approved') {
        router.replace('/(app)' as never);
        return;
      }
      if (data?.type === 'pro_rejected') {
        router.replace('/(onboarding)/welcome' as never);
        return;
      }

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
  // NOTE: useAuthRouteGuard moved INSIDE the QueryClientProvider tree (see
  // <NavigationGuards />) — it now uses useOnboardingStatus (a TanStack
  // query) which needs the QueryClient context to mount.
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
          <NavigationGuards ready={ready && fontsLoaded} />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(pending)" />
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

/**
 * Mounted INSIDE QueryClientProvider so the auth/onboarding guard can use
 * TanStack hooks. Returns null — it's a pure side-effect component.
 */
function NavigationGuards({ ready }: { ready: boolean }) {
  useAuthRouteGuard(ready);
  return null;
}
