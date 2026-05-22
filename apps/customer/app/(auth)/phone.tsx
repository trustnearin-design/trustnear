import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSendOtp } from '../../src/api/auth';
import { toE164 } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';

export default function PhoneScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState('');
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
    <SafeAreaView className="flex-1 bg-surface">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 pt-12">
          <Text className="text-3xl font-bold text-ink">Welcome to TrustNear</Text>
          <Text className="mt-2 text-base text-ink-muted">
            Verified pros for every home service. Enter your mobile to continue.
          </Text>

          <View className="mt-10">
            <Text className="mb-2 text-sm font-medium text-ink-muted">Mobile number</Text>
            <View className="flex-row items-center rounded-card border border-border bg-surface-muted px-4 py-3">
              <Text className="mr-2 text-base text-ink">+91</Text>
              <TextInput
                value={digits}
                onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
                placeholder="98765 43210"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={10}
                className="flex-1 text-base text-ink"
                autoFocus
              />
            </View>
            {error && <Text className="mt-2 text-sm text-danger">{error}</Text>}
          </View>

          <Pressable
            disabled={!valid || sendOtp.isPending}
            onPress={onContinue}
            className={`mt-8 items-center rounded-card py-4 ${
              valid && !sendOtp.isPending ? 'bg-brand' : 'bg-brand/40'
            }`}
          >
            {sendOtp.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-ink-inverse">Send OTP</Text>
            )}
          </Pressable>

          <Text className="mt-6 text-center text-xs text-ink-subtle">
            By continuing you agree to TrustNear&apos;s Terms &amp; Privacy Policy.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
