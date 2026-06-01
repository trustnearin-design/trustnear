import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCategoryTree, type CategoryTreeParent } from '../../../src/api/discovery';
import { CircleLabelGrid, type CircleLabelItem } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';

const RAIL_W = 92;

/**
 * Myntra-style "Categories": a tight left rail of parents + a right
 * "In the Spotlight" pane of the selected parent's children as a labelled
 * circle grid. The right pane is given an EXPLICIT pixel width (screen − rail)
 * rather than flex:1 — flex was collapsing the pane and squeezing all text
 * to near-zero width. Opened from the home grid button (preselects via the
 * `parent` route param) or the Services tab.
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const { parent: parentParam } = useLocalSearchParams<{ parent?: string }>();
  const { data, isPending, isError, refetch } = useCategoryTree();
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const paneW = winW - RAIL_W;

  const parents = data?.tree ?? [];
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (parentParam) setSelectedSlug(parentParam);
  }, [parentParam]);

  const effectiveSlug =
    selectedSlug && parents.some((p) => p.slug === selectedSlug)
      ? selectedSlug
      : parentParam && parents.some((p) => p.slug === parentParam)
        ? parentParam
        : (parents[0]?.slug ?? null);
  const selected = parents.find((p) => p.slug === effectiveSlug) ?? null;

  const openCategory = (slug: string) =>
    router.push({ pathname: '/(app)/category/[slug]', params: { slug } });

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />

      {/* Compact plum header */}
      <View className="bg-brand-800" style={{ paddingBottom: 20 }}>
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: 'rgba(255,122,92,0.16)',
          }}
        />
        <SafeAreaView edges={['top']}>
          <View className="px-5 pt-2">
            <Text
              className="text-[10px] font-bold uppercase tracking-[2px]"
              style={{ color: colors.accent[200] }}
            >
              All services
            </Text>
            <Text className="mt-1 text-[24px] font-bold text-ink-inverse">Categories</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Search pill on the boundary */}
      <Pressable
        onPress={() => router.push('/(app)/search')}
        className="mx-5 -mt-5 flex-row items-center rounded-card border border-border bg-surface px-4 py-3"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 5,
        }}
      >
        <Ionicons name="search" size={18} color={colors.ink.subtle} />
        <Text className="ml-3 flex-1 text-[14px] text-ink-subtle">
          Search cleaning, salon, AC&hellip;
        </Text>
        <Ionicons name="mic-outline" size={18} color={colors.accent.DEFAULT} />
      </Pressable>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="px-5 pt-6">
          <Text className="text-sm text-danger">Couldn&apos;t load services.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start">
            <Text className="text-sm font-semibold text-brand">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', marginTop: 14 }}>
          {/* ── Left rail ─────────────────────────────────────── */}
          <ScrollView
            style={{ width: RAIL_W, backgroundColor: colors.surface.subtle }}
            contentContainerStyle={{ paddingVertical: 8, paddingBottom: 64 + insets.bottom + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {parents.map((p) => (
              <RailItem
                key={p.id}
                parent={p}
                active={p.slug === effectiveSlug}
                onPress={() => setSelectedSlug(p.slug)}
              />
            ))}
          </ScrollView>

          {/* ── Right spotlight pane (explicit width) ─────────── */}
          <View style={{ width: paneW }}>
            {selected ? (
              <ScrollView
                contentContainerStyle={{ paddingTop: 16, paddingBottom: 64 + insets.bottom + 24 }}
                showsVerticalScrollIndicator={false}
              >
                {/* Header — stacked, full width, no truncation */}
                <View style={{ paddingHorizontal: 14 }}>
                  <Text
                    style={{
                      fontSize: 10,
                      fontWeight: '800',
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      color: colors.accent[600],
                    }}
                  >
                    In the spotlight
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      marginTop: 2,
                      fontSize: 18,
                      fontWeight: '800',
                      letterSpacing: -0.3,
                      color: colors.ink.DEFAULT,
                    }}
                  >
                    {selected.name}
                  </Text>
                </View>

                <View style={{ marginTop: 8 }}>
                  <CircleLabelGrid
                    items={toCircleItems(selected)}
                    columns={3}
                    onPress={openCategory}
                    paddingHorizontal={6}
                  />
                </View>

                {/* View-all button */}
                <Pressable
                  onPress={() => openCategory(selected.slug)}
                  style={{
                    marginTop: 8,
                    marginHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1.5,
                    borderColor: colors.accent.DEFAULT,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'row',
                  }}
                >
                  <Text style={{ color: colors.accent.DEFAULT, fontSize: 13, fontWeight: '800' }}>
                    View all {selected.name}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={14}
                    color={colors.accent.DEFAULT}
                    style={{ marginLeft: 6 }}
                  />
                </Pressable>
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center">
                <Text className="text-sm text-ink-subtle">No categories yet.</Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function toCircleItems(parent: CategoryTreeParent): CircleLabelItem[] {
  return parent.children.map((c) => ({
    slug: c.slug,
    name: c.name,
    imageUrl: c.heroImageUrl,
    caption: `₹${Math.round(c.basePrice / 100)}`,
  }));
}

// ─── Left-rail item ─────────────────────────────────────────────

function RailItem({
  parent,
  active,
  onPress,
}: {
  parent: CategoryTreeParent;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: active ? colors.surface.muted : 'transparent',
        borderLeftWidth: 3,
        borderLeftColor: active ? colors.accent.DEFAULT : 'transparent',
      }}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.brand[100],
          borderWidth: active ? 2 : 0,
          borderColor: colors.accent.DEFAULT,
        }}
      >
        {parent.heroImageUrl ? (
          <Image
            source={{ uri: parent.heroImageUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : null}
      </View>
      <Text
        numberOfLines={2}
        style={{
          marginTop: 5,
          paddingHorizontal: 3,
          fontSize: 9.5,
          lineHeight: 12,
          textAlign: 'center',
          fontWeight: active ? '800' : '600',
          color: active ? colors.accent[700] : colors.ink.muted,
        }}
      >
        {parent.name}
      </Text>
    </Pressable>
  );
}
