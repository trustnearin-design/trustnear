import { useMemo } from 'react';
import { ScrollView, View, Text, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useWalletBalance, useWalletTransactions, type WalletTxn } from '../../../src/api/wallet';
import { useTodaySummary } from '../../../src/api/me';
import { formatRupees } from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';
import { BrandHero, MascotImage, SectionHeader } from '../../../src/components/ui';

/**
 * D7 earnings — Plum gradient hero with wallet balance + Sevak celebrator,
 * today + week stat grids using the same tone-coded boxes from the pro
 * home, and a clean payout list with iconized rows.
 */
export default function EarningsScreen() {
  const bal = useWalletBalance();
  const txns = useWalletTransactions(50);
  const today = useTodaySummary();

  const refreshing = bal.isFetching || txns.isFetching || today.isFetching;

  const weekly = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 86400_000;
    const txList = txns.data?.transactions ?? [];
    const inWindow = txList.filter((t) => new Date(t.createdAt).getTime() >= sevenDaysAgo);
    const payouts = inWindow.filter((t) => t.reason === 'pro_payout');
    const earned = payouts.reduce((s, t) => s + t.amount, 0);
    const tips = inWindow
      .filter((t) => t.reason === 'adjustment')
      .reduce((s, t) => s + t.amount, 0);
    return { jobs: payouts.length, earned, tips };
  }, [txns.data]);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void bal.refetch();
              void txns.refetch();
              void today.refetch();
            }}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        <BrandHero bottomGap={40}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 4,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text
                style={{
                  color: colors.support[300],
                  fontSize: 11,
                  fontWeight: '800',
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                Wallet balance
              </Text>
              {bal.isPending ? (
                <ActivityIndicator
                  color="#FFFFFF"
                  style={{ marginTop: 12, alignSelf: 'flex-start' }}
                />
              ) : (
                <Text
                  style={{
                    marginTop: 6,
                    fontSize: 38,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: -0.8,
                  }}
                >
                  {formatRupees(bal.data?.walletBalance ?? 0)}
                </Text>
              )}
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.brand[200] }}>
                Daily payouts directly to your bank
              </Text>
            </View>
            <MascotImage variant="celebrator" tone="butter" size={90} />
          </View>
        </BrandHero>

        {/* Today */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <SectionHeader eyebrow="TODAY · LIVE" title="Snapshot" />
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 12, flexDirection: 'row' }}>
          <StatBox
            icon="briefcase"
            label="Jobs"
            value={today.isPending ? '—' : String(today.data?.jobsCompleted ?? 0)}
          />
          <View style={{ width: 12 }} />
          <StatBox
            icon="cash"
            label="Earned"
            value={today.isPending ? '—' : formatRupees(today.data?.earnedPaise ?? 0)}
            tone="coral"
          />
          <View style={{ width: 12 }} />
          <StatBox
            icon="star"
            label="Rating"
            value={
              today.isPending
                ? '—'
                : today.data?.ratingAvg != null
                  ? today.data.ratingAvg.toFixed(1)
                  : 'New'
            }
            tone="butter"
          />
        </View>

        {/* This week */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeader eyebrow="LAST 7 DAYS" title="This week" />
        </View>
        <View style={{ paddingHorizontal: 16, marginTop: 12, flexDirection: 'row' }}>
          <StatBox icon="briefcase" label="Jobs" value={String(weekly.jobs)} />
          <View style={{ width: 12 }} />
          <StatBox icon="cash" label="Earned" value={formatRupees(weekly.earned)} tone="coral" />
          <View style={{ width: 12 }} />
          <StatBox icon="add-circle" label="Adjust" value={formatRupees(weekly.tips)} />
        </View>

        {/* Recent payouts */}
        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeader eyebrow="PAYOUTS" title="Recent transactions" />
        </View>

        {txns.isPending ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              alignItems: 'center',
              padding: 28,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : (txns.data?.transactions.length ?? 0) === 0 ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              alignItems: 'center',
              padding: 28,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            <MascotImage variant="resting" tone="plum" size={92} />
            <Text
              style={{ marginTop: 12, fontSize: 15, fontWeight: '800', color: colors.ink.DEFAULT }}
            >
              No payouts yet
            </Text>
            <Text
              style={{
                marginTop: 6,
                textAlign: 'center',
                fontSize: 12,
                color: colors.ink.muted,
                lineHeight: 18,
              }}
            >
              Complete your first job to start{'\n'}earning. Daily payouts to your bank.
            </Text>
          </View>
        ) : (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 12,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
              overflow: 'hidden',
            }}
          >
            {txns.data!.transactions.map((t, idx) => (
              <View key={t.id}>
                <TxnRow txn={t} />
                {idx < txns.data!.transactions.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function TxnRow({ txn }: { txn: WalletTxn }) {
  const isCredit = txn.type === 'credit' || txn.type === 'refund' || txn.type === 'release';
  const sign = isCredit ? '+' : '-';
  const { icon, tone, title } = describe(txn);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 13,
      }}
    >
      <View
        style={{
          marginRight: 12,
          height: 40,
          width: 40,
          borderRadius: 20,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone + '18',
        }}
      >
        <Ionicons name={icon} size={18} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink.DEFAULT }}>{title}</Text>
        <Text style={{ marginTop: 2, fontSize: 11, color: colors.ink.subtle }}>
          {new Date(txn.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '800',
            color: isCredit ? colors.success : colors.ink.DEFAULT,
          }}
        >
          {sign}
          {formatRupees(txn.amount)}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 10, color: colors.ink.subtle }}>
          Bal {formatRupees(txn.balanceAfter)}
        </Text>
      </View>
    </View>
  );
}

