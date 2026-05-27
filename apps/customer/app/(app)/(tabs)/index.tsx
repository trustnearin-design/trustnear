import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth';
import {
  useCategoryTree,
  useFeaturedPros,
  type CategoryTreeParent,
} from '../../../src/api/discovery';
import { BannerSlider } from '../../../src/components/BannerSlider';
import { colors } from '../../../src/theme/colors';
import {
  ExpertCircle,
  SectionHeader,
  LiveDot,
  Gradient,
  ServiceCard,
  FilterChipsRow,
  PromoBanner,
  PhotoCategoryTile,
  CategoryServicesStrip,
  MascotImage,
} from '../../../src/components/ui';

/**
 * D3 customer home v2 — Plum hero with greeting + location, floating
 * search pill, "Top Verified Pros" circular-avatar strip (signature
 * element), 2×2 rich category tiles, promo banner, live-area ribbon,
 * and customer testimonials.
 *
 * Single ScrollView with sectioned content; sections defer to their
 * own loading/error UIs so a slow leaf doesn't block the hero render.
 */
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tree = useCategoryTree();
  const featured = useFeaturedPros(10);

  const onRefresh = () => {
    void tree.refetch();
    void featured.refetch();
  };

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const greeting = useGreeting();
  const parents = tree.data?.tree ?? [];

  // Push content above the bottom tab bar (64) + Android gesture nav inset
  // + breathing room. Without this the last section (Trust narrative) gets
  // clipped under the tab bar on devices with edge-to-edge enabled.
  const insets = useSafeAreaInsets();
  const bottomPad = 64 + insets.bottom + 32;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              (tree.isFetching && !tree.isPending) || (featured.isFetching && !featured.isPending)
            }
            onRefresh={onRefresh}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        {/* ── Plum gradient hero ───────────────────────────────── */}
        <View>
          <Gradient
            colors={colors.gradient.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingBottom: 44 }}
          >
            {/* Coral glow top-right */}
            <View
              style={{
                position: 'absolute',
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: 120,
                backgroundColor: 'rgba(255,122,92,0.18)',
              }}
            />
            {/* Butter glow bottom-left */}
            <View
              style={{
                position: 'absolute',
                bottom: -40,
                left: -40,
                width: 180,
                height: 180,
                borderRadius: 90,
                backgroundColor: 'rgba(245,199,106,0.08)',
              }}
            />
            <SafeAreaView edges={['top']}>
              <HeaderBar
                greeting={greeting}
                firstName={firstName}
                onLocationPress={() => router.push('/(app)/(tabs)/profile')}
                onBellPress={() => router.push('/(app)/(tabs)/bookings')}
                onAvatarPress={() => router.push('/(app)/(tabs)/profile')}
              />
            </SafeAreaView>
          </Gradient>

          {/* Floating search pill, straddles the hero boundary */}
          <View style={{ paddingHorizontal: 20, marginTop: -26 }}>
            <SearchPill onPress={() => router.push('/(app)/search')} />
          </View>
        </View>

        {/* ── Top Verified Pros (round avatars) ─────────────────── */}
        <View className="mt-7 px-5">
          <SectionHeader
            eyebrow="VERIFIED · NEAR YOU"
            title="Top Experts"
            ctaLabel="See all"
            onCtaPress={() => router.push('/(app)/(tabs)/categories')}
          />
        </View>
        <FeaturedProsStrip
          loading={featured.isPending}
          error={featured.isError}
          pros={featured.data?.pros ?? []}
          onProPress={(id) => router.push({ pathname: '/(app)/pro/[id]', params: { id } })}
        />

        {/* ── Promo banner #1 — Monsoon special ─────────────────── */}
        <View style={{ marginTop: 24 }}>
          <PromoBanner
            imageUrl="https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=1200&q=80&auto=format&fit=crop"
            eyebrow="Monsoon special"
            title={'Deep clean your home\nbefore the festivities'}
            subtitle="Trained pros, ₹100 off your first booking"
            ctaLabel="Book now"
            tint="plum"
            onPress={() => goToCategory(router, 'home-care')}
          />
        </View>

        {/* ── "Most booked" with filter chips ─────────────────── */}
        <View className="mt-7 px-5">
          <SectionHeader
            eyebrow="TRENDING · NEAR YOU"
            title="Most booked services"
            ctaLabel="See all"
            onCtaPress={() => router.push('/(app)/(tabs)/categories')}
          />
        </View>
        <TrendingServicesStrip
          parents={parents}
          loading={tree.isPending}
          onCardPress={(slug) =>
            router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
          }
        />

        {/* ── Per-category slider: Home Cleaning ────────────────── */}
        <View style={{ marginTop: 28 }}>
          <CategoryServicesStrip
            eyebrow="HOME · ESSENTIALS"
            title="Home Cleaning"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'home-care')}
            services={childrenOf(parents, 'home-care')}
            badgeForIndex={(i) => (i === 0 ? 'Bestseller' : undefined)}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Promo banner #2 — Salon ───────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <PromoBanner
            imageUrl="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop"
            eyebrow="India's first"
            title={'Full Body Korean\nSpa Ritual'}
            subtitle="Sensory healing + 8 free gifts"
            ctaLabel="Book now"
            tint="coral"
            onPress={() => goToCategory(router, 'beauty-wellness')}
          />
        </View>

        {/* ── Per-category slider: Salon & Beauty ───────────────── */}
        <View style={{ marginTop: 24 }}>
          <CategoryServicesStrip
            eyebrow="AT YOUR DOORSTEP"
            title="Salon at Home"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'beauty-wellness')}
            services={childrenOf(parents, 'beauty-wellness')}
            badgeForIndex={(i) => (i === 0 ? 'Trending' : undefined)}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Per-category slider: Appliance Repair ─────────────── */}
        <View style={{ marginTop: 28 }}>
          <CategoryServicesStrip
            eyebrow="SAME DAY VISITS"
            title="Appliance Repair"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'appliances')}
            services={childrenOf(parents, 'appliances')}
            badgeForIndex={(i) => (i === 0 ? 'In 60 mins' : undefined)}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Photo category mosaic ─────────────────────────────── */}
        <View className="mt-8 px-5">
          <SectionHeader eyebrow="EXPLORE" title="All categories" />
        </View>
        {tree.isPending ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : tree.isError ? (
          <ErrorBlock onRetry={() => void tree.refetch()} />
        ) : (
          <CategoryGrid
            parents={parents}
            onPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        )}

        {/* ── Promo banner #3 — Daily help ──────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <PromoBanner
            imageUrl="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop"
            eyebrow="Daily essentials"
            title={'Hourly maid, cook,\noffice boy near you'}
            subtitle="Background-verified, pay by the hour"
            ctaLabel="Book hourly"
            tint="plum"
            onPress={() => goToCategory(router, 'daily-help')}
          />
        </View>

        {/* ── Per-category slider: Daily Help ───────────────────── */}
        <View style={{ marginTop: 24 }}>
          <CategoryServicesStrip
            eyebrow="HOURLY · VERIFIED"
            title="Daily Help"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'daily-help')}
            services={childrenOf(parents, 'daily-help')}
            badgeForIndex={(i) => (i === 0 ? 'Top pick' : undefined)}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Per-category slider: Care Services ────────────────── */}
        <View style={{ marginTop: 28 }}>
          <CategoryServicesStrip
            eyebrow="TRUSTED · BACKGROUND-CHECKED"
            title="Care for your loved ones"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'care-services')}
            services={childrenOf(parents, 'care-services')}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Per-category slider: Vehicle & Driver ─────────────── */}
        <View style={{ marginTop: 28 }}>
          <CategoryServicesStrip
            eyebrow="ON YOUR DOORSTEP"
            title="Car wash, bike wash & driver"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'vehicle-driver')}
            services={childrenOf(parents, 'vehicle-driver')}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Promo banner #4 — Pet care ────────────────────────── */}
        <View style={{ marginTop: 28 }}>
          <PromoBanner
            imageUrl="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1200&q=80&auto=format&fit=crop"
            eyebrow="For your best friend"
            title={'Dog grooming\nat your home'}
            subtitle="Certified groomers with hydraulic table + own kit"
            ctaLabel="Pamper your pet"
            tint="coral"
            onPress={() => goToCategory(router, 'pet-care')}
          />
        </View>

        {/* ── Per-category slider: Pet Care + Outdoor ───────────── */}
        <View style={{ marginTop: 24 }}>
          <CategoryServicesStrip
            eyebrow="PETS · GARDEN · LAUNDRY"
            title="Outdoor & Pet"
            ctaLabel="See all"
            onCtaPress={() => goToCategory(router, 'pet-care')}
            services={[...childrenOf(parents, 'pet-care'), ...childrenOf(parents, 'outdoor')]}
            onCardPress={(slug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug } })
            }
          />
        </View>

        {/* ── Promo banner carousel (existing) ──────────────────── */}
        <View style={{ marginTop: 28 }}>
          <BannerSlider placement="home_hero" />
        </View>

        {/* ── Live in your area ribbon ──────────────────────────── */}
        <View className="mt-8 px-5">
          <SectionHeader title="Live in your area" />
        </View>
        <LiveStrip count={featured.data?.count ?? 12} />

        {/* ── Customer testimonials ─────────────────────────────── */}
        <View className="mt-8 px-5">
          <SectionHeader
            eyebrow="FROM OUR CUSTOMERS"
            title="Real stories from your neighbourhood"
          />
        </View>
        <TestimonialStrip />

        {/* ── Trust narrative footer ────────────────────────────── */}
        <TrustNarrative />

        {/* ── Mascot sign-off ────────────────────────────────────── */}
        <MascotSignoff />
      </ScrollView>
    </View>
  );
}

