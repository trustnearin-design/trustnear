import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSendOtp, useVerifyOtp } from '../../src/api/auth';
import { formatIndianPhone } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';
import { consumePendingRedirect } from '../../src/lib/pendingRedirect';
import {
  BrandHero,
  CoralButton,
  KeyboardAwareScrollView,
  MascotImage,
  ProgressDots,
} from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

const RESEND_COOLDOWN = 30;

/**
 * D2 OTP screen — Sevak verifier in a plum hero, 6-cell OTP grid driven
 * by a hidden TextInput, optional name (only collected for first-time
 * signups since the API conditionally creates a User on first verify).
 *
 * Progress: step 2/4 (phone done, otp now, profile/location after).
 */
export default function OtpScreen() {
  const router = useRouter();
  const { phone, referralCode } = useLocalSearchParams<{
    phone: string;
    referralCode?: string;
  }>();
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const inputRef = useRef<TextInput>(null);
  const verifyOtp = useVerifyOtp();
  const sendOtp = useSendOtp();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const onVerify = async () => {
    setError(null);
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }
    if (!phone) {
      setError('Missing phone. Go back and try again.');
      return;
    }
    try {
      await verifyOtp.mutateAsync({
        phone,
        otp,
        ...(fullName.trim() ? { fullName: fullName.trim() } : {}),
        ...(referralCode?.trim() ? { referralCode: referralCode.trim() } : {}),
      });
      // If a shared deep link brought them here, land on that screen.
      // Otherwise route through the location step (it self-skips for users
      // who already have a saved city).
      const target = consumePendingRedirect();
      router.replace((target ?? '/(app)/location-setup') as never);
    } catch (e) {
      if (e instanceof ApiCallError) setError(e.message);
      else setError('Something went wrong. Try again.');
    }
  };

  const onResend = async () => {
    if (cooldown > 0 || !phone) return;
    setError(null);
    try {
      await sendOtp.mutateAsync(phone);
      setCooldown(RESEND_COOLDOWN);
      setOtp('');
      inputRef.current?.focus();
    } catch (e) {
      if (e instanceof ApiCallError) setError(e.message);
      else setError('Could not resend OTP. Try again.');
    }
  };

  const digits = otp.padEnd(6, ' ').split('');

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
      >
        <BrandHero
          onBack={() => router.back()}
          bottomGap={28}
          rightSlot={
            <View style={{ paddingHorizontal: 4 }}>
              <ProgressDots total={4} activeIndex={1} inverse />
            </View>
          }
        >
          <View style={{ alignItems: 'center', paddingTop: 4 }}>
            <MascotImage variant="verifier" tone="coral" size={120} />
            <Text className="mt-3 font-display text-h2 text-ink-inverse">Almost there!</Text>
            <Text className="mt-1.5 text-body text-center" style={{ color: colors.brand[200] }}>
              6-digit code sent to{' '}
              <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
                {phone ? formatIndianPhone(phone) : ''}
              </Text>
            </Text>
          </View>
        </BrandHero>

        <View
          style={{
            marginTop: -24,
            backgroundColor: colors.surface.muted,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 22,
            paddingTop: 28,
          }}
        >
          {/* OTP boxes */}
          <Text className="mb-3 text-overline uppercase text-ink-subtle">Enter OTP</Text>
          <Pressable onPress={() => inputRef.current?.focus()} className="flex-row justify-between">
            {digits.map((d, idx) => {
              const filled = d.trim().length > 0;
              const isCursor = otpFocused && idx === otp.length;
              const borderColor = isCursor
                ? colors.accent.DEFAULT
                : filled
                  ? colors.brand[700]
                  : colors.border.DEFAULT;
              return (
                <View
                  key={idx}
                  style={{
                    width: 48,
                    height: 60,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor,
                    backgroundColor: filled ? colors.surface.DEFAULT : colors.surface.DEFAULT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: filled ? colors.brand[800] : 'transparent',
                    shadowOpacity: filled ? 0.06 : 0,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  <Text className="font-display text-h2 text-ink">{d.trim()}</Text>
                </View>
              );
            })}
          </Pressable>
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
            onFocus={() => setOtpFocused(true)}
            onBlur={() => setOtpFocused(false)}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            style={{
              position: 'absolute',
              opacity: 0,
              height: 60,
              width: '100%',
              top: 36,
            }}
          />

          {/* Optional name (first-time only) */}
          <View className="mt-7">
            <Text className="mb-2 text-overline uppercase text-ink-subtle">
              Your name{' '}
              <Text style={{ textTransform: 'none', letterSpacing: 0, color: colors.ink.subtle }}>
                (first time only)
              </Text>
            </Text>
            <View
              className={`rounded-card border-2 px-4 py-3.5 ${
                nameFocused ? 'border-accent bg-surface' : 'border-border bg-surface'
              }`}
            >
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder="Vikas Jain"
                placeholderTextColor={colors.ink.subtle}
                autoCapitalize="words"
                className="text-bodyLg text-ink"
                style={{ fontWeight: '600' }}
              />
            </View>
          </View>

          {error ? (
            <View className="mt-3 flex-row items-center">
              <Ionicons name="alert-circle" size={14} color={colors.danger} />
              <Text className="ml-1.5 text-small font-display text-danger">{error}</Text>
            </View>
          ) : null}

          <View className="mt-6">
            <CoralButton
              label="Verify & continue"
              onPress={onVerify}
              disabled={otp.length !== 6}
              loading={verifyOtp.isPending}
            />
          </View>

          <Pressable onPress={onResend} disabled={cooldown > 0} className="mt-6 items-center">
            <Text
              className="text-small font-display"
              style={{ color: cooldown > 0 ? colors.ink.subtle : colors.brand[700] }}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
