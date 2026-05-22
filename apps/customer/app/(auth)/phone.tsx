import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSendOtp } from '../../src/api/auth';
import { toE164 } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';
import { BrandLockup } from '../../src/components/BrandLockup';
import { colors } from '../../src/theme/colors';

/**
 * Hero background — iconic Jaipur architecture at golden hour.
 * Localised to TrustNear's launch city, ties brand to a real place.
 * Swap to other state hero shots when we add more cities later.
 *
 * Why a remote URL: skip bundling 300KB+ photo into the APK during
 * iteration; promote to local asset before production.
 */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=1200&q=80&auto=format&fit=crop';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.46);

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
    <View className="flex-1 bg-surface">
      <StatusBar style="light" />

      {/* Hero — Jaipur sunset photography + stacked overlays + brand lockup.
          Stacked semi-transparent layers simulate a gradient without
          requiring the expo-linear-gradient native module (so this
          works on hot-reload, no rebuild needed). */}
      <ImageBackground
        source={{ uri: HERO_IMAGE }}
        style={{ height: HERO_HEIGHT }}
        resizeMode="cover"
      >
        {/* Uniform tint — keeps photo readable across content variations */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,31,58,0.32)',
          }}
        />
        {/* Bottom-weighted dark fade in 4 bands so the wordmark + form edge stay legible */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: HERO_HEIGHT * 0.6,
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(11,31,58,0.0)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(11,31,58,0.25)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(11,31,58,0.55)' }} />
          <View style={{ flex: 1, backgroundColor: 'rgba(11,31,58,0.82)' }} />
        </View>
        <SafeAreaView edges={['top']} style={{ flex: 1 }}>
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingBottom: 36,
            }}
          >
            <BrandLockup tone="light-on-dark" size="lg" />
          </View>
        </SafeAreaView>
      </ImageBackground>

      {/* Form surface — floats above hero with soft top radius */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, marginTop: -28 }}
      >
        <View
          className="flex-1 bg-surface px-6 pt-8"
          style={{
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: -4 },
            elevation: 12,
          }}
        >
          <Text className="text-[28px] font-bold tracking-tight text-ink">Get started</Text>
          <Text className="mt-2 text-[15px] text-ink-muted">
            We&apos;ll send a 6-digit code to verify your number.
          </Text>

          <View className="mt-7">
            <Text className="mb-2 text-[11px] font-bold uppercase tracking-[2px] text-ink-subtle">
              Mobile number
            </Text>
            <View
              className={`flex-row items-center rounded-card border-2 px-4 py-3.5 ${
                focused ? 'border-brand bg-surface' : 'border-border bg-surface-muted'
              }`}
            >
              <Text className="text-base font-semibold text-ink">🇮🇳</Text>
              <Text className="ml-2 mr-3 text-base font-semibold text-ink">+91</Text>
              <View className="h-6 w-px bg-border" />
              <TextInput
                value={digits}
                onChangeText={(t) => setDigits(t.replace(/\D/g, '').slice(0, 10))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="98765 43210"
                placeholderTextColor={colors.ink.subtle}
                keyboardType="number-pad"
                maxLength={10}
                className="ml-3 flex-1 text-base text-ink"
                autoFocus
              />
            </View>
            {error ? (
              <View className="mt-2 flex-row items-center">
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text className="ml-1.5 text-[13px] font-medium text-danger">{error}</Text>
              </View>
            ) : null}
          </View>

          <Pressable
            disabled={!valid || sendOtp.isPending}
            onPress={onContinue}
            style={
              valid && !sendOtp.isPending
                ? {
                    shadowColor: colors.brand.DEFAULT,
                    shadowOpacity: 0.22,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 6,
                  }
                : undefined
            }
            className={`mt-6 flex-row items-center justify-center rounded-card py-4 ${
              valid && !sendOtp.isPending ? 'bg-brand' : 'bg-brand/30'
            }`}
          >
            {sendOtp.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text className="text-base font-bold text-ink-inverse">Send OTP</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color="#FFFFFF"
                  style={{ marginLeft: 8 }}
                />
              </>
            )}
          </Pressable>

          <Text className="mt-5 text-center text-[12px] text-ink-subtle">
            By continuing you agree to <Text className="font-semibold text-ink-muted">Terms</Text>{' '}
            and <Text className="font-semibold text-ink-muted">Privacy Policy</Text>.
          </Text>

          {/* Trust strip pinned bottom */}
          <View className="mt-auto pb-6">
            <View className="flex-row items-stretch rounded-card border border-border bg-surface px-2 py-3">
              <TrustChip icon="shield-checkmark" label="Aadhaar" sub="Verified" />
              <View className="my-2 w-px bg-border" />
              <TrustChip icon="ribbon" label="Background" sub="Checked" />
              <View className="my-2 w-px bg-border" />
              <TrustChip icon="time" label="~30 min" sub="Avg arrival" />
            </View>
          </View>
        </View>
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
      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/15">
        <Ionicons name={icon} size={18} color={colors.accent[600]} />
      </View>
      <Text className="mt-1.5 text-[12px] font-bold text-ink">{label}</Text>
      <Text className="text-[10px] font-medium text-ink-subtle">{sub}</Text>
    </View>
  );
}