// ─── Mascot sign-off — last thing on home tab ───────────────────────
// A namaste mascot with a warm "we're here for you" message — the
// emotional closer on the home feed that food/travel apps (Toing /
// Swiggy) put at the bottom to leave a premium last impression.

function MascotSignoff() {
  return (
    <View
      style={{
        marginTop: 32,
        marginHorizontal: 20,
        marginBottom: 8,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: colors.support[50],
        borderWidth: 1,
        borderColor: colors.support[100],
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(255,122,92,0.10)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -30,
          left: -30,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: 'rgba(245,199,106,0.18)',
        }}
      />
      <View
        style={{
          paddingVertical: 24,
          paddingHorizontal: 20,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: colors.accent[700],
            }}
          >
            From our family
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 22,
              fontWeight: '800',
              lineHeight: 28,
              color: colors.ink.DEFAULT,
              letterSpacing: -0.4,
            }}
          >
            Bharose ke saath,{'\n'}aapke ghar tak.
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 13,
              lineHeight: 19,
              color: colors.ink.muted,
            }}
          >
            Verified. Reliable. Always near.
          </Text>
        </View>
        <MascotImage variant="celebrator" tone="butter" size={130} />
      </View>
    </View>
  );
}

// ─── Hero / Header ──────────────────────────────────────────────

