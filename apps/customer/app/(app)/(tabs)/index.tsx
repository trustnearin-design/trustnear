import { useMemo, useState } from 'react';
import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { CategoryFeed } from '../../../src/components/CategoryFeed';
import { synthDeal } from '../../../src/lib/pricing';
import { colors } from '../../../src/theme/colors';
import {
  ExpertCircle,
  Gradient,
  MascotImage,
  SectionTitle,
  CouponStrip,
  TrustStrip,
  DealCardGrid,
  TwoRowCategorySlider,
  CircleLabelGrid,
  PromoBanner,
  ParentCircleRail,
  ParentTabsBar,
  FadeSlideIn,
} from '../../../src/components/ui';

/**
 * Customer home v4 — Myntra-class. Sticky top (plum hero → search → coupon →
 * circle rail → pinned tab strip); body swaps wholesale per selected parent
 * tab. "All" = a dense, image-driven mixed feed (deal cards, 2-row category
 * sliders, labelled grids, trust + promo strips); a parent tab = that
 * category's CategoryFeed.
 */
export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tree = useCategoryTree();
  const featured = useFeaturedPros(10);
  const insets = useSafeAreaInsets();

  const [selectedParent, setSelectedParent] = useState<string | null>(null);

  const onRefresh = () => {
    void tree.refetch();
    void featured.refetch();
  };

  const firstName = user?.fullName?.split(' ')[0] ?? '';
  const greeting = useGreeting();
  const parents = tree.data?.tree ?? [];
  const activeParent = selectedParent
    ? (parents.find((p) => p.slug === selectedParent) ?? null)
    : null;

  const bottomPad = 64 + insets.bottom + 32;

  const openCategory = (slug: string) =>
    router.push({ pathname: '/(app)/category/[slug]', params: { slug } });

  const tabItems = parents.map((p) => ({ slug: p.slug, name: p.name }));
  const circleItems = parents.map((p) => ({
    slug: p.slug,
    name: p.name,
    heroImageUrl: p.heroImageUrl,
  }));

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />
      <View style={{ height: insets.top, backgroundColor: colors.brand[800] }} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
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
        {/* ── [0] Hero: header + search + coupon + circle rail ─────── */}
        <View>
          <Gradient
            colors={colors.gradient.hero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingBottom: 38, paddingTop: 8 }}
          >
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
            <HeaderBar
              greeting={greeting}
              firstName={firstName}
              onLocationPress={() => router.push('/(app)/(tabs)/profile')}
              onBellPress={() => router.push('/(app)/(tabs)/bookings')}
              onAvatarPress={() => router.push('/(app)/(tabs)/profile')}
              onGridPress={() =>
                router.push({
                  pathname: '/(app)/(tabs)/categories',
                  params: selectedParent ? { parent: selectedParent } : {},
                })
              }
            />
          </Gradient>

          {/* Floating search pill straddling the hero boundary */}
          <View style={{ paddingHorizontal: 20, marginTop: -26 }}>
            <SearchPill
              onPress={() => router.push('/(app)/search')}
              onMicPress={() => router.push('/(app)/search?voice=1')}
            />
          </View>

          {/* Coupon ticket */}
          <View style={{ marginTop: 16 }}>
            <CouponStrip
              offer="FLAT 20% OFF"
              code="FIRST20"
              caption="on your first booking"
              onPress={() => router.push('/(app)/search')}
            />
          </View>

          {/* Parent circle rail — scrolls away; the tab strip below pins. */}
          <View style={{ marginTop: 18 }}>
            <ParentCircleRail
              items={circleItems}
              selected={selectedParent}
              onSelect={setSelectedParent}
            />
          </View>
        </View>

        {/* ── [1] Sticky parent tab strip ──────────────────────────── */}
        <ParentTabsBar items={tabItems} selected={selectedParent} onSelect={setSelectedParent} />

        {/* ── [2] Feed body ────────────────────────────────────────── */}
        <View key={selectedParent ?? 'all'}>
          {tree.isPending ? (
            <View className="items-center py-16">
              <ActivityIndicator color={colors.brand.DEFAULT} />
            </View>
          ) : activeParent ? (
            <CategoryFeed parent={activeParent} onOpenCategory={openCategory} />
          ) : (
            <AllFeed
              router={router}
              parents={parents}
              featured={featured}
              onOpenCategory={openCategory}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * The "All" tab feed — dense Myntra rhythm: deal cards, 2-row category
 * sliders, labelled grid, trust + promo strips, then experts and the
 * testimonial / trust / mascot closers.
 */
function AllFeed({
  router,
  parents,
  featured,
  onOpenCategory,
}: {
  router: ReturnType<typeof useRouter>;
  parents: CategoryTreeParent[];
  featured: ReturnType<typeof useFeaturedPros>;
  onOpenCategory: (slug: string) => void;
}) {
  const dealItems = useMemo(() => {
    const wanted = [
      'deep-clean',
      'ac-service',
      'salon-women',
      'spa-massage',
      'pest-control',
      'hair-makeup',
    ];
    const all = parents.flatMap((p) => p.children);
    const picked = wanted.map((s) => all.find((c) => c.slug === s)).filter(Boolean);
    const list = (picked.length ? picked : all.slice(0, 6)) as CategoryTreeParent['children'];
    return list.map((c) => {
      const deal = synthDeal(c.id, c.basePrice);
      return {
        slug: c.slug,
        name: c.name,
        imageUrl: c.heroImageUrl,
        pricePaise: c.basePrice,
        mrpPaise: deal.mrpPaise,
        discountLabel: deal.discountLabel,
      };
    });
  }, [parents]);

  const exploreItems = parents.map((p) => ({
    slug: p.slug,
    name: p.name,
    imageUrl: p.heroImageUrl,
    caption: `${p.children.length} services`,
  }));

  const sliderItems = (slug: string) =>
    childrenOf(parents, slug).map((c) => ({
      slug: c.slug,
      name: c.name,
      imageUrl: c.heroImageUrl,
      pricePaise: c.basePrice,
    }));

  return (
    <View>
      {/* Hero banner carousel */}
      <FadeSlideIn delay={0} style={{ marginTop: 18 }}>
        <BannerSlider placement="home_hero" />
      </FadeSlideIn>

      {/* Trust chips */}
      <FadeSlideIn delay={90} style={{ marginTop: 18 }}>
        <TrustStrip />
      </FadeSlideIn>

      {/* Deal of the day */}
      <FadeSlideIn delay={170} style={{ marginTop: 24 }}>
        <SectionTitle kicker="Limited time" title="Deal of the day" />
        <View style={{ marginTop: 14 }}>
          <DealCardGrid items={dealItems} onPress={onOpenCategory} />
        </View>
      </FadeSlideIn>

      {/* Home cleaning slider */}
      <View style={{ marginTop: 26 }}>
        <SectionTitle
          kicker="Most booked"
          title="Home & Cleaning"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('home-care')}
        />
        <TwoRowCategorySlider items={sliderItems('home-care')} onPress={onOpenCategory} />
      </View>

      {/* Salon promo */}
      <View style={{ marginTop: 26 }}>
        <PromoBanner
          imageUrl="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=80&auto=format&fit=crop"
          eyebrow="At your doorstep"
          title={'Salon & spa,\nat home'}
          subtitle="Sanitised kits · trained therapists"
          ctaLabel="Book now"
          tint="coral"
          onPress={() => onOpenCategory('beauty-wellness')}
        />
      </View>

      {/* Salon slider */}
      <View style={{ marginTop: 22 }}>
        <SectionTitle
          kicker="Glow up"
          title="Salon & Spa"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('beauty-wellness')}
        />
        <TwoRowCategorySlider items={sliderItems('beauty-wellness')} onPress={onOpenCategory} />
      </View>

      {/* Top experts */}
      <View style={{ marginTop: 26 }}>
        <SectionTitle
          kicker="Verified · near you"
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

      {/* Appliance slider */}
      <View style={{ marginTop: 22 }}>
        <SectionTitle
          kicker="Same-day visits"
          title="Appliance Repair"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('appliances')}
        />
        <TwoRowCategorySlider items={sliderItems('appliances')} onPress={onOpenCategory} />
      </View>

      {/* Daily help promo */}
      <View style={{ marginTop: 26 }}>
        <PromoBanner
          imageUrl="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80&auto=format&fit=crop"
          eyebrow="Hourly · verified"
          title={'Maid, cook & driver,\nby the hour'}
          subtitle="Background-checked, pay by the hour"
          ctaLabel="Book hourly"
          tint="plum"
          onPress={() => onOpenCategory('daily-help')}
        />
      </View>

      {/* Daily help slider */}
      <View style={{ marginTop: 22 }}>
        <SectionTitle
          kicker="Everyday help"
          title="Daily Help"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('daily-help')}
        />
        <TwoRowCategorySlider items={sliderItems('daily-help')} onPress={onOpenCategory} />
      </View>

      {/* Home repair slider */}
      <View style={{ marginTop: 22 }}>
        <SectionTitle
          kicker="Fix it fast"
          title="Home Repair"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('repairs')}
        />
        <TwoRowCategorySlider items={sliderItems('repairs')} onPress={onOpenCategory} />
      </View>

      {/* Explore all categories */}
      <View style={{ marginTop: 26 }}>
        <SectionTitle kicker="Browse" title="Explore all categories" />
        <View style={{ marginTop: 6 }}>
          <CircleLabelGrid items={exploreItems} columns={4} onPress={onOpenCategory} />
        </View>
      </View>

      {/* Care + vehicle + pet slider */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle kicker="More services" title="Care, vehicle & pets" />
        <TwoRowCategorySlider
          items={[
            ...sliderItems('care-services'),
            ...sliderItems('vehicle-driver'),
            ...sliderItems('pet-care'),
            ...sliderItems('outdoor'),
          ]}
          onPress={onOpenCategory}
        />
      </View>

      {/* Fitness & tutors slider */}
      <View style={{ marginTop: 24 }}>
        <SectionTitle
          kicker="Learn & train"
          title="Fitness & Tutors"
          ctaLabel="See all"
          onCtaPress={() => onOpenCategory('lifestyle')}
        />
        <TwoRowCategorySlider items={sliderItems('lifestyle')} onPress={onOpenCategory} />
      </View>

      {/* Live ribbon */}
      <View style={{ marginTop: 26 }}>
        <SectionTitle title="Live in your area" accentBar={false} />
      </View>
      <LiveStrip count={featured.data?.count ?? 12} />

      {/* Testimonials */}
      <View style={{ marginTop: 26 }}>
        <SectionTitle
          kicker="From our customers"
          title="Real stories, real homes"
          accentBar={false}
        />
      </View>
      <TestimonialStrip />

      {/* Trust narrative + mascot */}
      <TrustNarrative />
      <MascotSignoff />
    </View>
  );
}

