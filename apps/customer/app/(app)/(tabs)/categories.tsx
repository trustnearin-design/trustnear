import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCategories, type Category } from '../../../src/api/discovery';
import { formatRupees, priceUnitLabel } from '../../../src/lib/format';
import { categoryPhoto } from '../../../src/lib/imagery';
import { colors } from '../../../src/theme/colors';

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, isPending, isError, isFetching, refetch } = useCategories(false);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="px-5 pb-3 pt-3">
        <Text className="text-2xl font-bold text-ink">Services</Text>
        <Text className="mt-1 text-sm text-ink-muted">
          Tap a service to find verified experts near you
        </Text>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="px-5 pt-6">
          <Text className="text-sm text-danger">Couldn't load services.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start">
            <Text className="text-sm font-semibold text-brand">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
          }
        >
          {data.categories.map((c) => (
            <BigCategoryCard
              key={c.id}
              category={c}
              onPress={() =>
                router.push({ pathname: '/(app)/category/[slug]', params: { slug: c.slug } })
              }
            />
          ))}
          {data.categories.length === 0 ? (
            <Text className="mt-6 text-center text-sm text-ink-subtle">No services available.</Text>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function BigCategoryCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-3 overflow-hidden rounded-card bg-surface"
      style={{ elevation: 2 }}
    >
      <View>
        <Image
          source={{ uri: categoryPhoto(category.slug) }}
          style={{ width: '100%', height: 140, backgroundColor: '#E2E8F0' }}
        />
        {category.isFeatured ? (
          <View className="absolute left-3 top-3 rounded-pill bg-accent px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-inverse">
              Featured
            </Text>
          </View>
        ) : null}
      </View>
      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-ink">{category.name}</Text>
            <Text numberOfLines={2} className="mt-1 text-xs text-ink-muted">
              {category.description}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-xs text-ink-subtle">From</Text>
            <Text className="text-base font-bold text-brand">
              {formatRupees(category.basePrice)}
            </Text>
            <Text className="text-[11px] text-ink-subtle">
              {priceUnitLabel(category.priceUnit).replace('/', '')}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
          <View className="flex-row items-center">
            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
            <Text className="ml-1 text-[11px] font-medium text-ink-muted">Verified experts</Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-brand">Find experts</Text>
            <Ionicons
              name="arrow-forward"
              size={14}
              color={colors.brand.DEFAULT}
              style={{ marginLeft: 4 }}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