function HeaderBar({
  greeting,
  firstName,
  onLocationPress,
  onBellPress,
  onAvatarPress,
}: {
  greeting: string;
  firstName: string;
  onLocationPress: () => void;
  onBellPress: () => void;
  onAvatarPress: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Location chip — left */}
        <Pressable
          onPress={onLocationPress}
          hitSlop={8}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: 'rgba(255,255,255,0.10)',
            maxWidth: '70%',
          }}
        >
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: colors.accent.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="location" size={14} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 8, flexShrink: 1 }}>
            <Text
              style={{
                color: colors.support[300],
                fontSize: 9,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
              }}
            >
              Delivering to
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>
                Vaishali Nagar, Jaipur
              </Text>
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </View>
        </Pressable>

        {/* Bell + avatar — right */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={onBellPress}
            hitSlop={10}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.10)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={onAvatarPress}
            hitSlop={6}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: colors.accent.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.30)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '800' }}>
              {firstName.charAt(0).toUpperCase() || '?'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Greeting */}
      <View style={{ marginTop: 22 }}>
        <Text
          style={{
            color: colors.support[300],
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
          }}
        >
          {greeting}
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 28,
            fontWeight: '800',
            marginTop: 4,
            letterSpacing: -0.4,
          }}
        >
          {firstName ? `${firstName} 👋` : 'Welcome 👋'}
        </Text>
        <Text style={{ color: colors.brand[200], fontSize: 14, marginTop: 4 }}>
          Verified pros at your doorstep
        </Text>
      </View>
    </View>
  );
}

function SearchPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface.DEFAULT,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
      }}
    >
      <Ionicons name="search" size={18} color={colors.ink.subtle} />
      <Text
        style={{
          marginLeft: 12,
          flex: 1,
          fontSize: 14,
          color: colors.ink.subtle,
          fontWeight: '500',
        }}
      >
        Search for cleaning, salon, AC…
      </Text>
      <View style={{ width: 1, height: 22, backgroundColor: colors.border.DEFAULT }} />
      <Ionicons
        name="mic-outline"
        size={18}
        color={colors.accent.DEFAULT}
        style={{ marginLeft: 12 }}
      />
    </Pressable>
  );
}

// ─── Featured pros strip ────────────────────────────────────────

function FeaturedProsStrip({
  loading,
  error,
  pros,
  onProPress,
}: {
  loading: boolean;
  error: boolean;
  pros: Array<{
    id: string;
    fullName: string;
    profilePhoto: string | null;
    trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
    trustScore: number;
    primaryCategory: string | null;
    yearsExperience: number;
  }>;
  onProPress: (id: string) => void;
}) {
  if (loading) {
    return (
      <View style={{ paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' }}>
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </View>
    );
  }
  if (error || pros.length === 0) {
    return (
      <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
        <Text style={{ color: colors.ink.subtle, fontSize: 13, fontStyle: 'italic' }}>
          New experts joining your area — check back soon.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      {pros.map((p) => {
        const rating = Math.min(5, Math.max(0, p.trustScore / 20));
        const subtitle = p.primaryCategory
          ? `${p.primaryCategory} · ${p.yearsExperience}y`
          : `${p.yearsExperience}y exp`;
        return (
          <View key={p.id} style={{ marginHorizontal: 4 }}>
            <ExpertCircle
              fullName={p.fullName}
              photoUrl={p.profilePhoto}
              rating={rating}
              tier={p.trustBadge}
              subtitle={subtitle}
              onPress={() => onProPress(p.id)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Trending in Jaipur (D6 sample) ────────────────────────────────
// Renders a row of parent-category filter chips + a horizontal scroll of
// service cards (leaf categories). When a chip is selected, only leaves
// under that parent are shown; "All" flattens leaves across every parent.

function TrendingServicesStrip({
  parents,
  loading,
  onCardPress,
}: {
  parents: CategoryTreeParent[];
  loading: boolean;
  onCardPress: (slug: string) => void;
}) {
  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const chips = useMemo(
    () => parents.map((p) => ({ key: p.slug, label: p.name, count: p.children.length })),
    [parents],
  );

  const visibleLeaves = useMemo(() => {
    if (selectedParent) {
      return parents.find((p) => p.slug === selectedParent)?.children ?? [];
    }
    // "All" mode: take top 2 from each parent for variety, capped at 12 total.
    const flattened = parents.flatMap((p) => p.children.slice(0, 2));
    return flattened.slice(0, 12);
  }, [parents, selectedParent]);

  if (loading) {
    return (
      <View style={{ paddingVertical: 40, alignItems: 'center' }}>
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </View>
    );
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View>
      <View style={{ marginTop: 12 }}>
        <FilterChipsRow chips={chips} selectedKey={selectedParent} onSelect={setSelectedParent} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, gap: 12 }}
      >
        {visibleLeaves.length === 0 ? (
          <View
            style={{
              width: 200,
              paddingVertical: 24,
              alignItems: 'center',
              backgroundColor: colors.surface.muted,
              borderRadius: 14,
            }}
          >
            <Text style={{ color: colors.ink.subtle, fontSize: 13 }}>No services yet</Text>
          </View>
        ) : (
          visibleLeaves.map((leaf) => (
            <ServiceCard
              key={leaf.id}
              width={200}
              imageUrl={leaf.heroImageUrl}
              title={leaf.name}
              subtitle={leaf.professionalTitle ?? undefined}
              rating={4.6 + (Math.abs(leaf.id.charCodeAt(0)) % 4) * 0.1}
              ratingCount={`${100 + (Math.abs(leaf.id.charCodeAt(1)) % 900)}+`}
              pricePaise={leaf.basePrice}
              durationLabel={`${leaf.minDurationMinutes} min`}
              onPress={() => onCardPress(leaf.slug)}
              onAddPress={() => onCardPress(leaf.slug)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function CategoryGrid({
  parents,
  onPress,
}: {
  parents: CategoryTreeParent[];
  onPress: (slug: string) => void;
}) {
  // Photo-driven mosaic: 3-col grid with bigger first tile per row pattern.
  // For now uniform 3-col with PhotoCategoryTile — fast, dense, image-heavy
  // (YesMadam "Explore Our Categories" pattern). Switch to a mixed mosaic
  // (1 wide + 2 small) in a future iteration if Vikas wants more variety.

  const minPrice = (p: CategoryTreeParent) => {
    if (!p.children.length) return null;
    const m = p.children.reduce((acc, c) => Math.min(acc, c.basePrice), Number.MAX_SAFE_INTEGER);
    return m === Number.MAX_SAFE_INTEGER ? null : `From ₹${Math.round(m / 100)}`;
  };

  const rows: CategoryTreeParent[][] = [];
  for (let i = 0; i < parents.length; i += 3) {
    rows.push(parents.slice(i, i + 3));
  }

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 6 }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: i === 0 ? 0 : 10, gap: 10 }}>
          {row.map((p) => (
            <PhotoCategoryTile
              key={p.id}
              imageUrl={p.heroImageUrl ?? p.bannerUrl}
              title={p.name}
              subtitle={`${p.children.length} services`}
              startingPrice={minPrice(p) ?? undefined}
              aspectRatio={0.85}
              onPress={() => onPress(p.slug)}
            />
          ))}
          {/* Spacers to keep last row's tiles aligned at left when < 3 items */}
          {row.length < 3
            ? Array.from({ length: 3 - row.length }).map((_, k) => (
                <View key={`spacer-${k}`} style={{ flex: 1 }} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

// ─── Live in area ribbon ────────────────────────────────────────

function LiveStrip({ count }: { count: number }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
      <View
        style={{
          backgroundColor: colors.surface.DEFAULT,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border.DEFAULT,
          padding: 16,
        }}
      >
        <LiveDot label={`${count} verified pros available right now`} tone="success" />
        <View style={{ height: 12 }} />
        <LiveDot label="4 bookings completed in last hour" tone="brand" />
        <View style={{ height: 12 }} />
        <LiveDot label="Avg arrival time: 38 min" tone="warning" />
      </View>
    </View>
  );
}

// ─── Testimonials ───────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote:
      'Cleaning team came on time, used their own supplies. House was spotless before guests arrived.',
    name: 'Priya M.',
    sub: 'Deep Clean · Vaishali Nagar',
    rating: 5,
  },
  {
    quote:
      'Plumber fixed three leaks in one visit. Parts at MRP, no hidden charges. Will book again.',
    name: 'Rohan S.',
    sub: 'Plumbing · C-Scheme',
    rating: 5,
  },
  {
    quote:
      'Beautician was professional, used new disposables, finished my bridal trial in 90 mins.',
    name: 'Anjali T.',
    sub: 'Hair & Makeup · Malviya Nagar',
    rating: 5,
  },
];

function TestimonialStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}
      decelerationRate="fast"
      snapToInterval={280 + 12}
    >
      {TESTIMONIALS.map((t, i) => (
        <View
          key={i}
          style={{
            width: 280,
            marginHorizontal: 6,
            backgroundColor: colors.surface.DEFAULT,
            borderRadius: 18,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
          }}
        >
          <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {Array.from({ length: t.rating }).map((_, j) => (
              <Text key={j} style={{ color: colors.support[600], fontSize: 14, marginRight: 1 }}>
                ★
              </Text>
            ))}
          </View>
          <Text style={{ color: colors.ink.DEFAULT, fontSize: 14, lineHeight: 21 }}>
            “{t.quote}”
          </Text>
          <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: colors.brand[200],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.brand[800], fontWeight: '800', fontSize: 11 }}>
                {t.name.charAt(0)}
              </Text>
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={{ color: colors.ink.DEFAULT, fontSize: 12, fontWeight: '700' }}>
                {t.name}
              </Text>
              <Text style={{ color: colors.ink.subtle, fontSize: 11 }}>{t.sub}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Trust narrative footer ─────────────────────────────────────

function TrustNarrative() {
  return (
    <View style={{ marginHorizontal: 20, marginTop: 28 }}>
      <Gradient
        colors={colors.gradient.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 20, overflow: 'hidden' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.accent.DEFAULT,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
          <Text
            style={{
              marginLeft: 10,
              color: colors.support[300],
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
            }}
          >
            Why TrustNear
          </Text>
        </View>
        <Text
          style={{
            marginTop: 14,
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '800',
            lineHeight: 24,
          }}
        >
          Every expert verified before{'\n'}they reach your home
        </Text>
        <View style={{ marginTop: 16, flexDirection: 'row', flexWrap: 'wrap' }}>
          <TrustBadge icon="finger-print" label="Aadhaar" />
          <TrustBadge icon="person-circle" label="Face match" />
          <TrustBadge icon="card" label="Bank KYC" />
          <TrustBadge icon="shield-checkmark" label="Police-checked" />
        </View>
      </Gradient>
    </View>
  );
}

function TrustBadge({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View
      style={{
        marginBottom: 8,
        marginRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: 'rgba(255,255,255,0.10)',
      }}
    >
      <Ionicons name={icon} size={13} color={colors.support.DEFAULT} />
      <Text style={{ marginLeft: 6, color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 10,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(194,54,42,0.30)',
        backgroundColor: 'rgba(194,54,42,0.06)',
      }}
    >
      <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600' }}>
        Couldn&apos;t load services. Check your connection.
      </Text>
      <Pressable onPress={onRetry} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <Text style={{ color: colors.brand[700], fontSize: 14, fontWeight: '700' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

function useGreeting(): string {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);
}

// ─── Section helpers (used by multiple banner+slider blocks) ──────

function childrenOf(parents: CategoryTreeParent[], slug: string): CategoryTreeParent['children'] {
  return parents.find((p) => p.slug === slug)?.children ?? [];
}

function goToCategory(router: ReturnType<typeof useRouter>, slug: string): void {
  router.push({ pathname: '/(app)/category/[slug]', params: { slug } });
}
