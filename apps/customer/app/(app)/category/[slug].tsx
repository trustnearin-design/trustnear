import { useEffect, useState } from 'react';
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
import { useCategoryDetail, useNearbyPros, type NearbyPro } from '../../../src/api/discovery';
import { FALLBACK_COORDS, getCurrentCoords, type UserCoords } from '../../../src/lib/location';
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

export default function CategoryProsScreen() {
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
  const nearby = useNearbyPros(
    coords && slug ? { lat: coords.lat, lng: coords.lng, category: slug } : null,
  );

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: category.data?.name ?? '' }} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={nearby.isFetching} onRefresh={() => void nearby.refetch()} />
        }
      >
        <CategoryHeroBanner slug={slug} />

        {category.isPending ? (
          <ActivityIndicator color={colors.brand.DEFAULT} className="my-6" />
        ) : category.data ? (
          <View className="bg-surface px-5 pb-4 pt-4">
            <Text className="text-2xl font-bold text-ink">{category.data.name}</Text>
            <Text className="mt-1 text-sm text-ink-muted">{category.data.professionalTitle}</Text>
            <Text className="mt-2 text-sm text-ink-muted">{category.data.description}</Text>
            <View className="mt-3 flex-row items-center">
              <View className="rounded-pill bg-brand-100 px-3 py-1.5">
                <Text className="text-xs font-bold text-brand">
                  From {formatRupees(category.data.basePrice)}
                  {priceUnitLabel(category.data.priceUnit)}
                </Text>
              </View>
              <View className="ml-2 flex-row items-center rounded-pill bg-success/10 px-3 py-1.5">
                <Ionicons name="shield-checkmark" size={12} color={colors.success} />
                <Text className="ml-1 text-xs font-semibold text-success">Verified experts</Text>
              </View>
            </View>
          </View>
        ) : null}

        {usingFallback ? (
          <View className="mx-5 mt-1 flex-row items-start rounded-card border border-warning/30 bg-warning/5 p-3">
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text className="ml-2 flex-1 text-xs text-ink-muted">
              Using Jaipur center as your location. Enable GPS for accurate matches.
            </Text>
          </View>
        ) : null}

        <View className="mt-4 px-5">
          <View className="flex-row items-end justify-between">
            <Text className="text-lg font-bold text-ink">
              {nearby.data ? `${nearby.data.count} experts near you` : 'Finding experts…'}
            </Text>
            {nearby.data && nearby.data.count > 0 ? (
              <Text className="text-xs text-ink-subtle">Sorted by best match</Text>
            ) : null}
          </View>

          {!coords || nearby.isPending ? (
            <View className="items-center py-8">
              <ActivityIndicator color={colors.brand.DEFAULT} />
              <Text className="mt-2 text-xs text-ink-subtle">Searching experts near you…</Text>
            </View>
          ) : nearby.isError ? (
            <View className="mt-4 rounded-card border border-danger/30 bg-danger/5 p-4">
              <Text className="text-sm text-danger">Couldn't load experts.</Text>
              <Pressable onPress={() => void nearby.refetch()} className="mt-2 self-start">
                <Text className="text-sm font-semibold text-brand">Try again</Text>
              </Pressable>
            </View>
          ) : nearby.data.pros.length === 0 ? (
            <View className="items-center py-10">
              <Ionicons name="moon-outline" size={36} color={colors.ink.subtle} />
              <Text className="mt-3 text-center text-sm text-ink-subtle">
                No experts online right now for this service.{'\n'}Pull down to refresh.
              </Text>
            </View>
          ) : (
            <View className="mt-3">
              {nearby.data.pros.map((p, idx) => (
                <ExpertCard
                  key={p.professionalId}
                  pro={p}
                  rank={idx + 1}
                  onPress={() =>
                    router.push({ pathname: '/(app)/pro/[id]', params: { id: p.professionalId } })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CategoryHeroBanner({ slug }: { slug: string | undefined }) {
  if (!slug) return null;
  return (
    <ImageBackground
      source={{ uri: categoryPhoto(slug) }}
      style={{ height: 160 }}
      imageStyle={{ backgroundColor: '#E2E8F0' }}
    >
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.35)',
        }}
      />
    </ImageBackground>
  );
}

function ExpertCard({ pro, rank, onPress }: { pro: NearbyPro; rank: number; onPress: () => void }) {
  const badge = badgeColors(pro.trustBadge);
  const isTop = rank === 1;
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-card bg-surface"
      style={{ elevation: 2 }}
    >
      {isTop ? (
        <View className="flex-row items-center bg-accent px-4 py-1.5">
          <Ionicons name="trophy" size={12} color="#fff" />
          <Text className="ml-1.5 text-[11px] font-bold uppercase tracking-wider text-ink-inverse">
            Top match for you
          </Text>
        </View>
      ) : null}
      <View className="p-4">
        <View className="flex-row">
          <Avatar fullName={pro.fullName} photoUrl={pro.profilePhoto ?? undefined} size={64} />

          <View className="ml-3 flex-1">
            <View className="flex-row items-center">
              <Text numberOfLines={1} className="flex-1 text-base font-bold text-ink">
                {pro.fullName}
              </Text>
              {pro.trustBadge !== 'none' ? (
                <View
                  className="ml-2 rounded-pill px-2 py-0.5"
                  style={{ backgroundColor: badge.bg }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: badge.text }}>
                    {badgeLabel(pro.trustBadge)}
                  </Text>
                </View>
              ) : null}
            </View>

            {pro.professionalTitle ? (
              <Text numberOfLines={1} className="mt-0.5 text-xs text-ink-muted">
                {pro.professionalTitle}
              </Text>
            ) : null}

            <View className="mt-1.5 flex-row items-center">
              <View className="flex-row items-center">
                <Ionicons name="star" size={13} color={colors.accent.DEFAULT} />
                <Text className="ml-1 text-xs font-bold text-ink">{pro.trustScore.toFixed(1)}</Text>
              </View>
              <Text className="mx-2 text-xs text-ink-subtle">·</Text>
              <Text className="text-xs text-ink-muted">{pro.totalBookings} jobs</Text>
              <Text className="mx-2 text-xs text-ink-subtle">·</Text>
              <Text className="text-xs text-ink-muted">{pro.yearsExperience}y exp</Text>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-center justify-between rounded-card bg-surface-muted px-3 py-2.5">
          <View className="flex-row items-center">
            <Ionicons name="location-outline" size={14} color={colors.ink.muted} />
            <Text className="ml-1 text-xs font-medium text-ink-muted">
              {pro.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="flash" size={14} color={colors.warning} />
            <Text className="ml-1 text-xs font-medium text-ink-muted">
              {formatResponseTime(pro.avgResponseTimeSeconds)} avg
            </Text>
          </View>
          <View className="rounded-pill bg-brand px-2.5 py-1">
            <Text className="text-[11px] font-bold text-ink-inverse">
              Match {pro.matchScore.toFixed(0)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
