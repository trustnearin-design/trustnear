import { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSendOtp } from '../../src/api/auth';
import { toE164 } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';
import { BrandHero, CoralButton, MascotImage, ProgressDots } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

/**
 * D6 pro phone screen — Sevak greeter in plum hero, progress dots showing
 * step 1 of 5 (phone → otp → category → service area → KYC), coral CTA.
 */
export default function PhoneScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sendOtp = useSendOtp();

  const valid = /^[6-9]\d{9}$/.test(digits);

  const onContinue = async () => {
    setError(null);
    const phone = toE164(digits);
    if (!phone) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    try {
      await sendOtp.mutateAsync(phone);
      router.push({ pathname: '/(auth)/otp', params: { phone } });
    } catch (e) {
      if (e instanceof ApiCallError) setError(e.message);
      else setError('Something went wrong. Try again.');
    }
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />

      <BrandHero
        bottomGap={32}
        rightSlot={
          <View style={{ paddingHorizontal: 4 }}>
            <ProgressDots total={5} activeIndex={0} inverse />
          </View>
        }
      >
        <View style={{ alignItems: 'center', paddingTop: 8 }}>
          <MascotImage variant="greeter" tone="butter" size={140} />
          <Text className="mt-4 font-display text-h1 text-ink-inverse">
            Welcome to TrustNear Pro
          </Text>
          <Text
            className="mt-2 text-body text-center"
            style={{ color: colors.brand[200], maxWidth: 320 }}
          >
            Earn on your terms. Pehle aapka mobile verify karein.
          </Text>
        </View>
      </BrandHero>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, marginTop: -24 }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: colors.surface.muted,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
          }}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 28, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text className="font-display text-h2 text-ink">Enter your mobile number</Text>
            <Text className="mt-2 text-body text-ink-muted">
              We&apos;ll send a 6-digit code to verify it&apos;s really you.
            </Text>

            <View className="mt-7">
              <Text className="mb-2 text-overline uppercase text-ink-subtle">Mobile number</Text>
              <View
                className={`flex-row items-center rounded-card border-2 px-4 py-3.5 ${
                  focused ? 'border-accent bg-surface' : 'border-border bg-surface'
                }`}
              >
                <Text className="text-bodyLg" style={{ fontWeight: '700' }}>
                  🇮🇳
                </Text>
                <Text className="ml-2 mr-3 text-bodyLg font-display text-ink">+91</Text>
                <View style={{ height: 22, width: 1, backgroundColor: colors.border.strong }} />
                <TextInput
                  value={digits}
                  onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.ink.subtle}
                  keyboardType="number-pad"
                  maxLength={10}
                  className="ml-3 flex-1 text-bodyLg text-ink"
                  style={{ fontWeight: '600' }}
                  autoFocus
                />
              </View>
              {error ? (
                <View className="mt-2 flex-row items-center">
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text className="ml-1.5 text-small font-display text-danger">{error}</Text>
                </View>
              ) : null}
            </View>

            <View className="mt-7">
              <CoralButton
                label="Send OTP"
                onPress={onContinue}
                disabled={!valid}
                loading={sendOtp.isPending}
              />
            </View>

            <Text className="mt-5 text-center text-small text-ink-subtle">
              By continuing you agree to{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.muted }}>Pro Terms</Text> and{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.muted }}>Privacy Policy</Text>.
            </Text>

            <View
              className="mt-8 flex-row items-stretch rounded-card border bg-surface px-2 py-4"
              style={{ borderColor: colors.border.DEFAULT }}
            >
              <ProChip icon="cash-outline" label="Weekly" sub="Payouts" />
              <View
                style={{ width: 1, backgroundColor: colors.border.DEFAULT, marginVertical: 6 }}
              />
              <ProChip icon="calendar-outline" label="Flexible" sub="Schedule" />
              <View
                style={{ width: 1, backgroundColor: colors.border.DEFAULT, marginVertical: 6 }}
              />
              <ProChip icon="people-outline" label="Verified" sub="Customers" />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function ProChip({
  icon,
  label,
  sub,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sub: string;
}) {
  return (
    <View className="flex-1 items-center justify-center">
      <View
        style={{
          height: 38,
          width: 38,
          borderRadius: 19,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.accent[100],
        }}
      >
        <Ionicons name={icon} size={19} color={colors.accent[700]} />
      </View>
      <Text className="mt-2 text-small font-display text-ink">{label}</Text>
      <Text className="text-caption text-ink-subtle">{sub}</Text>
    </View>
  );
}
