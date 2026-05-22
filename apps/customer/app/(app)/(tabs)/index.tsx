import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/stores/auth';
import { useCategories, type Category } from '../../../src/api/discovery';
import { formatRupees, priceUnitLabel } from '../../../src/lib/format';
import { categoryPhoto, HOME_HERO_PHOTO } from '../../../src/lib/imagery';
import { colors } from '../../../src/theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const featured = useCategories(true);
  const all = useCategories(false);

  const refreshing = featured.isFetching || all.isFetching;
  const onRefresh = () => {
    void featured.refetch();
    void all.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <HeaderBar
          locationText="Jaipur, Rajasthan"
          firstName={user?.fullName?.split(' ')[0] ?? ''}
        />

        <HeroCard onPress={() => router.push('/(app)/(tabs)/categories')} />

        <TrustStrip />

        <SectionHeader
          title="Featured services"
          actionLabel="See all"
          onAction={() => router.push('/(app)/(tabs)/categories')}
        />

        {featured.isPending ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : featured.isError ? (
          <ErrorBlock onRetry={() => void featured.refetch()} />
        ) : (
          <View className="mt-2 flex-row flex-wrap px-3">
            {(featured.data?.categories ?? []).map((c) => (
              <CategoryPhotoTile
                key={c.id}
                category={c}
                onPress={() =>
                  router.push({ pathname: '/(app)/category/[slug]', params: { slug: c.slug } })
                }
              />
            ))}
          </View>
        )}

        <SectionHeader title="More services" />
        {all.isPending ? (
          <View className="items-center py-6">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : all.data ? (
          <View className="px-3">
            {all.data.categories
              .filter((c) => !c.isFeatured)
              .map((c) => (
                <CategoryWideCard
                  key={c.id}
                  category={c}
                  onPress={() =>
                    router.push({ pathname: '/(app)/category/[slug]', params: { slug: c.slug } })
                  }
                />
              ))}
          </View>
        ) : null}

        <WhyStrip />
      </ScrollView>
    </SafeAreaView>
  );
}

function HeaderBar({ locationText, firstName }: { locationText: string; firstName: string }) {
  return (
    <View className="px-5 pb-4 pt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <Ionicons name="location" size={18} color={colors.brand.DEFAULT} />
          <View className="ml-2 flex-1">
            <Text className="text-[10px] font-medium uppercase tracking-wider text-ink-subtle">
              Your location
            </Text>
            <Text numberOfLines={1} className="text-sm font-semibold text-ink">
              {locationText}
            </Text>
          </View>
        </View>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
          <Ionicons name="notifications-outline" size={20} color={colors.ink.DEFAULT} />
        </View>
      </View>
      {firstName ? (
        <Text className="mt-3 text-2xl font-bold text-ink">Namaste, {firstName} 🙏</Text>
      ) : (
        <Text className="mt-3 text-2xl font-bold text-ink">Namaste 🙏</Text>
      )}
      <Text className="mt-1 text-sm text-ink-muted">What do you need help with today?</Text>
    </View>
  );
}

function HeroCard({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mx-5 overflow-hidden rounded-card">
      <ImageBackground
        source={{ uri: HOME_HERO_PHOTO }}
        style={{ height: 160, justifyContent: 'flex-end' }}
        imageStyle={{ borderRadius: 16 }}
      >
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            borderRadius: 16,
          }}
        />
        <View className="p-5">
          <View className="self-start rounded-pill bg-accent px-2.5 py-1">
            <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-inverse">
              Verified by TrustNear
            </Text>
          </View>
          <Text className="mt-2 text-xl font-bold text-ink-inverse">
            Aadhaar-checked experts{'\n'}at your doorstep
          </Text>
          <View className="mt-3 flex-row items-center">
            <Text className="text-xs font-semibold text-ink-inverse">Find experts near you</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" style={{ marginLeft: 6 }} />
          </View>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