// ─── Mascot sign-off ────────────────────────────────────────────

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
          <Text style={{ marginTop: 6, fontSize: 13, lineHeight: 19, color: colors.ink.muted }}>
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
  onGridPress,
}: {
  greeting: string;
  firstName: string;
  onLocationPress: () => void;
  onBellPress: () => void;
  onAvatarPress: () => void;
  onGridPress: () => void;
}) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
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
            maxWidth: '64%',
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

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable
            onPress={onGridPress}
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
            <Ionicons name="grid-outline" size={19} color="#FFFFFF" />
          </Pressable>
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
      <View style={{ marginTop: 18 }}>
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
            fontSize: 26,
            fontWeight: '800',
            marginTop: 4,
            letterSpacing: -0.4,
          }}
        >
          {firstName ? `${firstName} 👋` : 'Welcome 👋'}
        </Text>
      </View>
    </View>
  );
}

function SearchPill({ onPress, onMicPress }: { onPress: () => void; onMicPress: () => void }) {
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
        Try “cockroach spray”, “salon”, “AC”…
      </Text>
      <View style={{ width: 1, height: 22, backgroundColor: colors.border.DEFAULT }} />
      <Pressable onPress={onMicPress} hitSlop={10} style={{ marginLeft: 12 }}>
        <Ionicons name="mic-outline" size={20} color={colors.accent.DEFAULT} />
      </Pressable>
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
  pros: {
    id: string;
    fullName: string;
    profilePhoto: string | null;
    trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
    trustScore: number;
    primaryCategory: string | null;
    yearsExperience: number;
  }[];
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
        <LiveRow label={`${count} verified pros available right now`} color={colors.success} />
        <View style={{ height: 12 }} />
        <LiveRow label="4 bookings completed in the last hour" color={colors.brand[600]} />
        <View style={{ height: 12 }} />
        <LiveRow label="Avg arrival time: 38 min" color={colors.warning} />
      </View>
    </View>
  );
}

function LiveRow({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: 10 }}
      />
      <Text style={{ fontSize: 13, color: colors.ink.DEFAULT, fontWeight: '600' }}>{label}</Text>
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

function useGreeting(): string {
  return useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'GOOD MORNING';
    if (h < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);
}

// ─── Helpers ────────────────────────────────────────────────────

function childrenOf(parents: CategoryTreeParent[], slug: string): CategoryTreeParent['children'] {
  return parents.find((p) => p.slug === slug)?.children ?? [];
}
