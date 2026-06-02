import { View, Text, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useWalletBalance, useWalletTransactions, type WalletTxn } from '../../src/api/wallet';
import { formatRupees } from '../../src/lib/format';
import { colors } from '../../src/theme/colors';
import { BrandHero, MascotImage, SectionHeader } from '../../src/components/ui';

/**
 * D5 wallet screen — Plum gradient hero with large balance + loyalty
 * points pill. Educational copy explains how the wallet works. Transaction
 * list keeps the existing row design but in the new tokens.
 */
export default function WalletScreen() {
  const router = useRouter();
  const bal = useWalletBalance();
  const txns = useWalletTransactions(50);

  const refreshing = bal.isFetching || txns.isFetching;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <BrandHero onBack={() => router.back()} bottomGap={40}>
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
              Available balance
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
                {bal.isError ? '—' : formatRupees(bal.data?.walletBalance ?? 0)}
              </Text>
            )}
            <Text style={{ marginTop: 4, fontSize: 12, color: colors.brand[200] }}>
              Auto-applied at checkout · refunds credit here
            </Text>
            {(bal.data?.loyaltyPoints ?? 0) > 0 ? (
              <View
                style={{
                  marginTop: 10,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 999,
                  backgroundColor: 'rgba(245,199,106,0.20)',
                }}
              >
                <Ionicons name="star" size={11} color={colors.support[300]} />
                <Text
                  style={{
                    marginLeft: 5,
                    color: colors.support[300],
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 0.3,
                  }}
                >
                  {bal.data?.loyaltyPoints ?? 0} loyalty points
                </Text>
              </View>
            ) : null}
          </View>
          <MascotImage variant="celebrator" tone="butter" size={90} />
        </View>
      </BrandHero>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void bal.refetch();
              void txns.refetch();
            }}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        {/* "How wallet works" educational chips */}
        <View style={{ marginHorizontal: 20, marginTop: 14 }}>
          <View
            style={{
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
              padding: 14,
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: colors.brand[700],
              }}
            >
              How wallet works
            </Text>
            <View style={{ marginTop: 8, flexDirection: 'row', flexWrap: 'wrap' }}>
              <InfoChip icon="arrow-undo" label="Refunds credit here" />
              <InfoChip icon="pricetag" label="Promo credits applied" />
              <InfoChip icon="gift" label="Referral rewards" />
              <InfoChip icon="cash" label="Auto-applied at checkout" />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 22 }}>
          <SectionHeader eyebrow="LATEST · LAST 50" title="Recent transactions" />
        </View>

        {txns.isPending ? (
          <View
            style={{
              marginHorizontal: 20,
              marginTop: 14,
              alignItems: 'center',
              padding: 32,
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 18,
            }}
          >
            <ActivityIndicator color={colors.brand.DEFAULT} />
          </View>
        ) : txns.isError ? (
          <ErrorCard message="Could not load transactions. Pull to refresh." />
        ) : (txns.data?.transactions.length ?? 0) === 0 ? (
          <EmptyCard />
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

function InfoChip({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: colors.brand[50],
        marginRight: 6,
        marginTop: 6,
      }}
    >
      <Ionicons name={icon} size={11} color={colors.brand[700]} />
      <Text style={{ marginLeft: 5, color: colors.brand[800], fontSize: 11, fontWeight: '700' }}>
        {label}
      </Text>
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
  if (txn.type === 'refund' || txn.reason === 'refund') {
    return { icon: 'arrow-undo', tone: colors.success, title: 'Refund credited' };
  }
  if (txn.reason === 'booking_payment') {
    return { icon: 'receipt', tone: colors.brand[700], title: 'Booking payment' };
  }
  if (txn.reason === 'pro_payout') {
    return { icon: 'cash', tone: colors.success, title: 'Job payout' };
  }
  if (txn.reason === 'wallet_topup') {
    return { icon: 'add-circle', tone: colors.success, title: 'Wallet top-up' };
  }
  if (txn.reason === 'promo_credit') {
    return { icon: 'pricetag', tone: colors.accent.DEFAULT, title: 'Promo credit' };
  }
  if (txn.reason === 'referral_reward') {
    return { icon: 'gift', tone: colors.accent.DEFAULT, title: 'Referral reward' };
  }
  if (txn.reason === 'loyalty_redeem') {
    return { icon: 'star', tone: colors.support[600], title: 'Loyalty redeem' };
  }
  if (txn.reason === 'adjustment') {
    return { icon: 'construct', tone: colors.warning, title: 'Admin adjustment' };
  }
  return { icon: 'swap-horizontal', tone: colors.ink.muted, title: 'Wallet movement' };
}

function EmptyCard() {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 14,
        alignItems: 'center',
        padding: 28,
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      }}
    >
      <MascotImage variant="resting" tone="plum" size={92} />
      <Text style={{ marginTop: 12, fontSize: 15, fontWeight: '800', color: colors.ink.DEFAULT }}>
        No transactions yet
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
        Refunds, promo credits, and rewards{'\n'}will appear here.
      </Text>
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View
      style={{
        marginHorizontal: 20,
        marginTop: 14,
        alignItems: 'center',
        padding: 28,
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(194,54,42,0.30)',
      }}
    >
      <Ionicons name="alert-circle" size={26} color={colors.danger} />
      <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 13, color: colors.danger }}>
        {message}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={{ marginLeft: 64, height: 1, backgroundColor: colors.border.DEFAULT }} />;
}
