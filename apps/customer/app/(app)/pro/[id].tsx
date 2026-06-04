import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useProDetail, type ProDetail, type ProReview } from '../../../src/api/discovery';
import {
  badgeColors,
  badgeLabel,
  formatResponseTime,
  formatRupees,
  priceUnitLabel,
} from '../../../src/lib/format';
import { categoryPhoto, portfolioFor } from '../../../src/lib/imagery';
import { shareExpert } from '../../../src/lib/links';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';
import { BrandHero, CoralButton } from '../../../src/components/ui';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ExpertDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, isFetching, refetch } = useProDetail(id);
  const insets = useSafeAreaInsets();
  // Sticky CTA: 28px top padding + 56px button + 24px bottom + safe-area inset.
  // Leave at least 24px of breathing room above the bar so content doesn't
  // crowd it when scrolled to the bottom.
  const ctaHeight = 28 + 56 + Math.max(insets.bottom, 16);

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      {isPending ? (
        <SafeAreaView className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </SafeAreaView>
      ) : isError || !data ? (
        <SafeAreaView className="flex-1 items-center justify-center px-6">
          <Ionicons name="cloud-offline-outline" size={36} color={colors.ink.subtle} />
          <Text className="mt-3 text-center text-sm text-danger">
            Couldn&apos;t load this expert. Try again.
          </Text>
          <Pressable onPress={() => void refetch()} className="mt-3">
            <Text className="text-sm font-semibold text-brand">Try again</Text>
          </Pressable>
        </SafeAreaView>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: ctaHeight + 24 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
            }
          >
            <Hero pro={data} />
            <IdentityBlock pro={data} />
            <StatStrip pro={data} />
            <CertificationsRow pro={data} />
            <VerificationGrid pro={data} />
            {data.bio ? <SectionHeader title="About" /> : null}
            {data.bio ? (
              <View className="mx-5 mt-2 rounded-card bg-surface p-4">
                <Text className="text-[14px] leading-[22px] text-ink-muted">{data.bio}</Text>
              </View>
            ) : null}
            <PortfolioSection pro={data} expertId={id ?? ''} />
            <ServicesSection pro={data} />
            <ScheduleSection pro={data} />
            <ReviewsSection pro={data} />
          </ScrollView>

          <StickyBookBar pro={data} expertId={id ?? ''} />
        </>
      )}
    </View>
  );
}

// ─── Hero ────────────────────────────────────────────────────────

