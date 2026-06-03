import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMe } from '../../src/api/profile';
import { shareReferral } from '../../src/lib/links';
import { colors } from '../../src/theme/colors';
import { CoralButton, Gradient } from '../../src/components/ui';

/**
 * Refer & Earn. Surfaces the user's existing referralCode (already on the
 * User row) with a prominent share CTA. The reward-crediting rule (both sides
 * earn ₹X on the referee's first completed booking) is a server-side policy
 * to switch on separately — see docs; this screen drives the growth loop.
 */
export default function ReferScreen() {
  const router = useRouter();
  const me = useMe();
  const code = me.data?.referralCode ?? null;

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <Gradient
        colors={colors.gradient.coralCta}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: 28 }}
      >
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-4 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <View className="items-center px-6 pt-3">
            <Ionicons name="gift" size={40} color="#FFFFFF" />
            <Text className="mt-2 text-center text-[24px] font-extrabold text-white">
              Refer &amp; Earn
            </Text>
            <Text
              className="mt-1 text-center text-[13px]"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              Apne doston ko TrustNear pe invite karein. Dono ko reward milega jab woh apni pehli
              service book karein.
            </Text>
          </View>
        </SafeAreaView>
      </Gradient>

      <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View className="-mt-8 rounded-card bg-surface p-5" style={cardShadow}>
          <Text className="text-center text-[11px] font-bold uppercase tracking-[2px] text-ink-subtle">
            Your invite code
          </Text>
          {me.isPending ? (
            <ActivityIndicator color={colors.brand.DEFAULT} style={{ marginTop: 12 }} />
          ) : (
            <Text className="mt-2 text-center text-[30px] font-extrabold tracking-[4px] text-brand">
              {code ?? '—'}
            </Text>
          )}
          <View className="mt-4">
            <CoralButton
              label="Share invite"
              icon="share-social"
              disabled={!code}
              onPress={() => code && void shareReferral(code)}
            />
          </View>
        </View>

        <Text className="mb-3 mt-7 text-[12px] font-bold uppercase tracking-[1.5px] text-ink-subtle">
          How it works
        </Text>
        <Step
          n={1}
          title="Share your code"
          body="Apna invite code WhatsApp ya kisi bhi app pe bhejein."
        />
        <Step n={2} title="Friend signs up" body="Woh sign-up pe aapka code daalte hain." />
        <Step
          n={3}
          title="Both earn"
          body="Unki pehli service complete hone pe dono ko wallet reward milta hai."
        />
      </ScrollView>
    </View>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View className="mb-3 flex-row items-start rounded-card bg-surface p-4">
      <View className="mr-3 h-7 w-7 items-center justify-center rounded-full bg-brand">
        <Text className="text-[13px] font-bold text-white">{n}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[14px] font-bold text-ink">{title}</Text>
        <Text className="mt-0.5 text-[12px] text-ink-muted">{body}</Text>
      </View>
    </View>
  );
}

const cardShadow = {
  shadowColor: '#000',
  shadowOpacity: 0.1,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
