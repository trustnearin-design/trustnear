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
 * D2 phone screen — Sevak greeter in a plum hero, ProgressDots showing
 * step 1 of 4 (phone → otp → profile → location), country code + digits
 * input, CoralButton CTA. Trust strip lives below the input.
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Plum gradient hero with Sevak greeter centered */}
          <BrandHero
            bottomGap={32}
            rightSlot={
              <View style={{ paddingHorizontal: 4 }}>
                <ProgressDots total={4} activeIndex={0} inverse />
              </View>
            }
          >
            <View style={{ alignItems: 'center', paddingTop: 8 }}>
              <MascotImage variant="greeter" tone="butter" size={120} />
              <Text className="mt-4 font-display text-h1 text-ink-inverse">
                Welcome to TrustNear
              </Text>
              <Text
                className="mt-2 text-body text-center"
                style={{ color: colors.brand[200], maxWidth: 320 }}
              >
                Aapke ghar, premium service. Pehle aapka mobile verify karein.
              </Text>
            </View>
          </BrandHero>

          {/* Form sheet — floats above hero with rounded top */}
          <View
            style={{
              marginTop: -24,
              backgroundColor: colors.surface.muted,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              paddingHorizontal: 22,
              paddingTop: 24,
            }}
          >
            <Text className="font-display text-h2 text-ink">Enter your mobile number</Text>
            <Text className="mt-2 text-body text-ink-muted">
              We&apos;ll send a 6-digit code to verify it&apos;s really you.
            </Text>

            <View className="mt-6">
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
                <View
                  style={{
                    height: 22,
                    width: 1,
                    backgroundColor: colors.border.strong,
                  }}
                />
                <TextInput
                  value={digits}
                  onChangeText={(t) => {
                    let d = t.replace(/\D/g, '');
                    if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
                    setDigits(d.slice(0, 10));
                  }}
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

            <View className="mt-6">
              <CoralButton
                label="Send OTP"
                onPress={onContinue}
                disabled={!valid}
                loading={sendOtp.isPending}
              />
            </View>

            <Text className="mt-5 text-center text-small text-ink-subtle">
              By continuing you agree to{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.muted }}>Terms</Text> and{' '}
              <Text style={{ fontWeight: '700', color: colors.ink.muted }}>Privacy Policy</Text>.
            </Text>

            {/* Trust strip */}
            <View
              className="mt-8 flex-row items-stretch rounded-card border bg-surface px-2 py-4"
              style={{ borderColor: colors.border.DEFAULT }}
            >
              <TrustChip icon="shield-checkmark" label="Aadhaar" sub="Verified" />
              <View
                style={{ width: 1, backgroundColor: colors.border.DEFAULT, marginVertical: 6 }}
              />
              <TrustChip icon="ribbon" label="Background" sub="Checked" />
              <View
                style={{ width: 1, backgroundColor: colors.border.DEFAULT, marginVertical: 6 }}
              />
              <TrustChip icon="time" label="~30 min" sub="Avg arrival" />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TrustChip({
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
