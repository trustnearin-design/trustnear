import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  useCategoryTree,
  type CategoryTreeChild,
  type CategoryTreeParent,
} from '../../../src/api/discovery';
import { colors } from '../../../src/theme/colors';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, isPending, isError, isFetching, refetch } = useCategoryTree();
  const insets = useSafeAreaInsets();
  const bottomPad = 64 + insets.bottom + 32;

  const totalLeaves = (data?.tree ?? []).reduce((n, p) => n + p.children.length, 0);

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />

      {/* Navy header */}
      <View className="bg-brand-800" style={{ paddingBottom: 28 }}>
        <View
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: 100,
            backgroundColor: 'rgba(212,162,76,0.16)',
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
            <Text className="mt-1 text-[26px] font-bold text-ink-inverse">
              What can we do for you?
            </Text>
            {totalLeaves > 0 ? (
              <Text className="mt-1 text-[13px]" style={{ color: colors.accent[200] }}>
                {totalLeaves} verified services at your doorstep
              </Text>
            ) : null}
          </View>
        </SafeAreaView>
      </View>

      {/* Search pill floats on boundary */}
      <Pressable
        onPress={() => router.push('/(app)/search')}
        className="mx-5 -mt-6 flex-row items-center rounded-card border border-border bg-surface px-4 py-3.5"
        style={{
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Ionicons name="search" size={18} color={colors.ink.subtle} />
        <Text className="ml-3 flex-1 text-[14px] text-ink-subtle">
          Search cleaning, salon, AC&hellip;
        </Text>
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
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingTop: 16, paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching}
              onRefresh={() => void refetch()}
              tintColor={colors.brand.DEFAULT}
            />
          }
        >
          {(data?.tree ?? []).map((parent) => (
            <ParentBlock
              key={parent.id}
              parent={parent}
              onParentPress={() =>
                router.push({
                  pathname: '/(app)/category/[slug]',
                  params: { slug: parent.slug },
                })
              }
              onChildPress={(child) =>
                router.push({
                  pathname: '/(app)/category/[slug]',
                  params: { slug: child.slug },
                })
              }
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function ParentBlock({
  parent,
  onParentPress,
  onChildPress,
}: {
  parent: CategoryTreeParent;
  onParentPress: () => void;
  onChildPress: (child: CategoryTreeChild) => void;
}) {
  return (
    <View className="mt-2">
      <View className="flex-row items-center justify-between px-5">
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-ink">{parent.name}</Text>
          {parent.shortPitch ? (
            <Text numberOfLines={1} className="mt-0.5 text-[12px] text-ink-muted">
              {parent.shortPitch}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={onParentPress} hitSlop={8} className="flex-row items-center">
          <Text className="text-[12px] font-bold text-brand">View all</Text>
          <Ionicons
            name="arrow-forward"
            size={12}
            color={colors.brand.DEFAULT}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      </View>

      <View className="mt-2 flex-row flex-wrap px-3">
        {parent.children.map((child) => (
          <View key={child.id} className="w-1/2 p-2">
            <Pressable
              onPress={() => onChildPress(child)}
              className="overflow-hidden rounded-card bg-surface"
              style={{
                shadowColor: '#000',
                shadowOpacity: 0.06,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 3 },
                elevation: 2,
              }}
            >
              <ImageBackground
                source={{ uri: child.heroImageUrl ?? undefined }}
                style={{ height: 100 }}
                imageStyle={{ backgroundColor: '#E7E5E0' }}
              >
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(11,31,58,0.18)',
                  }}
                />
              </ImageBackground>
              <View className="px-3 py-2.5">
                <Text numberOfLines={1} className="text-[13px] font-bold text-ink">
                  {child.name}
                </Text>
                <Text className="mt-1 text-[11px] font-bold text-brand">
                  ₹{Math.round(child.basePrice / 100)}
                  {child.priceUnit === 'per_hour' ? '/hr' : ''}
                </Text>
              </View>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
