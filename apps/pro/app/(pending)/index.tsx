import { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, ScrollView, AppState, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MascotImage } from '../../src/components/ui/MascotImage';
import { CoralButton, OutlineButton } from '../../src/components/ui/CoralButton';
import { useAuthStore } from '../../src/stores/auth';
import { useOnboardingStatus } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Submitted-for-review locked screen. Shown when a pro hits Submit and
 * is awaiting admin approval. Polls /onboarding/status every 30s in
 * the background (via TanStack's default refetch behavior + staleTime)
 * so when admin flips to approved/rejected, the root guard redirects
 * out within seconds.
 */
export default function PendingScreen() {
  const insets = useSafeAreaInsets();
  const onboarding = useOnboardingStatus();
  const logout = useAuthStore((s) => s.clearSession);
  const qc = useQueryClient();
  const router = useRouter();
  const [celebrating, setCelebrating] = useState(false);

  // Aggressive polling — every 10s while this screen is mounted so the
  // pro doesn't have to manually refresh after admin approval. Also
  // refetch immediately when the app foregrounds (admin might have
  // approved while the screen was backgrounded).
  useEffect(() => {
    const interval = setInterval(() => {
      void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
    }, 10_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
      }
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [qc]);

  // Detect status flip to approved — show celebration interlude then
  // route to (app) tabs. Vibrate once on approval as haptic ack.
  useEffect(() => {
    if (onboarding.data?.approvalStatus === 'approved' && !celebrating) {
      setCelebrating(true);
      Vibration.vibrate([0, 80, 60, 80, 60, 160]);
    }
  }, [onboarding.data?.approvalStatus, celebrating]);

  if (celebrating) {
    return <ApprovalCelebration onContinue={() => router.replace('/(app)' as never)} />;
  }

  const submittedAt = onboarding.data?.submittedAt ? new Date(onboarding.data.submittedAt) : null;

  const openWhatsApp = () => {
    // Generic support contact — replace with your business WhatsApp number
    void Linking.openURL(
      'https://wa.me/919876543210?text=Hi%20TrustNear%2C%20I%20submitted%20my%20pro%20application%20and%20wanted%20to%20check%20the%20status.',
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      {/* Top bar */}
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
          paddingTop: 32,
          paddingBottom: 48,
          alignItems: 'center',
        }}
      >
        <MascotImage variant="submitted" size={200} tone="butter" />

        <Text
          style={{
            fontSize: 26,
            fontWeight: '800',
            color: colors.ink.DEFAULT,
            textAlign: 'center',
            marginTop: 24,
            letterSpacing: -0.4,
          }}
        >
          Aapki application review mein hai
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
          Hum aapke documents check kar rahe hain. Usually 24–48 ghante lagte hain. Approval ke baad
          turant notification milegi.
        </Text>

        {/* Timeline card */}
        <View
          style={{
            marginTop: 28,
            alignSelf: 'stretch',
            backgroundColor: colors.surface.DEFAULT,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
            padding: 18,
          }}
        >
          <TimelineRow
            done
            icon="checkmark-circle"
            iconColor={colors.success}
            title="Application submitted"
            subtitle={submittedAt ? formatRelativeTime(submittedAt) : 'Just now'}
          />
          <TimelineConnector active />
          <TimelineRow
            inProgress
            icon="time"
            iconColor={colors.support[700]}
            title="Under review"
            subtitle="Our team checking your KYC + documents"
          />
          <TimelineConnector />
          <TimelineRow
            icon="checkmark-done-circle"
            iconColor={colors.ink.subtle}
            title="Approved & live"
            subtitle="Start accepting jobs"
          />
        </View>

        {/* Support */}
        <View style={{ alignSelf: 'stretch', marginTop: 24 }}>
          <OutlineButton
            label="Contact Support on WhatsApp"
            onPress={openWhatsApp}
            icon="logo-whatsapp"
          />
        </View>

        <Text
          style={{
            fontSize: 12,
            color: colors.ink.subtle,
            textAlign: 'center',
            marginTop: 16,
            lineHeight: 18,
          }}
        >
          Status apne aap refresh hota rahega.{'\n'}
          Approval milte hi yahan se nikalkar Home pe pohonch jayenge.
        </Text>
      </ScrollView>
    </View>
  );
}

function TimelineRow({
  done,
  inProgress,
  icon,
  iconColor,
  title,
  subtitle,
}: {
  done?: boolean;
  inProgress?: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Ionicons name={icon} size={24} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: done || inProgress ? colors.ink.DEFAULT : colors.ink.subtle,
          }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.ink.muted, marginTop: 2 }}>{subtitle}</Text>
      </View>
    </View>
  );
}

function TimelineConnector({ active }: { active?: boolean }) {
  return (
    <View
      style={{
        width: 2,
        height: 22,
        backgroundColor: active ? colors.brand[700] : colors.border.DEFAULT,
        marginLeft: 11,
        marginVertical: 4,
      }}
    />
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Approval celebration interlude — full-screen overlay shown when admin
 * just approved the pro. Auto-routes to (app) after 4 seconds OR on
 * "Let's go" tap. Confetti is decorative (small emoji rain) — full
 * confetti animation can come later via react-native-reanimated.
 */
function ApprovalCelebration({ onContinue }: { onContinue: () => void }) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(onContinue, 6000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  // 30 confetti emoji at random positions for a quick festive feel
  const confetti = Array.from({ length: 30 }, (_, i) => ({
    key: i,
    left: Math.random() * 100,
    delay: Math.random() * 2000,
    emoji: ['🎉', '🎊', '✨', '🥳', '🏆'][i % 5],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.brand[800] }}>
      {/* Confetti layer (static positions; subtle decoration) */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        {confetti.map((c) => (
          <Text
            key={c.key}
            style={{
              position: 'absolute',
              top: 60 + ((c.key * 23) % 500),
              left: `${c.left}%`,
              fontSize: 26,
              opacity: 0.9,
            }}
          >
            {c.emoji}
          </Text>
        ))}
      </View>

      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingTop: insets.top,
        }}
      >
        <Text style={{ fontSize: 96, marginBottom: 12 }}>🎉</Text>

        <MascotImage variant="approved" size={180} tone="butter" />

        <Text
          style={{
            fontSize: 30,
            fontWeight: '800',
            color: '#FFFFFF',
            textAlign: 'center',
            marginTop: 24,
            letterSpacing: -0.5,
          }}
        >
          Aap approved ho gaye!
        </Text>

        <Text
          style={{
            fontSize: 16,
            color: colors.support[200],
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 24,
          }}
        >
          Aap ab live ho TrustNear pe.{'\n'}
          Jobs accept karna shuru karein.
        </Text>

        <View
          style={{
            marginTop: 36,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: colors.support[300],
              letterSpacing: 0.8,
            }}
          >
            ✓ TRUSTED · VERIFIED · LIVE
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          paddingTop: 12,
        }}
      >
        <CoralButton label="Let's go to Home" onPress={onContinue} icon="arrow-forward" />
      </View>
    </View>
  );
}