function describe(txn: WalletTxn): {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  tone: string;
  title: string;
} {
  if (txn.reason === 'pro_payout') {
    return { icon: 'cash', tone: colors.success, title: 'Job payout' };
  }
  if (txn.type === 'refund' || txn.reason === 'refund') {
    return { icon: 'arrow-undo', tone: colors.warning, title: 'Customer refund (clawback)' };
  }
  if (txn.reason === 'adjustment') {
    return { icon: 'construct', tone: colors.warning, title: 'Admin adjustment' };
  }
  if (txn.reason === 'referral_reward') {
    return { icon: 'gift', tone: colors.accent.DEFAULT, title: 'Referral reward' };
  }
  if (txn.reason === 'wallet_topup') {
    return { icon: 'add-circle', tone: colors.success, title: 'Top-up' };
  }
  return { icon: 'swap-horizontal', tone: colors.ink.muted, title: 'Wallet movement' };
}

function StatBox({
  icon,
  label,
  value,
  tone = 'plum',
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  tone?: 'plum' | 'coral' | 'butter';
}) {
  const palette = {
    plum: {
      bg: colors.brand[50],
      iconBg: colors.brand[200],
      iconFg: colors.brand[800],
      value: colors.ink.DEFAULT,
    },
    coral: {
      bg: colors.accent[50],
      iconBg: colors.accent[200],
      iconFg: colors.accent[700],
      value: colors.accent[700],
    },
    butter: {
      bg: colors.support[50],
      iconBg: colors.support[200],
      iconFg: colors.support[700],
      value: colors.support[700],
    },
  }[tone];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.bg,
        borderRadius: 16,
        padding: 12,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: palette.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={14} color={palette.iconFg} />
      </View>
      <Text
        style={{
          marginTop: 10,
          fontSize: 17,
          fontWeight: '800',
          color: palette.value,
          letterSpacing: -0.3,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          marginTop: 2,
          fontSize: 9,
          fontWeight: '800',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          color: colors.ink.subtle,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={{ marginLeft: 64, height: 1, backgroundColor: colors.border.DEFAULT }} />;
}