function TrustStrip() {
  return (
    <View className="mx-5 mt-5 flex-row rounded-card border border-border bg-surface px-2 py-3">
      <TrustChip icon="shield-checkmark" label="100% Aadhaar" tone="success" />
      <Divider />
      <TrustChip icon="star" label="4.8★ rated" tone="accent" />
      <Divider />
      <TrustChip icon="people" label="Jaipur experts" tone="brand" />
    </View>
  );
}

function TrustChip({
  icon,
  label,
  tone,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tone: 'success' | 'accent' | 'brand';
}) {
  const color =
    tone === 'success'
      ? colors.success
      : tone === 'accent'
        ? colors.accent.DEFAULT
        : colors.brand.DEFAULT;
  return (
    <View className="flex-1 items-center px-1">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="mt-1 text-center text-[11px] font-semibold text-ink">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px self-stretch bg-border" />;
}

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View className="mt-7 flex-row items-center justify-between px-5">
      <Text className="text-lg font-bold text-ink">{title}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text className="text-sm font-semibold text-brand">{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CategoryPhotoTile({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="w-1/2 p-2">
      <View className="overflow-hidden rounded-card bg-surface" style={{ elevation: 2 }}>
        <Image
          source={{ uri: categoryPhoto(category.slug) }}
          style={{ width: '100%', height: 110, backgroundColor: '#E2E8F0' }}
        />
        <View className="p-3">
          <Text numberOfLines={1} className="text-sm font-semibold text-ink">
            {category.name}
          </Text>
          <Text className="mt-0.5 text-xs font-medium text-brand">
            {formatRupees(category.basePrice)}
            {priceUnitLabel(category.priceUnit)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function CategoryWideCard({ category, onPress }: { category: Category; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="mt-2 flex-row overflow-hidden rounded-card bg-surface"
      style={{ elevation: 1 }}
    >
      <Image
        source={{ uri: categoryPhoto(category.slug) }}
        style={{ width: 92, height: 92, backgroundColor: '#E2E8F0' }}
      />
      <View className="flex-1 justify-center p-3">
        <Text numberOfLines={1} className="text-base font-semibold text-ink">
          {category.name}
        </Text>
        <Text numberOfLines={2} className="mt-0.5 text-xs text-ink-muted">
          {category.description}
        </Text>
        <Text className="mt-1.5 text-xs font-semibold text-brand">
          From {formatRupees(category.basePrice)}
          {priceUnitLabel(category.priceUnit)}
        </Text>
      </View>
      <View className="items-center justify-center pr-4">
        <Ionicons name="chevron-forward" size={18} color={colors.ink.subtle} />
      </View>
    </Pressable>
  );
}

function WhyStrip() {
  return (
    <View className="mx-5 mt-8 rounded-card bg-brand-900 p-5">
      <Text className="text-xs font-bold uppercase tracking-wider text-accent">Why TrustNear</Text>
      <Text className="mt-2 text-lg font-bold text-ink-inverse">
        Every expert is verified before they reach you
      </Text>
      <View className="mt-4 flex-row flex-wrap">
        <WhyChip icon="finger-print" label="Aadhaar" />
        <WhyChip icon="person-circle" label="Face match" />
        <WhyChip icon="card" label="Bank KYC" />
        <WhyChip icon="shield-checkmark" label="Police-checked" />
      </View>
    </View>
  );
}

function WhyChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View className="mb-2 mr-2 flex-row items-center rounded-pill bg-brand-800 px-3 py-1.5">
      <Ionicons name={icon} size={14} color={colors.accent.DEFAULT} />
      <Text className="ml-1.5 text-xs font-semibold text-ink-inverse">{label}</Text>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="mx-5 mt-3 rounded-card border border-danger/30 bg-danger/5 p-4">
      <Text className="text-sm text-danger">Couldn't load services. Check your connection.</Text>
      <Pressable onPress={onRetry} className="mt-2 self-start">
        <Text className="text-sm font-semibold text-brand">Try again</Text>
      </Pressable>
    </View>
  );
}