function Hero({ pro }: { pro: ProDetail }) {
  const router = useRouter();
  const primaryCategory = pro.serviceOfferings[0]?.category.name ?? null;
  return (
    <BrandHero
      onBack={() => router.back()}
      bottomGap={56}
      rightSlot={
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            hitSlop={10}
            onPress={() =>
              void shareExpert({
                professionalId: pro.id,
                fullName: pro.user.fullName,
                title: pro.professionalTitle,
              })
            }
            style={{
              marginRight: 8,
              height: 40,
              width: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <Ionicons name="share-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            hitSlop={10}
            style={{
              height: 40,
              width: 40,
              borderRadius: 20,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.18)',
            }}
          >
            <Ionicons name="heart-outline" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      }
    >
      <View style={{ paddingTop: 4 }}>
        {primaryCategory ? (
          <Text
            style={{
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: colors.support[300],
            }}
          >
            {primaryCategory}
          </Text>
        ) : null}
        <Text
          style={{
            marginTop: primaryCategory ? 4 : 0,
            color: '#FFFFFF',
            fontSize: 24,
            fontWeight: '800',
            letterSpacing: -0.3,
          }}
          numberOfLines={1}
        >
          {pro.user.fullName}
        </Text>
        {pro.professionalTitle ? (
          <Text style={{ marginTop: 4, fontSize: 13, color: colors.brand[200] }}>
            {pro.professionalTitle}
          </Text>
        ) : null}
      </View>
    </BrandHero>
  );
}

// ─── Identity ────────────────────────────────────────────────────

function IdentityBlock({ pro }: { pro: ProDetail }) {
  const badge = badgeColors(pro.trustBadge);
  return (
    <View className="px-5">
      <View className="-mt-12 flex-row items-end">
        <View
          style={{
            padding: 3,
            borderRadius: 52,
            backgroundColor:
              pro.trustBadge === 'platinum' || pro.trustBadge === 'gold'
                ? colors.accent.DEFAULT
                : '#FFFFFF',
          }}
        >
          <Avatar
            fullName={pro.user.fullName}
            photoUrl={pro.user.profilePhoto ?? undefined}
            size={92}
            borderColor="#FFFFFF"
          />
        </View>
        {pro.availabilityStatus === 'online' ? (
          <View className="ml-3 mb-2 flex-row items-center rounded-pill bg-success/10 px-2.5 py-1">
            <View className="h-1.5 w-1.5 rounded-full bg-success" />
            <Text className="ml-1.5 text-[11px] font-bold text-success">Online now</Text>
          </View>
        ) : null}
      </View>

      <View className="mt-3 flex-row items-center">
        <Text numberOfLines={1} className="flex-1 text-[22px] font-bold text-ink">
          {pro.user.fullName}
        </Text>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      </View>

      <View className="mt-1 flex-row items-center">
        {pro.trustBadge !== 'none' ? (
          <View
            className="mr-2 flex-row items-center rounded-pill px-2.5 py-1"
            style={{ backgroundColor: badge.bg }}
          >
            <Ionicons
              name="shield-checkmark"
              size={11}
              color={badge.text}
              style={{ marginRight: 3 }}
            />
            <Text className="text-[11px] font-bold" style={{ color: badge.text }}>
              {badgeLabel(pro.trustBadge)} Expert
            </Text>
          </View>
        ) : null}
        {pro.professionalTitle ? (
          <Text numberOfLines={1} className="flex-1 text-[13px] text-ink-muted">
            {pro.professionalTitle}
          </Text>
        ) : null}
      </View>

      {pro.user.area || pro.user.city ? (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="location-outline" size={13} color={colors.ink.subtle} />
          <Text className="ml-1 text-[12px] text-ink-muted">
            {[pro.user.area, pro.user.city].filter(Boolean).join(', ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Stat strip ──────────────────────────────────────────────────

function StatStrip({ pro }: { pro: ProDetail }) {
  return (
    <View
      className="mx-5 mt-4 flex-row rounded-card bg-surface py-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <Stat label="Trust" value={Number(pro.trustScore).toFixed(0)} icon="shield" highlight />
      <Stat label="Jobs" value={String(pro.totalBookings)} icon="briefcase" />
      <Stat label="Years" value={`${pro.yearsExperience}`} icon="ribbon" />
      <Stat
        label="Responds"
        value={formatResponseTime(pro.avgResponseTimeSeconds)}
        icon="flash"
        last
      />
    </View>
  );
}

function Stat({
  label,
  value,
  icon,
  last,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  last?: boolean;
  highlight?: boolean;
}) {
  return (
    <View className={`flex-1 items-center ${last ? '' : 'border-r border-border'}`}>
      <Ionicons
        name={icon}
        size={16}
        color={highlight ? colors.accent.DEFAULT : colors.brand.DEFAULT}
      />
      <Text className="mt-1.5 text-[16px] font-bold text-ink">{value}</Text>
      <Text className="mt-0.5 text-[10px] font-semibold uppercase tracking-[1px] text-ink-subtle">
        {label}
      </Text>
    </View>
  );
}

// ─── Certifications (derived from badge tier) ────────────────────

function CertificationsRow({ pro }: { pro: ProDetail }) {
  const certs = certsForBadge(pro.trustBadge);
  if (certs.length === 0) return null;
  return (
    <View className="mt-5">
      <SectionHeader title="Certifications" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
      >
        {certs.map((c, i) => (
          <View
            key={`${i}-${c.label}`}
            className="mr-2 flex-row items-center rounded-pill border border-accent/30 bg-accent/10 px-3 py-2"
          >
            <Ionicons name={c.icon} size={14} color={colors.accent[600]} />
            <Text className="ml-1.5 text-[12px] font-bold text-ink">{c.label}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function certsForBadge(
  badge: ProDetail['trustBadge'],
): Array<{ label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> {
  const base: Array<{ label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
    { label: 'Background checked', icon: 'shield-checkmark' },
  ];
  if (badge === 'bronze') return base;
  if (badge === 'silver') return [...base, { label: 'TrustNear Verified', icon: 'ribbon' }];
  if (badge === 'gold')
    return [
      ...base,
      { label: 'TrustNear Verified Pro', icon: 'ribbon' },
      { label: 'Hygiene Certified', icon: 'leaf' },
    ];
  if (badge === 'platinum')
    return [
      ...base,
      { label: 'TrustNear Elite', icon: 'trophy' },
      { label: '5-Star Hygiene', icon: 'leaf' },
      { label: "Customer's Choice 2026", icon: 'star' },
    ];
  return [];
}

// ─── Verification grid ──────────────────────────────────────────

function VerificationGrid({ pro }: { pro: ProDetail }) {
  const items: Array<{
    key: string;
    label: string;
    ok: boolean;
    icon: React.ComponentProps<typeof Ionicons>['name'];
  }> = [
    { key: 'aadhaar', label: 'Aadhaar', icon: 'finger-print', ok: pro.aadhaarVerified },
    { key: 'bank', label: 'Bank KYC', icon: 'card', ok: pro.bankVerified },
    { key: 'police', label: 'Police', icon: 'shield-checkmark', ok: pro.policeVerified },
  ];
  return (
    <View className="mt-6">
      <SectionHeader title="Verified by TrustNear" />
      <View className="mx-5 mt-2 flex-row flex-wrap">
        {items.map((it) => (
          <View key={it.key} className="w-1/2 p-1">
            <View
              className={`flex-row items-center rounded-card p-3 ${
                it.ok
                  ? 'border border-success/20 bg-success/5'
                  : 'border border-border bg-surface-muted'
              }`}
            >
              <View
                className={`mr-3 h-9 w-9 items-center justify-center rounded-full ${
                  it.ok ? 'bg-success/15' : 'bg-surface'
                }`}
              >
                <Ionicons
                  name={it.icon}
                  size={18}
                  color={it.ok ? colors.success : colors.ink.subtle}
                />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-bold text-ink">{it.label}</Text>
                <Text
                  className={`mt-0.5 text-[10px] font-semibold ${
                    it.ok ? 'text-success' : 'text-ink-subtle'
                  }`}
                >
                  {it.ok ? 'Verified' : 'Pending'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Section header ──────────────────────────────────────────────

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between px-5">
      <Text className="text-[17px] font-bold text-ink">{title}</Text>
      {action ? (
        <Pressable onPress={action.onPress}>
          <Text className="text-[13px] font-bold text-brand">{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Portfolio ──────────────────────────────────────────────────

function PortfolioSection({ pro, expertId }: { pro: ProDetail; expertId: string }) {
  // Prefer the pro's own uploaded work; fall back to curated category
  // imagery only while their gallery is empty.
  const slugs = pro.serviceOfferings.map((o) => o.category.slug);
  const shots =
    pro.portfolioUrls && pro.portfolioUrls.length > 0
      ? pro.portfolioUrls
      : portfolioFor(expertId, slugs);
  if (shots.length === 0) return null;
  return (
    <View className="mt-6">
      <SectionHeader title="Recent work" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
      >
        {shots.map((uri, idx) => (
          <View
            key={`${idx}-${uri}`}
            className="mr-3 overflow-hidden rounded-card"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.08,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <Image
              source={{ uri }}
              style={{ width: 160, height: 200, backgroundColor: colors.surface.muted }}
              resizeMode="cover"
            />
            {idx === 0 ? (
              <View className="absolute left-2 top-2 rounded-pill bg-accent px-2 py-0.5">
                <Text
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: colors.brand.DEFAULT }}
                >
                  Featured
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Services ────────────────────────────────────────────────────

function ServicesSection({ pro }: { pro: ProDetail }) {
  if (pro.serviceOfferings.length === 0) return null;
  return (
    <View className="mt-6">
      <SectionHeader title="Services offered" />
      <View className="mx-5 mt-2 overflow-hidden rounded-card bg-surface">
        {pro.serviceOfferings.map((o, idx) => (
          <View
            key={o.category.id}
            className={`flex-row items-center px-4 py-3.5 ${
              idx < pro.serviceOfferings.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <ImageBackground
              source={{ uri: categoryPhoto(o.category.slug) }}
              style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden' }}
              imageStyle={{ borderRadius: 10 }}
            />
            <View className="ml-3 flex-1">
              <Text className="text-[14px] font-bold text-ink">{o.category.name}</Text>
              <Text className="mt-0.5 text-[11px] text-ink-subtle">
                {o.experienceYears}y experience
              </Text>
            </View>
            <Text className="text-[14px] font-bold text-brand">
              {formatRupees(o.customPrice ?? o.category.basePrice)}
              {priceUnitLabel(o.category.priceUnit)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Schedule ────────────────────────────────────────────────────

function ScheduleSection({ pro }: { pro: ProDetail }) {
  if (pro.schedules.length === 0) return null;
  return (
    <View className="mt-6">
      <SectionHeader title="Weekly availability" />
      <View className="mx-5 mt-2 rounded-card bg-surface p-2">
        {pro.schedules.map((s) => (
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
    </View>
  );
}

// ─── Reviews ─────────────────────────────────────────────────────

function ReviewsSection({ pro }: { pro: ProDetail }) {
  return (
    <View className="mt-6">
      <SectionHeader title="Recent reviews" />
      <View className="mx-5 mt-2">
        {pro.reviews.length === 0 ? (
          <View className="rounded-card bg-surface p-5 items-center">
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.ink.subtle} />
            <Text className="mt-2 text-sm text-ink-muted">No reviews yet</Text>
            <Text className="mt-1 text-[12px] text-ink-subtle">
              Be the first to book and review
            </Text>
          </View>
        ) : (
          pro.reviews.map((r) => <ReviewCard key={r.id} review={r} />)
        )}
      </View>
    </View>
  );
}

function ReviewCard({ review }: { review: ProReview }) {
  return (
    <View
      className="mb-3 rounded-card bg-surface p-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center">
        <Avatar
          fullName={review.customer.fullName}
          photoUrl={review.customer.profilePhoto ?? undefined}
          size={40}
        />
        <View className="ml-3 flex-1">
          <Text className="text-[13px] font-bold text-ink">{review.customer.fullName}</Text>
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
        <Text className="mt-2 text-[13px] leading-[20px] text-ink-muted">{review.reviewText}</Text>
      ) : null}
      {review.proResponse ? (
        <View className="mt-3 rounded-card bg-brand-50 p-3">
          <Text className="text-[10px] font-bold uppercase tracking-[1.5px] text-brand">
            Expert responded
          </Text>
          <Text className="mt-1 text-[12px] text-ink-muted">{review.proResponse}</Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Sticky book bar ─────────────────────────────────────────────

function StickyBookBar({ pro, expertId }: { pro: ProDetail; expertId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const firstOffering = pro.serviceOfferings[0];
  const fromPrice = firstOffering
    ? (firstOffering.customPrice ?? firstOffering.category.basePrice)
    : null;
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pt-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      <View className="flex-row items-center justify-between">
        {fromPrice != null ? (
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: colors.ink.subtle,
              }}
            >
              Starts from
            </Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.accent[700] }}>
              {formatRupees(fromPrice)}
              <Text style={{ fontSize: 12, color: colors.ink.muted, fontWeight: '600' }}>
                {priceUnitLabel(firstOffering?.category.priceUnit ?? 'per_hour')}
              </Text>
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <View style={{ flex: 1.2 }}>
          <CoralButton
            label="Book now"
            icon="calendar-outline"
            onPress={() =>
              router.push({ pathname: '/(app)/book/[expertId]', params: { expertId } })
            }
            disabled={!expertId}
          />
        </View>
      </View>
    </View>
  );
}
