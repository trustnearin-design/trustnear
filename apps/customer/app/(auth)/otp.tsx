import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSendOtp, useVerifyOtp } from '../../src/api/auth';
import { formatIndianPhone } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';

const RESEND_COOLDOWN = 30;

export default function OtpScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
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
      });
      router.replace('/(app)');
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
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          <Text className="text-3xl font-bold text-ink">Verify mobile</Text>
          <Text className="mt-2 text-base text-ink-muted">
            We sent a 6-digit code to{'\n'}
            <Text className="font-semibold text-ink">{phone ? formatIndianPhone(phone) : ''}</Text>
          </Text>

          <View className="mt-10">
            <Text className="mb-2 text-sm font-medium text-ink-muted">OTP</Text>
            <TextInput
              ref={inputRef}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
              className="rounded-card border border-border bg-surface-muted px-4 py-3 text-center text-2xl tracking-[8px] text-ink"
            />
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-sm font-medium text-ink-muted">
              Your name <Text className="text-ink-subtle">(first time only)</Text>
            </Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Vikas Jain"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              className="rounded-card border border-border bg-surface-muted px-4 py-3 text-base text-ink"
            />
          </View>

          {error && <Text className="mt-3 text-sm text-danger">{error}</Text>}

          <Pressable
            disabled={otp.length !== 6 || verifyOtp.isPending}
            onPress={onVerify}
            className={`mt-8 items-center rounded-card py-4 ${
              otp.length === 6 && !verifyOtp.isPending ? 'bg-brand' : 'bg-brand/40'
            }`}
          >
            {verifyOtp.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-ink-inverse">
                Verify &amp; continue
              </Text>
            )}
          </Pressable>

          <Pressable onPress={onResend} disabled={cooldown > 0} className="mt-6 items-center">
            <Text
              className={`text-sm ${cooldown > 0 ? 'text-ink-subtle' : 'font-semibold text-brand'}`}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
