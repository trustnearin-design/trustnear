import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useKycStatus, type KycStatus } from '../../../src/api/kyc';
import { colors } from '../../../src/theme/colors';

/**
 * KYC home — one card per verification step. Tap a card to start /
 * resume that step. Verified cards show a green chip + the verified
 * value (last 4 of Aadhaar, name on PAN, last 4 of account, etc).
 *
 * Order matters: Aadhaar first (highest signal for trust score),
 * PAN second (legal/tax), Bank third (payout setup), Police last
 * (manual review — not via Setu, deferred).
 */

export default function KycHome() {
  const router = useRouter();
  const { data, isPending, isFetching, refetch } = useKycStatus();

  const completed = data ? countVerified(data) : 0;
  const total = 4;

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <Header completed={completed} total={total} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      >
        {isPending ? (
          <View className="items-center py-10">
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : !data ? (
          <Text className="text-center text-sm text-danger">Couldn&apos;t load KYC status.</Text>
        ) : (
          <>
            <StepCard
              icon="finger-print"
              title="Aadhaar"
              subtitle="Verify your identity via DigiLocker — Govt-issued, secure"
              verified={data.aadhaarVerified}
              verifiedLabel={
                data.aadhaarLastFour
                  ? `XXXX-XXXX-${data.aadhaarLastFour} · ${data.aadhaarFullName ?? ''}`
                  : 'Verified'
              }
              onPress={() => router.push('/(app)/kyc/aadhaar')}
            />
            <StepCard
              icon="card-outline"
              title="PAN"
              subtitle="For tax compliance + payout setup"
              verified={data.panVerified}
              verifiedLabel={
                data.panNumber ? `${data.panNumber} · ${data.panFullName ?? ''}` : 'Verified'
              }
              onPress={() => router.push('/(app)/kyc/pan')}
            />
            <StepCard
              icon="business-outline"
              title="Bank account"
              subtitle="Where your weekly payouts will land"
              verified={data.bankVerified}
              verifiedLabel={
                data.bankAccountLastFour
                  ? `XXXXXX${data.bankAccountLastFour} · ${data.bankAccountHolderName ?? ''}`
                  : 'Verified'
              }
              onPress={() => router.push('/(app)/kyc/bank')}
            />
            <StepCard
              icon="shield-checkmark-outline"
              title="Police verification"
              subtitle="Manual review by TrustNear team — boosts customer trust"
              verified={data.policeVerified}
              verifiedLabel="Verified"
              onPress={undefined}
              comingSoon
            />

            <Text className="mt-6 text-center text-[11px] text-ink-subtle">
              Verified data is shown to customers as trust signals on your profile. Aadhaar number
              is never stored — only the last 4 digits + verified fields (name, DOB, photo) are
              kept.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function countVerified(s: KycStatus): number {
  let n = 0;
  if (s.aadhaarVerified) n++;
  if (s.panVerified) n++;
  if (s.bankVerified) n++;
  if (s.policeVerified) n++;
  return n;
}

function Header({ completed, total }: { completed: number; total: number }) {
  const router = useRouter();
  return (
    <View className="bg-brand-800" style={{ paddingBottom: 24 }}>
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
        <View className="flex-row items-center px-5 pt-2">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>
          <Text
            className="ml-3 text-[11px] font-bold uppercase tracking-[2px]"
            style={{ color: colors.accent[200] }}
          >
            KYC verification
          </Text>
        </View>
        <View className="px-5 pt-4">
          <Text className="text-[26px] font-bold text-ink-inverse">
            {completed} of {total} verified
          </Text>
          <Text className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
            Complete all steps to unlock higher-paying jobs + premium badges.
          </Text>
          <View className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <View
              className="h-full rounded-full bg-accent"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StepCard({
  icon,
  title,
  subtitle,
  verified,
  verifiedLabel,
  onPress,
  comingSoon,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  verified: boolean;
  verifiedLabel: string;
  onPress: (() => void) | undefined;
  comingSoon?: boolean;
}) {
  const dim = comingSoon || (!verified && !onPress);
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || verified}
      className="mb-3 flex-row items-center rounded-card border border-border bg-surface p-4"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
        elevation: 1,
        opacity: dim ? 0.6 : 1,
      }}
    >
      <View
        className="mr-3 h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: verified ? '#DCFCE7' : colors.brand[50] }}
      >
        <Ionicons name={icon} size={22} color={verified ? colors.success : colors.brand.DEFAULT} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text className="text-[15px] font-bold text-ink">{title}</Text>
          {verified ? (
            <View className="ml-2 flex-row items-center rounded-full bg-success/10 px-2 py-0.5">
              <Ionicons name="checkmark-circle" size={12} color={colors.success} />
              <Text className="ml-1 text-[10px] font-bold text-success">Verified</Text>
            </View>
          ) : comingSoon ? (
            <View className="ml-2 rounded-full bg-ink-subtle/10 px-2 py-0.5">
              <Text className="text-[10px] font-bold text-ink-subtle">Coming soon</Text>
            </View>
          ) : (
            <View className="ml-2 rounded-full bg-accent/15 px-2 py-0.5">
              <Text className="text-[10px] font-bold" style={{ color: colors.accent[600] }}>
                Pending
              </Text>
            </View>
          )}
        </View>
        <Text
          numberOfLines={2}
          className={`mt-0.5 text-[12px] ${verified ? 'text-ink-muted' : 'text-ink-subtle'}`}
        >
          {verified ? verifiedLabel : subtitle}
        </Text>
      </View>
      {!verified && onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.ink.subtle} />
      ) : null}
    </Pressable>
  );
}
