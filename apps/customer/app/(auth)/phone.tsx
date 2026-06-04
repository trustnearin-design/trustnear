import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSendOtp } from '../../src/api/auth';
import { toE164 } from '../../src/lib/format';
import { ApiCallError } from '../../src/api/client';
import { CoralButton, Gradient } from '../../src/components/ui';
import { categoryPhoto } from '../../src/lib/imagery';
import { colors } from '../../src/theme/colors';

/**
 * Login screen — leads with a photographic collage of real services (what you
 * actually get) over a plum hero, then a prominent phone input. Yes Madam /
 * Snabbit style "show the value first" login, in TrustNear brand colours.
 */

// Service photos shown in the hero collage — picked to span the catalogue
// (cleaning, beauty, appliance, repair) so the value is obvious at a glance.
const HERO_SLUGS = [
  'home-cleaning',
  'salon-women',
  'ac-service',
  'spa-massage',
  'plumbing',
  'electrical',
];
export default function PhoneScreen() {
  const router = useRouter();
  const [digits, setDigits] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReferral, setShowReferral] = useState(false);
  const [referral, setReferral] = useState('');
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
      router.push({
        pathname: '/(auth)/otp',
        params: { phone, ...(referral.trim() ? { referralCode: referral.trim() } : {}) },
      });
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
          {/* Photo-collage hero — shows the actual services on offer */}
          <View style={{ overflow: 'hidden' }}>
            <Gradient
              colors={colors.gradient.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingBottom: 40 }}
            >
              <SafeAreaView edges={['top']}>
                <View style={{ paddingHorizontal: 22, paddingTop: 8 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '800',
                      letterSpacing: 2,
                      color: colors.support[300],
                    }}
                  >
                    TRUSTNEAR
                  </Text>
                  <Text
                    className="font-display"
                    style={{
                      marginTop: 8,
                      fontSize: 30,
                      fontWeight: '800',
                      color: '#FFFFFF',
                      lineHeight: 36,
                      letterSpacing: -0.5,
                    }}
                  >
                    Verified pros for{'\n'}every home service
                  </Text>
                  <Text style={{ marginTop: 8, fontSize: 14, color: colors.brand[200] }}>
                    Background-checked, fixed prices, in minutes.
                  </Text>
                </View>

                {/* 2-row photo strip */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, gap: 10 }}
                >
                  {HERO_SLUGS.map((slug) => (
                    <Image
                      key={slug}
                      source={{ uri: categoryPhoto(slug) }}
                      style={{
                        width: 104,
                        height: 128,
                        borderRadius: 16,
                        backgroundColor: 'rgba(255,255,255,0.08)',
                      }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>
              </SafeAreaView>
            </Gradient>
          </View>

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
            <Text className="font-display text-h2 text-ink">Log in or sign up</Text>
            <Text className="mt-2 text-body text-ink-muted">
              Apna mobile number daalein — hum ek 6-digit code bhejenge.
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

            {/* Have a referral code? */}
            {showReferral ? (
              <View className="mt-4">
                <Text className="mb-2 text-overline uppercase text-ink-subtle">Referral code</Text>
                <View className="flex-row items-center rounded-card border-2 border-border bg-surface px-4 py-3">
                  <Ionicons name="gift" size={18} color={colors.accent[700]} />
                  <TextInput
                    value={referral}
                    onChangeText={(t) => setReferral(t.toUpperCase().replace(/\s/g, ''))}
                    placeholder="e.g. RAHUL1234"
                    placeholderTextColor={colors.ink.subtle}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={20}
                    className="ml-3 flex-1 text-body text-ink"
                    style={{ fontWeight: '700', letterSpacing: 1 }}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={() => setShowReferral(true)}
                hitSlop={8}
                className="mt-4 flex-row items-center justify-center"
              >
                <Ionicons name="gift-outline" size={16} color={colors.brand[700]} />
                <Text className="ml-1.5 text-small font-display text-brand">
                  Have a referral code?
                </Text>
              </Pressable>
            )}

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
