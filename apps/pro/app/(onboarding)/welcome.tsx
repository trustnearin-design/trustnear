import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MascotImage } from '../../src/components/ui/MascotImage';
import { CoralButton } from '../../src/components/ui/CoralButton';
import { useAuthStore } from '../../src/stores/auth';
import { useOnboardingStatus, nextStepRoute } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Onboarding welcome screen — first thing a new pro sees after OTP.
 * Doubles as the "rejected" landing when a previously-rejected pro
 * re-opens the app, showing the admin's feedback + a "Fix & Resubmit"
 * CTA. Uses approvalStatus to switch between the two modes.
 */
export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStatus();
  const logout = useAuthStore((s) => s.clearSession);

  const status = onboarding.data?.approvalStatus;
  const isRejected = status === 'rejected';
  const rejectionReason = onboarding.data?.rejectionReason;
  const rejectionFields = onboarding.data?.rejectionFields ?? [];

  const handleStart = () => {
    if (!onboarding.data) return;
    const route = nextStepRoute(onboarding.data);
    router.push(route as never);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      {/* Top bar — logout button only (no back; this is the root) */}
      <View
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          onPress={() => logout()}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
          }}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.ink.muted} />
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink.muted }}>Logout</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 28,
          paddingTop: 12,
          paddingBottom: 140,
          alignItems: 'center',
        }}
      >
        {/* Mascot */}
        <MascotImage
          variant={isRejected ? 'rejected' : 'welcome'}
          size={200}
          withHalo
          tone="plum"
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 28,
            fontWeight: '800',
            color: colors.ink.DEFAULT,
            textAlign: 'center',
            marginTop: 24,
            letterSpacing: -0.5,
            lineHeight: 34,
          }}
        >
          {isRejected ? 'Bas thoda fix karna hai' : 'Swagat hai TrustNear Pro mein! 🙏'}
        </Text>

        <Text
          style={{
            fontSize: 15,
            color: colors.ink.muted,
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 22,
          }}
        >
          {isRejected
            ? 'Humne aapka profile review kiya. Niche likhi hui cheezein update karke wapas submit karein.'
            : 'Jobs accept karna shuru karne se pehle, hum aapko verify karenge. Sirf 8 quick steps — 10 minute lagenge.'}
        </Text>

        {/* Rejection details — only when rejected */}
        {isRejected && rejectionReason ? (
          <View
            style={{
              marginTop: 24,
              alignSelf: 'stretch',
              backgroundColor: '#FDECEA',
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#F7B9B3',
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.danger }}>
                Admin ka feedback
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: colors.ink.DEFAULT, lineHeight: 20 }}>
              {rejectionReason}
            </Text>
            {rejectionFields.length > 0 ? (
              <Text
                style={{ marginTop: 10, fontSize: 12, color: colors.ink.muted, fontWeight: '700' }}
              >
                Fix karne wale steps: {rejectionFields.join(', ')}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* What you'll do */}
        {!isRejected ? (
          <View style={{ marginTop: 32, alignSelf: 'stretch', gap: 12 }}>
            {[
              { icon: 'person-outline', label: 'Personal details' },
              { icon: 'camera-outline', label: 'Profile photo' },
              { icon: 'briefcase-outline', label: 'Services & pricing' },
              { icon: 'location-outline', label: 'Working area' },
              { icon: 'calendar-outline', label: 'Availability' },
              { icon: 'shield-checkmark-outline', label: 'KYC verification (Aadhaar, PAN, Bank)' },
            ].map((row) => (
              <View
                key={row.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  backgroundColor: colors.surface.DEFAULT,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border.DEFAULT,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.brand[50],
                  }}
                >
                  <Ionicons name={row.icon as never} size={18} color={colors.brand[700]} />
                </View>
                <Text
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.ink.DEFAULT }}
                >
                  {row.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Trust strip */}
        <View
          style={{
            marginTop: 28,
            alignSelf: 'stretch',
            flexDirection: 'row',
            justifyContent: 'space-around',
            paddingVertical: 14,
            paddingHorizontal: 12,
            backgroundColor: colors.brand[50],
            borderRadius: 14,
          }}
        >
          {[
            ['🛡️', 'Verified pros'],
            ['💸', 'Daily payouts'],
            ['📈', 'Trusted by 1000s'],
          ].map(([icon, label]) => (
            <View key={label} style={{ alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.brand[800] }}>
                {label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          backgroundColor: colors.surface.DEFAULT,
          borderTopWidth: 1,
          borderTopColor: colors.border.DEFAULT,
        }}
      >
        <CoralButton
          label={isRejected ? 'Fix & Resubmit' : 'Start Onboarding'}
          onPress={handleStart}
          icon="arrow-forward"
        />
      </View>
    </View>
  );
}
