import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../../src/stores/auth';
import { useLogout } from '../../../src/api/auth';
import { useMyProfile, type MyProfile } from '../../../src/api/me';
import { useUploadPhoto } from '../../../src/api/onboarding';
import { formatIndianPhone, formatRupees } from '../../../src/lib/format';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/theme/colors';
import { BrandHero } from '../../../src/components/ui';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Profile status chip — reflects approval state, NOT a raw all-KYC-verified
// check (an approved pro is live even if PAN/Bank/Police are still pending).
function statusChip(
  approvalStatus: MyProfile['approvalStatus'],
  trustBadge: string,
): {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: 'success' | 'warning' | 'danger';
} {
  switch (approvalStatus) {
    case 'approved': {
      // Only a real trust tier (e.g. "gold") prefixes the label → "Gold verified".
      // With no tier, fall back to a plain "Verified" (not "Verified verified").
      const tier = trustBadge && trustBadge !== 'none' ? trustBadge : null;
      return {
        label: tier ? `${tier.charAt(0).toUpperCase()}${tier.slice(1)} verified` : 'Verified',
        icon: 'shield-checkmark',
        tone: 'success',
      };
    }
    case 'submitted_for_review':
      return { label: 'Under review', icon: 'time', tone: 'warning' };
    case 'rejected':
      return { label: 'Action needed', icon: 'alert-circle', tone: 'danger' };
    default:
      return { label: 'Profile incomplete', icon: 'alert-circle', tone: 'warning' };
  }
}

const TONE_BG: Record<'success' | 'warning' | 'danger', string> = {
  success: 'bg-success/10',
  warning: 'bg-warning/10',
  danger: 'bg-danger/10',
};
const TONE_FG: Record<'success' | 'warning' | 'danger', string> = {
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useMyProfile();
  const logout = useLogout();
  const uploadPhoto = useUploadPhoto();

  const chip = profile.data
    ? statusChip(profile.data.approvalStatus, profile.data.trustBadge)
    : null;

  // Tap avatar → pick + upload a new profile photo (works for approved pros now).
  const changePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Gallery access chahiye photo badalne ke liye.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    uploadPhoto.mutate(
      { uri: asset.uri, mime: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: () => void profile.refetch(),
        onError: (e: Error) => Alert.alert('Upload failed', e.message),
      },
    );
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />

      <BrandHero bottomGap={56}>
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
            Your account
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
            Profile
          </Text>
        </View>
      </BrandHero>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profile.isFetching}
            onRefresh={() => void profile.refetch()}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        {/* Identity card floats on boundary */}
        <View
          className="mx-5 -mt-9 rounded-card bg-surface p-5"
          style={{
            shadowColor: '#000',
            shadowOpacity: 0.1,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 6,
          }}
        >
          <View className="flex-row items-center">
            <Pressable onPress={() => void changePhoto()} hitSlop={6}>
              <Avatar
                fullName={user?.fullName ?? 'Pro'}
                photoUrl={profile.data?.user.profilePhoto ?? undefined}
                size={64}
              />
              <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-brand">
                {uploadPhoto.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={12} color="#fff" />
                )}
              </View>
            </Pressable>
            <View className="ml-3 flex-1">
              <Text className="text-[18px] font-bold text-ink">{user?.fullName ?? 'Pro'}</Text>
              <Text className="text-[12px] text-ink-muted">
                {user?.phone ? formatIndianPhone(user.phone) : ''}
              </Text>
              {chip ? (
                <View
                  className={`mt-1.5 self-start flex-row items-center rounded-pill px-2 py-0.5 ${TONE_BG[chip.tone]}`}
                >
                  <Ionicons name={chip.icon} size={10} color={TONE_FG[chip.tone]} />
                  <Text
                    className="ml-1 text-[10px] font-bold"
                    style={{ color: TONE_FG[chip.tone] }}
                  >
                    {chip.label}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {profile.data ? (
            <View className="mt-4 flex-row">
              <MetricCell label="Jobs" value={String(profile.data.totalBookings)} />
              <View style={{ width: 12 }} />
              <MetricCell label="Repeat" value={String(profile.data.repeatClientCount)} />
              <View style={{ width: 12 }} />
              <MetricCell label="Trust" value={Number(profile.data.trustScore).toFixed(0)} />
            </View>
          ) : profile.isPending ? (
            <View className="mt-4 items-center">
              <ActivityIndicator color={colors.brand.DEFAULT} />
            </View>
          ) : null}
        </View>

        <SectionTitle>Verification</SectionTitle>
        <Pressable
          onPress={() => router.push('/(app)/kyc')}
          className="mx-5 mt-2 overflow-hidden rounded-card bg-surface"
        >
          <KycRow
            icon="finger-print"
            label="Aadhaar"
            verified={profile.data?.aadhaarVerified ?? false}
          />
          <Divider />
          <KycRow icon="document-text" label="PAN" verified={profile.data?.panVerified ?? false} />
          <Divider />
          <KycRow icon="card" label="Bank account" verified={profile.data?.bankVerified ?? false} />
          <Divider />
          <KycRow
            icon="shield-checkmark"
            label="Police check"
            verified={profile.data?.policeVerified ?? false}
          />
          <View className="flex-row items-center justify-center border-t border-border bg-brand-50/40 py-3">
            <Ionicons name="arrow-forward-circle" size={14} color={colors.brand.DEFAULT} />
            <Text className="ml-2 text-[12px] font-bold text-brand">Manage KYC</Text>
          </View>
        </Pressable>

        <SectionTitle onEdit={() => router.push('/(app)/edit/services')}>
          Services offered
        </SectionTitle>
        <OfferingsList profile={profile.data} />

        <SectionTitle onEdit={() => router.push('/(app)/edit/schedule')}>
          Weekly schedule
        </SectionTitle>
        <ScheduleList profile={profile.data} />

        <SectionTitle>Account</SectionTitle>
        <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface">
          <Pressable
            onPress={() => router.push('/(app)/(tabs)/earnings')}
            className="flex-row items-center px-4 py-3.5"
          >
            <Ionicons name="wallet" size={18} color={colors.brand.DEFAULT} />
            <Text className="ml-3 flex-1 text-[14px] font-semibold text-ink">
              Earnings &amp; wallet
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => router.push('/(app)/help')}
            className="flex-row items-center px-4 py-3.5"
          >
            <Ionicons name="help-circle" size={18} color={colors.brand.DEFAULT} />
            <Text className="ml-3 flex-1 text-[14px] font-semibold text-ink">
              Help &amp; support
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => router.push('/(app)/legal/terms')}
            className="flex-row items-center px-4 py-3.5"
          >
            <Ionicons name="document-text" size={18} color={colors.brand.DEFAULT} />
            <Text className="ml-3 flex-1 text-[14px] font-semibold text-ink">Terms of service</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
          </Pressable>
          <Divider />
          <Pressable
            onPress={() => router.push('/(app)/legal/privacy')}
            className="flex-row items-center px-4 py-3.5"
          >
            <Ionicons name="shield-outline" size={18} color={colors.brand.DEFAULT} />
            <Text className="ml-3 flex-1 text-[14px] font-semibold text-ink">Privacy policy</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
          </Pressable>
        </View>

        <View className="px-5 pt-6">
          <Pressable
            onPress={() => void logout.mutate()}
            disabled={logout.isPending}
            className="flex-row items-center justify-center rounded-card border border-danger/30 bg-danger/5 py-4"
          >
            {logout.isPending ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text className="ml-2 text-base font-semibold text-danger">Log out</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text className="mt-6 text-center text-[11px] text-ink-subtle">
          TrustNear Pro · v0.1.0 · Jaipur, IN
        </Text>
      </ScrollView>
    </View>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center rounded-card bg-surface-muted py-2.5">
      <Text className="text-[16px] font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1px] text-ink-subtle">
        {label}
      </Text>
    </View>
  );
}

