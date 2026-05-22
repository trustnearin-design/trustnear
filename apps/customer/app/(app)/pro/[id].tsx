import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProDetail, type ProDetail, type ProReview } from '../../../src/api/discovery';
import {
  badgeColors,
  badgeLabel,
  formatResponseTime,
  formatRupees,
  priceUnitLabel,
} from '../../../src/lib/format';
import { categoryPhoto } from '../../../src/lib/imagery';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ExpertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, isFetching, refetch } = useProDetail(id);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : isError || !data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={36} color={colors.ink.subtle} />
          <Text className="mt-3 text-center text-sm text-danger">
            Couldn't load this expert. Try again.
          </Text>
          <Pressable onPress={() => void refetch()} className="mt-3">
            <Text className="text-sm font-semibold text-brand">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="pb-36"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
            }
          >
            <HeroBanner pro={data} />
            <HeaderBlock pro={data} />
            <StatStrip pro={data} />
            <VerificationStrip pro={data} />
            {data.bio ? (
              <Section title="About">
                <Text className="text-sm leading-5 text-ink-muted">{data.bio}</Text>
              </Section>
            ) : null}
            <ServicesSection pro={data} />
            <ScheduleSection pro={data} />
            <ReviewsSection pro={data} />
          </ScrollView>

          <StickyBookBar expertId={id ?? ''} />
        </>
      )}
    </SafeAreaView>
  );
}

function HeroBanner({ pro }: { pro: ProDetail }) {
  const firstService = pro.serviceOfferings[0]?.category.slug;
  const photo = firstService ? categoryPhoto(firstService) : categoryPhoto('home-cleaning');
  return (
    <ImageBackground source={{ uri: photo }} style={{ height: 130 }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
        }}
      />
    </ImageBackground>
  );
}

