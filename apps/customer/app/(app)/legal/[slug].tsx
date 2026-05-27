import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLegalPage } from '../../../src/api/help';
import { colors } from '../../../src/theme/colors';
import { BrandHero, MascotImage } from '../../../src/components/ui';

/**
 * D5 legal page reader — Plum hero showing title + version + effective
 * date, premium content card. Used for Terms, Privacy, Refund.
 */
export default function LegalScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data, isPending, isError } = useLegalPage(slug ?? 'terms');

  const titleFallback = (slug ?? 'Legal')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <BrandHero onBack={() => router.back()} bottomGap={32}>
        <View style={{ paddingTop: 4 }}>
          <Text
            style={{
              color: colors.support[300],
              fontSize: 11,
              fontWeight: '800',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Legal
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 26,
              fontWeight: '800',
              color: '#FFFFFF',
              letterSpacing: -0.4,
            }}
          >
            {data?.title ?? titleFallback}
          </Text>
          {data ? (
            <Text
              style={{
                marginTop: 8,
                fontSize: 11,
                fontWeight: '800',
                letterSpacing: 1.4,
                color: colors.support[300],
                textTransform: 'uppercase',
              }}
            >
              Version {data.version} · Effective{' '}
              {new Date(data.effectiveAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          ) : null}
        </View>
      </BrandHero>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {isPending ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              alignItems: 'center',
              padding: 32,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : isError || !data ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 4,
              alignItems: 'center',
              padding: 28,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            <MascotImage variant="resting" tone="plum" size={84} />
            <Text
              style={{ marginTop: 10, fontSize: 14, fontWeight: '800', color: colors.ink.DEFAULT }}
            >
              Not published yet
            </Text>
            <Text
              style={{ marginTop: 6, textAlign: 'center', fontSize: 12, color: colors.ink.muted }}
            >
              This page is being prepared. Please check back later.
            </Text>
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 20,
              padding: 18,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            <Text style={{ fontSize: 14, lineHeight: 22, color: colors.ink.DEFAULT }}>
              {data.body}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
