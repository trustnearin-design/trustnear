import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCompleteDigilocker, useStartDigilocker, useKycStatus } from '../../../src/api/kyc';
import { PremiumButton } from '../../../src/components/PremiumButton';
import { colors } from '../../../src/theme/colors';
import { ApiCallError } from '../../../src/api/client';

/**
 * Aadhaar verification via DigiLocker — user-consented flow.
 *
 *   1. Tap "Verify with DigiLocker" → backend creates a Setu session,
 *      returns the hosted DigiLocker OAuth URL.
 *   2. We open the URL in the system browser via Linking.openURL.
 *   3. User logs into DigiLocker (their phone + OTP), grants TrustNear
 *      permission to fetch their Aadhaar.
 *   4. DigiLocker redirects to `trustnearpro://kyc/digilocker/callback?id=...`.
 *      Android brings the Pro app back; our root layout's deep-link handler
 *      isn't enough — we mount an explicit Linking listener here too so the
 *      complete call fires while the user is on this screen.
 *   5. On returning to the app via the deep link, auto-call /complete with
 *      the requestId. Backend verifies signature + extracts Aadhaar data.
 *
 * If the user backgrounds the app without finishing DigiLocker, we just
 * stay on this screen with the "complete" button still available — they
 * can retry without re-issuing a session.
 */

export default function AadhaarKycScreen() {
  const router = useRouter();
  const status = useKycStatus();
  const start = useStartDigilocker();
  const complete = useCompleteDigilocker();
  const [requestId, setRequestId] = useState<string | null>(null);
  const handlingRef = useRef(false);

  // Deep-link listener — fires when DigiLocker redirects back to the app.
  // We pull `id` (or `requestId`) out of the callback URL and complete.
  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url) return;
      if (!url.includes('/kyc/digilocker/callback')) return;
      if (handlingRef.current) return;
      handlingRef.current = true;

      const parsed = parseRequestId(url) ?? requestId;
      if (!parsed) {
        handlingRef.current = false;
        return;
      }
      try {
        const res = await complete.mutateAsync(parsed);
        Alert.alert(
          'Aadhaar verified',
          `Welcome ${res.fullName ?? 'pro'}! Your Aadhaar (XXXX-XXXX-${res.lastFour ?? '____'}) is now linked.`,
          [{ text: 'Done', onPress: () => router.replace('/(app)/kyc') }],
        );
      } catch (e) {
        Alert.alert(
          'Verification failed',
          e instanceof ApiCallError ? e.message : 'Try again in a moment.',
        );
      } finally {
        handlingRef.current = false;
      }
    };

    void Linking.getInitialURL().then((url) => {
      void handle(url);
    });
    const sub = Linking.addEventListener('url', (event) => {
      void handle(event.url);
    });
    return () => sub.remove();
  }, [complete, requestId, router]);

  const handleStart = async () => {
    try {
      const res = await start.mutateAsync();
      setRequestId(res.requestId);
      await Linking.openURL(res.redirectUrl);
    } catch (e) {
      Alert.alert(
        "Couldn't start",
        e instanceof ApiCallError
          ? e.message
          : 'Setu DigiLocker is unreachable. Try again in a moment.',
      );
    }
  };

  const verified = status.data?.aadhaarVerified ?? false;

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <View className="bg-brand-800" style={{ paddingBottom: 32 }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text
              className="ml-3 text-[11px] font-bold uppercase tracking-[2px]"
              style={{ color: colors.accent[200] }}
            >
              Aadhaar verification
            </Text>
          </View>
          <View className="px-5 pt-5">
            <Text className="text-[26px] font-bold text-ink-inverse">
              {verified ? "You're verified" : 'Verify your Aadhaar'}
            </Text>
            <Text className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Powered by DigiLocker — Govt of India&apos;s official document wallet
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="flex-1 px-5 pt-6">
        {verified ? (
          <View className="rounded-card border border-success/30 bg-success/5 p-5">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text className="ml-2 text-[15px] font-bold text-success">Aadhaar verified</Text>
            </View>
            {status.data?.aadhaarFullName ? (
              <Text className="mt-2 text-[13px] text-ink">Name: {status.data.aadhaarFullName}</Text>
            ) : null}
            {status.data?.aadhaarLastFour ? (
              <Text className="mt-1 text-[13px] text-ink">
                Aadhaar: XXXX-XXXX-{status.data.aadhaarLastFour}
              </Text>
            ) : null}
            {status.data?.aadhaarDob ? (
              <Text className="mt-1 text-[13px] text-ink">DOB: {status.data.aadhaarDob}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <InfoRow
              icon="lock-closed"
              text="Your Aadhaar number is never stored — only last 4 digits + verified name and photo."
            />
            <InfoRow
              icon="ribbon"
              text="DigiLocker is run by the Govt of India. TrustNear never sees your password."
            />
            <InfoRow
              icon="time"
              text="Takes 2 minutes. Keep your Aadhaar-linked phone handy for the OTP."
            />

            <View className="mt-auto mb-6">
              <PremiumButton
                label={start.isPending ? 'Opening DigiLocker…' : 'Verify with DigiLocker'}
                onPress={() => void handleStart()}
                loading={start.isPending || complete.isPending}
                variant="brand"
                icon="open-outline"
              />
              {complete.isPending ? (
                <View className="mt-3 flex-row items-center justify-center">
                  <ActivityIndicator color={colors.brand.DEFAULT} size="small" />
                  <Text className="ml-2 text-[12px] text-ink-muted">
                    Fetching your Aadhaar from DigiLocker…
                  </Text>
                </View>
              ) : null}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function InfoRow({
  icon,
  text,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
}) {
  return (
    <View className="mb-3 flex-row items-start rounded-card bg-surface p-3.5">
      <Ionicons name={icon} size={18} color={colors.brand.DEFAULT} style={{ marginTop: 2 }} />
      <Text className="ml-2 flex-1 text-[13px] text-ink">{text}</Text>
    </View>
  );
}

/**
 * Pull the request id from the DigiLocker callback URL. Setu varies — it
 * sometimes uses `id`, sometimes `requestId`, sometimes path segment.
 */
function parseRequestId(url: string): string | null {
  try {
    const u = new URL(url);
    return (
      u.searchParams.get('id') ??
      u.searchParams.get('requestId') ??
      u.searchParams.get('request_id') ??
      null
    );
  } catch {
    return null;
  }
}