function HeaderBlock({ pro }: { pro: ProDetail }) {
  const badge = badgeColors(pro.trustBadge);
  return (
    <View className="px-5">
      <View className="-mt-10 flex-row items-end">
        <Avatar
          fullName={pro.user.fullName}
          photoUrl={pro.user.profilePhoto ?? undefined}
          size={92}
          borderColor="#FFFFFF"
        />
        {pro.availabilityStatus === 'online' ? (
          <View className="ml-3 mb-2 flex-row items-center rounded-pill bg-success/10 px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-success" />
            <Text className="ml-1.5 text-[11px] font-bold text-success">Online now</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3 flex-row items-center">
        <Text numberOfLines={1} className="flex-1 text-xl font-bold text-ink">
          {pro.user.fullName}
        </Text>
        {pro.trustBadge !== 'none' ? (
          <View className="ml-2 rounded-pill px-2.5 py-1" style={{ backgroundColor: badge.bg }}>
            <Text className="text-[11px] font-bold" style={{ color: badge.text }}>
              {badgeLabel(pro.trustBadge)} Expert
            </Text>
          </View>
        ) : null}
      </View>

      {pro.professionalTitle ? (
        <Text className="mt-1 text-sm text-ink-muted">{pro.professionalTitle}</Text>
      ) : null}

      {pro.user.area || pro.user.city ? (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="location-outline" size={14} color={colors.ink.subtle} />
          <Text className="ml-1 text-xs text-ink-muted">
            {[pro.user.area, pro.user.city].filter(Boolean).join(', ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function StatStrip({ pro }: { pro: ProDetail }) {
  return (
    <View className="mx-5 mt-4 flex-row rounded-card bg-surface-muted py-3">
      <Stat label="Trust" value={Number(pro.trustScore).toFixed(0)} />
      <Stat label="Jobs done" value={String(pro.totalBookings)} />
      <Stat label="Experience" value={`${pro.yearsExperience}y`} />
      <Stat label="Responds in" value={formatResponseTime(pro.avgResponseTimeSeconds)} last />
    </View>
  );
}

function Stat({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View className={`flex-1 ${last ? '' : 'border-r border-border'}`}>
      <Text className="text-center text-base font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-center text-[10px] uppercase tracking-wider text-ink-subtle">
        {label}
      </Text>
    </View>
  );
}

function VerificationStrip({ pro }: { pro: ProDetail }) {
  const items: Array<{ key: string; label: string; ok: boolean }> = [
    { key: 'aadhaar', label: 'Aadhaar', ok: pro.aadhaarVerified },
    { key: 'face', label: 'Face', ok: pro.faceVerified },
    { key: 'bank', label: 'Bank', ok: pro.bankVerified },
    { key: 'police', label: 'Police', ok: pro.policeVerified },
  ];
  return (
    <View className="mx-5 mt-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Verified by TrustNear
      </Text>
      <View className="flex-row rounded-card border border-border bg-surface px-2 py-3">
        {items.map((it, idx) => (
          <View
            key={it.key}
            className={`flex-1 items-center ${idx < items.length - 1 ? 'border-r border-border' : ''}`}
          >
            <Ionicons
              name={it.ok ? 'shield-checkmark' : 'close-circle-outline'}
              size={20}
              color={it.ok ? colors.success : colors.ink.subtle}
            />
            <Text
              className={`mt-1 text-[11px] ${it.ok ? 'font-bold text-success' : 'text-ink-subtle'}`}
            >
              {it.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-6 px-5">
      <Text className="mb-2 text-base font-bold text-ink">{title}</Text>
      <View className="rounded-card border border-border bg-surface p-4">{children}</View>
    </View>
  );
}

function ServicesSection({ pro }: { pro: ProDetail }) {
  if (pro.serviceOfferings.length === 0) return null;
  return (
    <View className="mt-6 px-5">
      <Text className="mb-2 text-base font-bold text-ink">Services offered</Text>
      <View className="rounded-card border border-border bg-surface">
        {pro.serviceOfferings.map((o, idx) => (
          <View
            key={o.category.id}
            className={`flex-row items-center px-4 py-3 ${idx < pro.serviceOfferings.length - 1 ? 'border-b border-border' : ''}`}
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-brand-100">
              <Ionicons name="construct" size={18} color={colors.brand.DEFAULT} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-ink">{o.category.name}</Text>
              <Text className="mt-0.5 text-xs text-ink-subtle">
                {o.experienceYears}y experience
              </Text>
            </View>
            <Text className="text-sm font-bold text-brand">
              {formatRupees(o.customPrice ?? o.category.basePrice)}
              {priceUnitLabel(o.category.priceUnit)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ScheduleSection({ pro }: { pro: ProDetail }) {
  if (pro.schedules.length === 0) return null;
  return (
    <View className="mt-6 px-5">
      <Text className="mb-2 text-base font-bold text-ink">Weekly schedule</Text>
      <View className="rounded-card border border-border bg-surface p-2">
        {pro.schedules.map((s) => (
          <View key={s.dayOfWeek} className="flex-row items-center justify-between px-3 py-2">
            <Text className="text-xs font-semibold text-ink">{DAY_LABELS[s.dayOfWeek]}</Text>
            <Text className={`text-xs ${s.isAvailable ? 'text-ink-muted' : 'text-ink-subtle'}`}>
              {s.isAvailable ? `${s.startTime} – ${s.endTime}` : 'Closed'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewsSection({ pro }: { pro: ProDetail }) {
  return (
    <View className="mt-6 px-5">
      <Text className="mb-2 text-base font-bold text-ink">Recent reviews</Text>
      {pro.reviews.length === 0 ? (
        <View className="rounded-card border border-border bg-surface p-4">
          <Text className="text-sm text-ink-subtle">No reviews yet.</Text>
        </View>
      ) : (
        pro.reviews.map((r) => <ReviewCard key={r.id} review={r} />)
      )}
    </View>
  );
}

function ReviewCard({ review }: { review: ProReview }) {
  return (
    <View className="mb-3 rounded-card border border-border bg-surface p-4">
      <View className="flex-row items-center">
        <Avatar
          fullName={review.customer.fullName}
          photoUrl={review.customer.profilePhoto ?? undefined}
          size={40}
        />
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-ink">{review.customer.fullName}</Text>
          <View className="mt-0.5 flex-row items-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < review.rating ? 'star' : 'star-outline'}
                size={12}
                color={colors.accent.DEFAULT}
              />
            ))}
          </View>
        </View>
      </View>
      {review.reviewText ? (
        <Text className="mt-2 text-sm leading-5 text-ink-muted">{review.reviewText}</Text>
      ) : null}
      {review.proResponse ? (
        <View className="mt-3 rounded-card bg-surface-muted p-3">
          <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Expert responded
          </Text>
          <Text className="mt-1 text-xs text-ink-muted">{review.proResponse}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StickyBookBar({ expertId }: { expertId: string }) {
  const router = useRouter();
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pb-6 pt-3"
      style={{ elevation: 8 }}
    >
      <Pressable
        disabled={!expertId}
        onPress={() => router.push({ pathname: '/(app)/book/[expertId]', params: { expertId } })}
        className="flex-row items-center justify-center rounded-card bg-brand py-4"
      >
        <Ionicons name="calendar-outline" size={18} color="#fff" />
        <Text className="ml-2 text-base font-bold text-ink-inverse">Book this expert</Text>
      </Pressable>
    </View>
  );
}