function SectionTitle({ children, onEdit }: { children: string; onEdit?: () => void }) {
  return (
    <View className="mt-6 flex-row items-center justify-between px-5">
      <Text className="text-[11px] font-bold uppercase tracking-[2px] text-ink-subtle">
        {children}
      </Text>
      {onEdit ? (
        <Pressable onPress={onEdit} hitSlop={8} className="flex-row items-center">
          <Ionicons name="create-outline" size={14} color={colors.brand.DEFAULT} />
          <Text className="ml-1 text-[12px] font-bold text-brand">Edit</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function KycRow({
  icon,
  label,
  verified,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  verified: boolean;
}) {
  return (
    <Pressable className="flex-row items-center px-4 py-3.5">
      <Ionicons name={icon} size={18} color={verified ? colors.success : colors.brand.DEFAULT} />
      <Text className="ml-3 flex-1 text-[14px] font-semibold text-ink">{label}</Text>
      <Text
        className="mr-2 text-[12px] font-bold"
        style={{ color: verified ? colors.success : colors.warning }}
      >
        {verified ? 'Verified' : 'Pending'}
      </Text>
      <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
    </Pressable>
  );
}

function OfferingsList({ profile }: { profile: MyProfile | undefined }) {
  if (!profile) return null;
  if (profile.serviceOfferings.length === 0) {
    return (
      <View className="mx-5 mt-2 items-center rounded-card bg-surface p-5">
        <Ionicons name="construct-outline" size={28} color={colors.ink.subtle} />
        <Text className="mt-2 text-[14px] font-bold text-ink">No services yet</Text>
        <Text className="mt-1 text-center text-[12px] text-ink-muted">
          Add what you offer to start receiving jobs.
        </Text>
      </View>
    );
  }
  return (
    <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface">
      {profile.serviceOfferings.map((o, idx) => (
        <View key={o.category.id}>
          <View className="flex-row items-center px-4 py-3.5">
            <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-brand-50">
              <Ionicons name="construct" size={16} color={colors.brand.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-[14px] font-bold text-ink">{o.category.name}</Text>
              <Text className="text-[11px] text-ink-subtle">{o.experienceYears}y experience</Text>
            </View>
            <Text className="text-[13px] font-bold text-brand">
              {formatRupees(o.customPrice ?? o.category.basePrice)}
              {o.category.priceUnit === 'per_hour' ? '/hr' : ''}
            </Text>
          </View>
          {idx < profile.serviceOfferings.length - 1 ? <Divider /> : null}
        </View>
      ))}
    </View>
  );
}

function ScheduleList({ profile }: { profile: MyProfile | undefined }) {
  if (!profile) return null;
  return (
    <View className="mx-5 mt-2 rounded-card bg-surface p-2">
      {profile.schedules.map((s) => (
        <View key={s.dayOfWeek} className="flex-row items-center justify-between px-3 py-2">
          <View className="flex-row items-center">
            <View
              className={`h-2 w-2 rounded-full ${s.isAvailable ? 'bg-success' : 'bg-ink-subtle'}`}
            />
            <Text className="ml-2 text-[12px] font-bold text-ink">{DAY_LABELS[s.dayOfWeek]}</Text>
          </View>
          <Text
            className={`text-[12px] ${
              s.isAvailable ? 'font-semibold text-ink-muted' : 'text-ink-subtle'
            }`}
          >
            {s.isAvailable ? `${s.startTime} – ${s.endTime}` : 'Closed'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Divider() {
  return <View className="ml-11 h-px bg-border" />;
}
