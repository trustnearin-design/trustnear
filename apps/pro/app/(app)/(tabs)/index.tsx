import {
  ScrollView,
  View,
  Text,
  Pressable,
  RefreshControl,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth';
import {
  useMyProfile,
  useSetAvailability,
  useTodaySummary,
  useMyJobs,
  type MyProfile,
  type TodaySummary,
} from '../../../src/api/me';
import { formatRupees } from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';
import { BrandHero, CoralButton, SectionHeader } from '../../../src/components/ui';

/**
 * D7 pro home — Plum gradient hero with greeting + availability copy,
 * floating availability toggle card on the boundary, pending-jobs banner,
 * today stats grid, quick actions, KYC nudge for incomplete onboarding.
 */
export default function ProHomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useMyProfile();
  const today = useTodaySummary();
  const pendingJobs = useMyJobs('pending');
  const setAvail = useSetAvailability();

  const available = profile.data?.availabilityStatus === 'online';
  const refreshing = profile.isFetching || today.isFetching || pendingJobs.isFetching;

  const onRefresh = () => {
    void profile.refetch();
    void today.refetch();
    void pendingJobs.refetch();
  };

  const toggle = (next: boolean) => {
    setAvail.mutate(next ? 'online' : 'offline');
  };

  const firstName = user?.fullName?.split(' ')[0] ?? 'Pro';
  const statusCopy = available
    ? "You're online and ready for jobs"
    : profile.data?.availabilityStatus === 'busy'
      ? "You're on a job"
      : "You're offline — toggle on to earn";

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        <BrandHero
          bottomGap={56}
          rightSlot={
            <Pressable
              hitSlop={10}
              style={{
                height: 40,
                width: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.10)',
              }}
            >
              <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            </Pressable>
          }
        >
          <View style={{ paddingTop: 4 }}>
            <Text
              style={{
                color: colors.support[300],
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              TrustNear Pro
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: '#FFFFFF',
                fontSize: 26,
                fontWeight: '800',
                letterSpacing: -0.4,
              }}
            >
              Namaste, {firstName} 🙏
            </Text>
            <Text style={{ marginTop: 6, color: colors.brand[200], fontSize: 14 }}>
              {statusCopy}
            </Text>
          </View>
        </BrandHero>

        {/* Availability toggle card — floats over the hero edge */}
        <View
          style={{
            marginHorizontal: 20,
            marginTop: -36,
            backgroundColor: colors.surface.DEFAULT,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
            shadowColor: colors.brand[800],
            shadowOpacity: 0.1,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  style={{
                    height: 10,
                    width: 10,
                    borderRadius: 5,
                    backgroundColor: available
                      ? colors.success
                      : profile.data?.availabilityStatus === 'busy'
                        ? colors.warning
                        : colors.ink.subtle,
                    shadowColor: available ? colors.success : 'transparent',
                    shadowOpacity: 0.5,
                    shadowRadius: 6,
                  }}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    fontSize: 15,
                    fontWeight: '800',
                    color: colors.ink.DEFAULT,
                  }}
                >
                  {profile.data?.availabilityStatus === 'busy'
                    ? 'On a job'
                    : available
                      ? 'Online'
                      : 'Offline'}
                </Text>
                {setAvail.isPending ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.brand.DEFAULT}
                    style={{ marginLeft: 8 }}
                  />
                ) : null}
              </View>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.ink.muted }}>
                {available
                  ? 'Receiving job requests in your area'
                  : profile.data?.availabilityStatus === 'busy'
                    ? "Auto-set while you're on a job"
                    : 'Toggle on to start accepting jobs'}
              </Text>
            </View>
            <Switch
              value={available}
              onValueChange={toggle}
              disabled={profile.data?.availabilityStatus === 'busy' || setAvail.isPending}
              trackColor={{ false: colors.border.DEFAULT, true: colors.success }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Pending jobs banner */}
        {(pendingJobs.data?.count ?? 0) > 0 ? (
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/jobs')}
            style={{
              marginHorizontal: 20,
              marginTop: 16,
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderRadius: 18,
              backgroundColor: colors.accent[50],
              borderWidth: 1,
              borderColor: colors.accent[200],
            }}
          >
            <View
              style={{
                height: 42,
                width: 42,
                borderRadius: 21,
                backgroundColor: colors.accent.DEFAULT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="briefcase" size={18} color="#FFFFFF" />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink.DEFAULT }}>
                {pendingJobs.data?.count} new job
                {(pendingJobs.data?.count ?? 0) > 1 ? 's' : ''} waiting
              </Text>
              <Text style={{ fontSize: 12, color: colors.ink.muted, marginTop: 2 }}>
                Tap to review & accept
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.accent[700]} />
          </Pressable>
        ) : null}

        {/* Today stats */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeader eyebrow="TODAY · LIVE" title="Your snapshot" />
        </View>
        <TodayGrid today={today.data} loading={today.isPending} />

        {/* Quick actions */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeader title="Quick actions" />
        </View>
        <View style={{ paddingHorizontal: 20, marginTop: 12 }}>
          <ActionRow
            icon="briefcase"
            title="View jobs"
            subtitle="See incoming, active, and past jobs"
            onPress={() => router.push('/(app)/(tabs)/jobs')}
          />
          <ActionRow
            icon="calendar"
            title="Manage schedule"
            subtitle="Set hours when you're available"
            onPress={() => router.push('/(app)/(tabs)/profile')}
          />
          <ActionRow
            icon="construct"
            title="Services offered"
            subtitle={
              profile.data
                ? `${profile.data.serviceOfferings.length} active`
                : 'Add or remove what you do'
            }
            onPress={() => router.push('/(app)/(tabs)/profile')}
          />
        </View>

        <KycNudge profile={profile.data} />
      </ScrollView>
    </View>
  );
}

