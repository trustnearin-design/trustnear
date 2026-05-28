import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useKycStatus, useStartDigilocker, useCompleteDigilocker } from '../../src/api/kyc';
import { colors } from '../../src/theme/colors';

/**
 * Wizard step — Aadhaar via DigiLocker. Mirrors the standalone
 * (app)/kyc/aadhaar screen but stays inside the wizard chrome + advances
 * to /pan on success. Same Setu-DigiLocker hooks.
 */
export default function AadhaarWizardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const status = useKycStatus();
  const start = useStartDigilocker();
  const complete = useCompleteDigilocker();
  const [requestId, setRequestId] = useState<string | null>(null);
  const handlingRef = useRef(false);

  useEffect(() => {
    const handle = async (url: string | null) => {
      if (!url || !url.includes('/kyc/digilocker/callback') || handlingRef.current) return;
      handlingRef.current = true;
      const parsed = parseRequestId(url) ?? requestId;
      if (!parsed) {
        handlingRef.current = false;
        return;
      }
      try {
        await complete.mutateAsync(parsed);
        void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
      } finally {
        handlingRef.current = false;
      }
    };
    void Linking.getInitialURL().then(handle);
    const sub = Linking.addEventListener('url', (e) => void handle(e.url));
    return () => sub.remove();
  }, [requestId, complete, qc]);

  const verified = status.data?.aadhaarVerified ?? false;

  const onStart = async () => {
    const result = await start.mutateAsync();
    setRequestId(result.requestId);
    await Linking.openURL(result.redirectUrl);
  };

  return (
    <WizardLayout
      stepIndex={6}
      stepTotal={8}
      title="Aadhaar verification"
      subtitle="DigiLocker se sirf 30 second mein verify. Hum aapka Aadhaar number store NAHI karte — sirf last 4 digits."
      mascotVariant="kyc"
      ctaLabel={verified ? 'Continue' : 'Verify with DigiLocker'}
      onCta={() => {
        if (verified) router.push('/(onboarding)/pan' as never);
        else void onStart();
      }}
      ctaLoading={start.isPending || complete.isPending}
    >
      {/* Status card */}
      <View
        style={{
          padding: 18,
          backgroundColor: verified ? colors.brand[50] : colors.surface.DEFAULT,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: verified ? colors.success : colors.border.DEFAULT,
          marginBottom: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Ionicons
            name={verified ? 'shield-checkmark' : 'shield-outline'}
            size={24}
            color={verified ? colors.success : colors.brand[700]}
          />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink.DEFAULT }}>
            {verified ? 'Aadhaar Verified' : 'Aadhaar Pending'}
          </Text>
        </View>
        {verified && status.data ? (
          <View style={{ gap: 4 }}>
            <Text style={{ fontSize: 13, color: colors.ink.muted }}>
              Name:{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
                {status.data.aadhaarFullName}
              </Text>
            </Text>
            <Text style={{ fontSize: 13, color: colors.ink.muted }}>
              Last 4 digits:{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
                **** **** {status.data.aadhaarLastFour}
              </Text>
            </Text>
          </View>
        ) : (
          <Text style={{ fontSize: 13, color: colors.ink.muted, lineHeight: 20 }}>
            DigiLocker pe login karke aap Aadhaar share karenge. Hum SIRF naam, DOB aur last 4
            digits store karenge.
          </Text>
        )}
      </View>

      {start.isPending || complete.isPending ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ActivityIndicator color={colors.brand[700]} size="small" />
          <Text style={{ fontSize: 13, color: colors.ink.muted }}>Working on it…</Text>
        </View>
      ) : null}

      {requestId && !verified ? (
        <Pressable
          onPress={async () => {
            try {
              await complete.mutateAsync(requestId);
              void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
            } catch {
              // already handled via mutation state
            }
          }}
          style={{
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.brand[700],
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.brand[700] }}>
            I came back — finish verification
          </Text>
        </Pressable>
      ) : null}
    </WizardLayout>
  );
}

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
