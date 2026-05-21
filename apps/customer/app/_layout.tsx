import '../global.css';

import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { bootstrapAuth, useAuthStore } from '../src/stores/auth';

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
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuthGroup = group === '(auth)';
    const inAppGroup = group === '(app)';

    if (isAuthed && (inAuthGroup || (!inAppGroup && !inAuthGroup))) {
      router.replace('/(app)');
    } else if (!isAuthed && (inAppGroup || (!inAuthGroup && !inAppGroup))) {
      router.replace('/(auth)/phone');
    }
  }, [ready, isAuthed, segments, router]);
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useAuthRouteGuard(ready);

  useEffect(() => {
    bootstrapAuth()
      .catch(noop)
      .finally(() => {
        setReady(true);
        SplashScreen.hideAsync().catch(noop);
      });
  }, []);

  if (!ready) return null;

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