// ─── Today stats grid ────────────────────────────────────────────

function TodayGrid({ today, loading }: { today: TodaySummary | undefined; loading: boolean }) {
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <StatBox
          icon="briefcase"
          label="Jobs done"
          value={loading ? '—' : String(today?.jobsCompleted ?? 0)}
        />
        <View style={{ width: 12 }} />
        <StatBox
          icon="cash"
          label="Earned"
          value={loading ? '—' : formatRupees(today?.earnedPaise ?? 0)}
          tone="coral"
        />
      </View>
      <View style={{ flexDirection: 'row', marginTop: 12 }}>
        <StatBox
          icon="star"
          label="Rating"
          value={loading ? '—' : today?.ratingAvg != null ? today.ratingAvg.toFixed(1) : 'New'}
          tone="butter"
        />
        <View style={{ width: 12 }} />
        <StatBox
          icon="flash"
          label="Active"
          value={loading ? '—' : String(today?.jobsActive ?? 0)}
        />
      </View>
    </View>
  );
}

function StatBox({
  icon,
  label,
  value,
  tone = 'plum',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone?: 'plum' | 'coral' | 'butter';
}) {
  const palette = {
    plum: {
      bg: colors.brand[50],
      iconBg: colors.brand[200],
      iconFg: colors.brand[800],
      value: colors.ink.DEFAULT,
    },
    coral: {
      bg: colors.accent[50],
      iconBg: colors.accent[200],
      iconFg: colors.accent[700],
      value: colors.accent[700],
    },
    butter: {
      bg: colors.support[50],
      iconBg: colors.support[200],
      iconFg: colors.support[700],
      value: colors.support[700],
    },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        borderRadius: 18,
        padding: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: palette.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={palette.iconFg} />
      </View>
      <Text
        style={{
          marginTop: 12,
          fontSize: 22,
          fontWeight: '800',
          color: palette.value,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: colors.ink.subtle,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.brand[50],
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={colors.brand[700]} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.ink.DEFAULT }}>{title}</Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: colors.ink.muted }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink.subtle} />
    </Pressable>
  );
}

// ─── KYC nudge ────────────────────────────────────────────────────

function KycNudge({ profile }: { profile: MyProfile | undefined }) {
  const router = useRouter();
  if (!profile) return null;
  const allVerified =
    profile.aadhaarVerified &&
    profile.faceVerified &&
    profile.bankVerified &&
    profile.policeVerified;
  if (allVerified) return null;
  const pending = [
    !profile.aadhaarVerified && 'Aadhaar',
    !profile.faceVerified && 'Face match',
    !profile.bankVerified && 'Bank',
    !profile.policeVerified && 'Police check',
  ].filter(Boolean) as string[];
  return (
    <>
      <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
        <SectionHeader eyebrow="VERIFICATION" title="Boost your trust score" />
      </View>
      <View
        style={{
          marginHorizontal: 20,
          marginTop: 12,
          padding: 18,
          borderRadius: 18,
          backgroundColor: colors.brand[900],
          overflow: 'hidden',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              backgroundColor: colors.accent.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text
              style={{
                color: colors.support[300],
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {pending.length} step{pending.length > 1 ? 's' : ''} left
            </Text>
            <Text
              style={{
                marginTop: 2,
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '800',
              }}
            >
              Get verified, earn 3× more
            </Text>
          </View>
        </View>
        <Text
          style={{
            marginTop: 12,
            color: colors.brand[200],
            fontSize: 13,
            lineHeight: 20,
          }}
        >
          Complete {pending.join(', ')} to unlock the verified badge. Customers choose verified pros
          3× more often.
        </Text>
        <View style={{ marginTop: 14 }}>
          <CoralButton
            label="Start verification"
            onPress={() => router.push('/(app)/kyc' as never)}
            icon="arrow-forward"
          />
        </View>
      </View>
    </>
  );
}
