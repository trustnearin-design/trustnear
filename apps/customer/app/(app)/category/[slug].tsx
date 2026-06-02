import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  useCategoryDetail,
  useNearbyPros,
  type NearbyPro,
  type CategoryDetail,
} from '../../../src/api/discovery';
import { FALLBACK_COORDS, getCurrentCoords, type UserCoords } from '../../../src/lib/location';
import {
  badgeColors,
  badgeLabel,
  formatResponseTime,
  formatRupees,
  priceUnitLabel,
} from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';
import {
  BrandHero,
  Chip,
  MascotImage,
  SectionHeader,
  CoralButton,
  ServiceCard,
  PromoBanner,
  FilterChipsRow,
  type FilterChip,
} from '../../../src/components/ui';

/**
 * D4 category screen — Plum gradient hero with category-appropriate Sevak
 * mascot, then either:
 *
 *   Parent (parentId === null)  → rich CategoryTile grid for children
 *   Leaf  (parentId set)        → Includes + How-it-works + experts list
 *
 * The category endpoint returns `parent` and `children` so both views can
 * render without a follow-up round trip.
 */
export default function CategoryScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const c = await getCurrentCoords().catch(() => null);
      if (cancelled) return;
      if (c) {
        setCoords(c);
        setUsingFallback(false);
      } else {
        setCoords(FALLBACK_COORDS);
        setUsingFallback(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const category = useCategoryDetail(slug);
  const isParent = category.data ? category.data.parentId == null : null;

  const nearby = useNearbyPros(
    isParent === false && coords && slug
      ? { lat: coords.lat, lng: coords.lng, category: slug }
      : null,
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={nearby.isFetching || category.isFetching}
            onRefresh={() => {
              void category.refetch();
              void nearby.refetch();
            }}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        <CategoryHero
          name={category.data?.name ?? ''}
          parentName={category.data?.parent?.name ?? null}
          shortPitch={category.data?.shortPitch ?? null}
          slug={slug ?? ''}
          onBack={() => router.back()}
        />

        {category.isPending ? (
          <View className="py-12">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : category.isError || !category.data ? (
          <ErrorBlock onRetry={() => void category.refetch()} />
        ) : isParent ? (
          <ParentLanding
            category={category.data}
            onChildPress={(childSlug) =>
              router.push({ pathname: '/(app)/category/[slug]', params: { slug: childSlug } })
            }
          />
        ) : (
          <LeafLanding
            category={category.data}
            usingFallback={usingFallback}
            nearby={nearby}
            onProPress={(id) => router.push({ pathname: '/(app)/pro/[id]', params: { id } })}
            onBookPress={(id) =>
              router.push({ pathname: '/(app)/book/[expertId]', params: { expertId: id } })
            }
            ready={coords !== null}
          />
        )}
      </ScrollView>
    </View>
  );
}

// ─── Hero ────────────────────────────────────────────────────────

/**
 * Mascot variant + tone per parent or popular leaf slug. Falls back to
 * 'cleaner' / coral if unmapped — every category gets some character.
 */
const MASCOT_FOR_SLUG: Record<
  string,
  {
    variant: React.ComponentProps<typeof MascotImage>['variant'];
    tone: 'plum' | 'coral' | 'butter';
  }
> = {
  'home-care': { variant: 'cleaner', tone: 'plum' },
  'home-cleaning': { variant: 'cleaner', tone: 'plum' },
  'deep-clean': { variant: 'cleaner', tone: 'plum' },
  'pest-control': { variant: 'cleaner', tone: 'butter' },
  sanitization: { variant: 'cleaner', tone: 'butter' },
  repairs: { variant: 'plumber', tone: 'coral' },
  plumbing: { variant: 'plumber', tone: 'coral' },
  electrical: { variant: 'electrician', tone: 'butter' },
  'ac-service': { variant: 'electrician', tone: 'coral' },
  'appliance-repair': { variant: 'electrician', tone: 'coral' },
  'beauty-wellness': { variant: 'beautician', tone: 'butter' },
  'salon-women': { variant: 'beautician', tone: 'butter' },
  'spa-massage': { variant: 'beautician', tone: 'plum' },
  'hair-makeup': { variant: 'beautician', tone: 'coral' },
  'mens-grooming': { variant: 'beautician', tone: 'plum' },
  lifestyle: { variant: 'trainer', tone: 'plum' },
  'fitness-trainer': { variant: 'trainer', tone: 'coral' },
  yoga: { variant: 'trainer', tone: 'butter' },
  photography: { variant: 'celebrator', tone: 'butter' },
  tutor: { variant: 'verifier', tone: 'plum' },
};

function CategoryHero({
  name,
  parentName,
  shortPitch,
  slug,
  onBack,
}: {
  name: string;
  parentName: string | null;
  shortPitch: string | null;
  slug: string;
  onBack: () => void;
}) {
  const mascot = MASCOT_FOR_SLUG[slug] ?? { variant: 'greeter' as const, tone: 'coral' as const };
  return (
    <BrandHero
      onBack={onBack}
      bottomGap={28}
      rightSlot={
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
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 6 }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          {parentName ? (
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: 'rgba(255,122,92,0.30)',
              }}
            >
              <Text
                style={{
                  color: colors.support[200],
                  fontSize: 10,
                  fontWeight: '800',
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                }}
              >
                {parentName}
              </Text>
            </View>
          ) : null}
          <Text
            style={{
              marginTop: parentName ? 10 : 0,
              color: '#FFFFFF',
              fontSize: 28,
              fontWeight: '800',
              lineHeight: 34,
              letterSpacing: -0.4,
            }}
          >
            {name}
          </Text>
          {shortPitch ? (
            <Text
              style={{
                marginTop: 6,
                color: colors.brand[200],
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {shortPitch}
            </Text>
          ) : null}
        </View>
        <MascotImage variant={mascot.variant} tone={mascot.tone} size={110} />
      </View>
    </BrandHero>
  );
}

// ─── Parent: photo-driven child cards (D6 — marketplace v3 style) ──

/** ₹500 in paise — anything below this is the "Budget" pill bucket. */
const BUDGET_THRESHOLD_PAISE = 50000;

type ParentChild = NonNullable<CategoryDetail['children']>[number];

type FilterKey = 'budget' | 'hourly' | 'visit';

const FILTER_PREDICATES: Record<FilterKey, (c: ParentChild) => boolean> = {
  budget: (c) => c.basePrice < BUDGET_THRESHOLD_PAISE,
  hourly: (c) => c.priceUnit === 'per_hour',
  visit: (c) => c.priceUnit === 'per_visit',
};

const FILTER_LABELS: Record<FilterKey, string> = {
  budget: 'Under ₹500',
  hourly: 'Hourly',
  visit: 'Per visit',
};

function ParentLanding({
  category,
  onChildPress,
}: {
  category: CategoryDetail;
  onChildPress: (slug: string) => void;
}) {
  const children = category.children ?? [];
  const [selectedFilter, setSelectedFilter] = useState<FilterKey | null>(null);

  // Only surface chips that would actually narrow the grid — a chip with zero
  // matches is just visual noise. Each chip carries its match count so users
  // know what they're filtering down to before they tap.
  const chips: FilterChip[] = useMemo(() => {
    const built: FilterChip[] = [];
    (Object.keys(FILTER_PREDICATES) as FilterKey[]).forEach((key) => {
      const count = children.filter(FILTER_PREDICATES[key]).length;
      if (count > 0 && count < children.length) {
        built.push({ key, label: FILTER_LABELS[key], count });
      }
    });
    return built;
  }, [children]);

  const visibleChildren = useMemo(() => {
    if (!selectedFilter) return children;
    return children.filter(FILTER_PREDICATES[selectedFilter]);
  }, [children, selectedFilter]);

  // Use the parent's hero image (or first child's) as promo banner backdrop.
  const bannerImg =
    category.bannerUrl ??
    category.heroImageUrl ??
    children[0]?.heroImageUrl ??
    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80&auto=format&fit=crop';

  // Render filtered children in 2-col grid as ServiceCards.
  const rows: ParentChild[][] = [];
  for (let i = 0; i < visibleChildren.length; i += 2) {
    rows.push(visibleChildren.slice(i, i + 2));
  }

  return (
    <View>
      {/* Description block */}
      {category.description ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Text style={{ fontSize: 14, lineHeight: 22, color: colors.ink.DEFAULT }}>
            {category.description}
          </Text>
        </View>
      ) : null}

      {/* Promo banner for this category */}
      <View style={{ marginTop: 18 }}>
        <PromoBanner
          imageUrl={bannerImg}
          eyebrow="LIMITED · TIME"
          title={`First booking in\n${category.name} 20% off`}
          subtitle="Use code FIRST20 at checkout"
          ctaLabel="How to redeem"
          tint="plum"
          onPress={() =>
            Alert.alert(
              'FIRST20 · 20% off',
              'Apply code FIRST20 at checkout on your first booking to get 20% off (up to ₹150). Pick a service below to get started.',
            )
          }
        />
      </View>

      {/* "Pick what you need" — 2-col ServiceCard grid */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
        <SectionHeader eyebrow="CHOOSE A SERVICE" title="Pick what you need" />
      </View>

      {/* Sub-category filter chips — only render if there's anything to filter */}
      {chips.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <FilterChipsRow
            chips={chips}
            selectedKey={selectedFilter}
            onSelect={(k) => setSelectedFilter(k as FilterKey | null)}
          />
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {visibleChildren.length === 0 ? (
          <View
            style={{
              marginHorizontal: 4,
              paddingVertical: 28,
              alignItems: 'center',
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            <Ionicons name="filter-outline" size={28} color={colors.ink.subtle} />
            <Text style={{ marginTop: 10, fontSize: 14, color: colors.ink.muted }}>
              No services match this filter.
            </Text>
            <Pressable onPress={() => setSelectedFilter(null)} style={{ marginTop: 10 }}>
              <Text style={{ color: colors.accent.DEFAULT, fontSize: 13, fontWeight: '800' }}>
                Show all
              </Text>
            </Pressable>
          </View>
        ) : (
          rows.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', marginTop: i === 0 ? 0 : 12, gap: 12 }}>
              {row.map((child) => (
                <View key={child.id} style={{ flex: 1 }}>
                  <ServiceCard
                    imageUrl={child.heroImageUrl}
                    title={child.name}
                    subtitle={child.shortPitch ?? undefined}
                    rating={4.5 + (Math.abs(child.id.charCodeAt(0)) % 5) * 0.1}
                    ratingCount={`${100 + (Math.abs(child.id.charCodeAt(1)) % 900)}+`}
                    pricePaise={child.basePrice}
                    durationLabel={child.priceUnit === 'per_hour' ? 'Per hour' : 'Per visit'}
                    badge={i === 0 && row.indexOf(child) === 0 ? 'Bestseller' : undefined}
                    onPress={() => onChildPress(child.slug)}
                    onAddPress={() => onChildPress(child.slug)}
                  />
                </View>
              ))}
              {row.length === 1 ? <View style={{ flex: 1 }} /> : null}
            </View>
          ))
        )}
      </View>

      <TrustNarrative />
    </View>
  );
}

// ─── Leaf: includes + how-it-works + experts list ────────────────

/**
 * Frontend-managed "includes" lists per leaf slug. Source-of-truth is D0
 * brand foundation §6. Stays here until the DB schema gains a structured
 * `includes Json[]` column — admins editing categories should not lose
 * this rich copy in the meantime.
 */
const INCLUDES_BY_SLUG: Record<string, string[]> = {
  'home-cleaning': [
    'Sweep + mop all rooms',
    'Dust surfaces & furniture',
    'Bathroom clean (taps + tiles)',
    'Kitchen counter & stove',
    'Bed making',
  ],
  'deep-clean': [
    'Bathroom tile + grout scrub',
    'Kitchen chimney + appliances',
    'Cabinet interiors',
    'Window glass + frames',
    'Floor polish',
  ],
  'pest-control': [
    'Pre-inspection',
    'Gel + spray treatment',
    'Crack sealing',
    'Safety briefing',
    '30-day re-treat warranty',
  ],
  sanitization: [
    'All surfaces fogging',
    'Door handles + switches',
    'Soft furnishings',
    'Air vents',
    'Certificate issued',
  ],
  plumbing: ['Leak detection', 'Tap + mixer', 'WC + flush', 'Geyser + RO', 'Drain unblocking'],
  electrical: [
    'Switch + socket',
    'Fan installation',
    'Inverter wiring',
    'MCB + RCCB',
    'Light fixtures',
  ],
  'ac-service': [
    'Filter + coil clean',
    'Drain + condenser',
    'Gas pressure check',
    'Anti-bacterial spray',
    'Performance report',
  ],
  'appliance-repair': ['Fridge', 'Washing machine', 'Microwave', 'Chimney', 'Geyser', 'Dishwasher'],
  'salon-women': [
    'Waxing (full / parts)',
    'Threading',
    'Facials',
    'Cleanup',
    'Mani-pedi',
    'Hair spa',
  ],
  'spa-massage': [
    'Swedish',
    'Deep tissue',
    'Aromatherapy',
    'Foot reflexology',
    'Prenatal',
    'Couples',
  ],
  'hair-makeup': [
    'Bridal package',
    'Party makeup',
    'Engagement / reception',
    'Photoshoot',
    'Saree draping',
  ],
  'mens-grooming': [
    'Haircut',
    'Beard trim + styling',
    'Facial',
    'Cleanup',
    'Head massage',
    'Pedicure',
  ],
  'fitness-trainer': [
    'Goal assessment',
    'Workout plan',
    'Progress tracking',
    'Nutrition basics',
    'Form correction',
  ],
  yoga: [
    'Style selection',
    'Mat-free option',
    'Breathing practice',
    'Meditation',
    'Posture correction',
  ],
  photography: [
    'Pre-shoot consult',
    '100-200 edited shots',
    'Raw files',
    'Online gallery',
    'Print-ready resolution',
  ],
  tutor: ['Demo class free', 'Customized plan', 'Weekly tests', 'Parent reports', 'Doubt sessions'],
};

const HOW_IT_WORKS: Array<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  sub: string;
}> = [
  { icon: 'calendar-outline', title: 'Pick time', sub: 'Choose slot' },
  { icon: 'walk-outline', title: 'Pro arrives', sub: 'On time, verified' },
  { icon: 'cash-outline', title: 'Pay after', sub: 'Cash, UPI, card' },
];

function LeafLanding({
  category,
  usingFallback,
  nearby,
  ready,
  onProPress,
  onBookPress,
}: {
  category: CategoryDetail;
  usingFallback: boolean;
  ready: boolean;
  nearby: ReturnType<typeof useNearbyPros>;
  onProPress: (id: string) => void;
  onBookPress: (id: string) => void;
}) {
  const includes = INCLUDES_BY_SLUG[category.slug] ?? [];
  const priceText = `${formatRupees(category.basePrice)}${priceUnitLabel(category.priceUnit)}`;

  return (
    <View>
      {/* Pricing strip */}
      <View
        style={{
          marginHorizontal: 20,
          marginTop: -16,
          backgroundColor: colors.surface.DEFAULT,
          borderRadius: 18,
          paddingVertical: 16,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: colors.brand[800],
          shadowOpacity: 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <PriceStat label="Starts at" value={priceText} accent />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border.DEFAULT }} />
        <PriceStat label="Duration" value={`${category.minDurationMinutes}+ min`} />
        <View style={{ width: 1, alignSelf: 'stretch', backgroundColor: colors.border.DEFAULT }} />
        <PriceStat label="Trust" value="Verified" />
      </View>

      {/* Description */}
      {category.description ? (
        <View style={{ paddingHorizontal: 20, paddingTop: 22 }}>
          <Text style={{ fontSize: 14, lineHeight: 22, color: colors.ink.DEFAULT }}>
            {category.description}
          </Text>
        </View>
      ) : null}

      {/* What's included */}
      {includes.length > 0 ? (
        <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
          <SectionHeader eyebrow="WHAT'S INCLUDED" title="Every booking covers" />
          <View
            style={{
              marginTop: 12,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            {includes.map((item, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: i === 0 ? 0 : 10,
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: colors.accent[100],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={14} color={colors.accent[700]} />
                </View>
                <Text style={{ marginLeft: 10, fontSize: 14, color: colors.ink.DEFAULT }}>
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* How it works */}
      <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
        <SectionHeader eyebrow="HOW IT WORKS" title="3 steps. Zero friction." />
        <View style={{ marginTop: 14, flexDirection: 'row' }}>
          {HOW_IT_WORKS.map((s, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor:
                    i === 0
                      ? colors.brand[100]
                      : i === 1
                        ? colors.accent[100]
                        : colors.support[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={s.icon}
                  size={24}
                  color={
                    i === 0 ? colors.brand[800] : i === 1 ? colors.accent[700] : colors.support[700]
                  }
                />
              </View>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontWeight: '800',
                  color: colors.ink.DEFAULT,
                  letterSpacing: -0.1,
                }}
              >
                {s.title}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: colors.ink.subtle,
                  marginTop: 2,
                  textAlign: 'center',
                }}
              >
                {s.sub}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Location fallback warning */}
      {usingFallback ? (
        <View
          style={{
            marginHorizontal: 20,
            marginTop: 18,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: 'rgba(199,122,26,0.30)',
            backgroundColor: 'rgba(199,122,26,0.06)',
            flexDirection: 'row',
          }}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
          <Text style={{ marginLeft: 8, flex: 1, fontSize: 12, color: colors.ink.muted }}>
            Using Jaipur center as your location. Enable GPS for accurate matches.
          </Text>
        </View>
      ) : null}

      {/* Experts list */}
      <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
        <SectionHeader
          eyebrow="AVAILABLE NOW"
          title={nearby.data ? `${nearby.data.count} experts near you` : 'Finding experts…'}
        />

        {/* Filter chip strip — visual only for v1 */}
        <View style={{ marginTop: 12, flexDirection: 'row' }}>
          <View style={{ marginRight: 8 }}>
            <Chip label="Verified" tone="brand" selected icon="shield-checkmark" size="sm" />
          </View>
          <View style={{ marginRight: 8 }}>
            <Chip label="★ 4.5+" tone="butter" size="sm" />
          </View>
          <View>
            <Chip label="Nearby" tone="coral" size="sm" />
          </View>
        </View>

        {!ready || nearby.isPending ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ActivityIndicator color={colors.brand.DEFAULT} />
            <Text style={{ marginTop: 8, fontSize: 12, color: colors.ink.subtle }}>
              Searching experts near you…
            </Text>
          </View>
        ) : nearby.isError ? (
          <View
            style={{
              marginTop: 16,
              padding: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(194,54,42,0.30)',
              backgroundColor: 'rgba(194,54,42,0.06)',
            }}
          >
            <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600' }}>
              Couldn&apos;t load experts.
            </Text>
            <Pressable
              onPress={() => void nearby.refetch()}
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: colors.brand[700], fontSize: 14, fontWeight: '700' }}>
                Try again
              </Text>
            </Pressable>
          </View>
        ) : nearby.data && nearby.data.pros.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <Ionicons name="moon-outline" size={36} color={colors.ink.subtle} />
            <Text
              style={{ marginTop: 12, textAlign: 'center', fontSize: 14, color: colors.ink.subtle }}
            >
              No experts online right now for this service.{'\n'}Pull down to refresh.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 14 }}>
            {nearby.data?.pros.map((p, idx) => (
              <ExpertCard
                key={p.professionalId}
                pro={p}
                rank={idx + 1}
                onPress={() => onProPress(p.professionalId)}
                onBook={() => onBookPress(p.professionalId)}
              />
            ))}
          </View>
        )}
      </View>

      <TrustNarrative />
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────

function PriceStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          color: colors.ink.subtle,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          marginTop: 4,
          fontSize: 15,
          fontWeight: '800',
          color: accent ? colors.accent[700] : colors.ink.DEFAULT,
          letterSpacing: -0.2,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function TrustNarrative() {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 28,
        padding: 18,
        borderRadius: 18,
        backgroundColor: colors.brand[900],
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            height: 32,
            width: 32,
            borderRadius: 16,
            backgroundColor: colors.accent.DEFAULT,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="shield-checkmark" size={16} color="#FFFFFF" />
        </View>
        <Text
          style={{
            marginLeft: 10,
            fontSize: 10,
            fontWeight: '800',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
            color: colors.support[300],
          }}
        >
          Every expert verified
        </Text>
      </View>
      <Text
        style={{
          marginTop: 12,
          fontSize: 15,
          fontWeight: '800',
          color: '#FFFFFF',
          lineHeight: 21,
        }}
      >
        Aadhaar · Bank KYC · Police-checked
      </Text>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 16,
        padding: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(194,54,42,0.30)',
        backgroundColor: 'rgba(194,54,42,0.06)',
      }}
    >
      <Text style={{ color: colors.danger, fontSize: 14, fontWeight: '600' }}>
        Couldn&apos;t load category.
      </Text>
      <Pressable onPress={onRetry} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <Text style={{ color: colors.brand[700], fontSize: 14, fontWeight: '700' }}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ─── Expert card (D4 restyle) ────────────────────────────────────

function ExpertCard({
  pro,
  rank,
  onPress,
  onBook,
}: {
  pro: NearbyPro;
  rank: number;
  onPress: () => void;
  onBook: () => void;
}) {
  const badge = badgeColors(pro.trustBadge);
  const isTop = rank === 1;
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginBottom: 12,
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
        shadowColor: colors.brand[800],
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      }}
    >
      {isTop ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 6,
            backgroundColor: colors.support.DEFAULT,
          }}
        >
          <Ionicons name="trophy" size={12} color={colors.support[700]} />
          <Text
            style={{
              marginLeft: 6,
              color: colors.support[700],
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 1.4,
              textTransform: 'uppercase',
            }}
          >
            Top match for you
          </Text>
        </View>
      ) : null}

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row' }}>
          <View
            style={{
              padding: 2,
              borderRadius: 36,
              backgroundColor:
                pro.trustBadge === 'platinum' || pro.trustBadge === 'gold'
                  ? colors.support.DEFAULT
                  : 'transparent',
            }}
          >
            <Avatar fullName={pro.fullName} photoUrl={pro.profilePhoto ?? undefined} size={62} />
          </View>

          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontSize: 16, fontWeight: '800', color: colors.ink.DEFAULT }}
              >
                {pro.fullName}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.success}
                style={{ marginLeft: 4 }}
              />
            </View>

            {pro.professionalTitle ? (
              <Text
                numberOfLines={1}
                style={{ marginTop: 2, fontSize: 12, color: colors.ink.muted }}
              >
                {pro.professionalTitle}
              </Text>
            ) : null}

            <View
              style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}
            >
              {pro.trustBadge !== 'none' ? (
                <View
                  style={{
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: badge.bg,
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={10}
                    color={badge.text}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: badge.text }}>
                    {badgeLabel(pro.trustBadge)}
                  </Text>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="star" size={12} color={colors.support[600]} />
                <Text
                  style={{
                    marginLeft: 3,
                    fontSize: 11,
                    fontWeight: '800',
                    color: colors.ink.DEFAULT,
                  }}
                >
                  {pro.trustScore.toFixed(1)}
                </Text>
              </View>
              <Text style={{ marginHorizontal: 6, fontSize: 11, color: colors.ink.subtle }}>·</Text>
              <Text style={{ fontSize: 11, color: colors.ink.muted }}>
                {pro.totalBookings} jobs
              </Text>
              <Text style={{ marginHorizontal: 6, fontSize: 11, color: colors.ink.subtle }}>·</Text>
              <Text style={{ fontSize: 11, color: colors.ink.muted }}>{pro.yearsExperience}y</Text>
            </View>
          </View>
        </View>

        <View
          style={{
            marginTop: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface.muted,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location" size={13} color={colors.brand[700]} />
            <Text
              style={{ marginLeft: 4, fontSize: 12, fontWeight: '700', color: colors.ink.DEFAULT }}
            >
              {pro.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="flash" size={13} color={colors.accent.DEFAULT} />
            <Text style={{ marginLeft: 4, fontSize: 12, color: colors.ink.muted }}>
              {formatResponseTime(pro.avgResponseTimeSeconds)}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: colors.brand[800],
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
              {pro.matchScore.toFixed(0)} match
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <CoralButton label="Book this expert" onPress={onBook} icon="arrow-forward" />
        </View>
      </View>
    </Pressable>
  );
}
