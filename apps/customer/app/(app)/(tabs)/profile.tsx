import { View, Text, Pressable, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/stores/auth';
import { useLogout } from '../../../src/api/auth';
import { useWalletBalance } from '../../../src/api/wallet';
import { formatIndianPhone, formatRupees } from '../../../src/lib/format';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/theme/colors';
import { BrandHero, Gradient } from '../../../src/components/ui';

/**
 * D5 profile screen — Plum hero with avatar + name + verified pill,
 * inline wallet card (gradient sub-panel) showing balance + loyalty
 * points, then sectioned menu (Account / Help / Legal) with iconized
 * rows. Coral-accented logout at the bottom.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const bal = useWalletBalance();
  const insets = useSafeAreaInsets();
  const bottomPad = 64 + insets.bottom + 32;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.surface.muted }}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomPad }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={bal.isFetching}
            onRefresh={() => void bal.refetch()}
            tintColor={colors.brand.DEFAULT}
          />
        }
      >
        <BrandHero bottomGap={56}>
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
              Your account
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
              <View
                style={{
                  padding: 3,
                  borderRadius: 40,
                  backgroundColor: 'rgba(255,255,255,0.18)',
                }}
              >
                <Avatar fullName={user?.fullName ?? 'Guest'} size={64} borderColor="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 14, flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 20, fontWeight: '800', color: '#FFFFFF' }}
                >
                  {user?.fullName ?? 'Guest'}
                </Text>
                <Text style={{ marginTop: 2, fontSize: 13, color: colors.brand[200] }}>
                  {user?.phone ? formatIndianPhone(user.phone) : ''}
                </Text>
                {user?.isVerified ? (
                  <View
                    style={{
                      marginTop: 6,
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: colors.accent.DEFAULT,
                    }}
                  >
                    <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
                    <Text
                      style={{ marginLeft: 4, fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}
                    >
                      Verified
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </BrandHero>

        {/* Wallet card — floats over the hero edge */}
        <Pressable
          onPress={() => router.push('/(app)/wallet' as never)}
          style={{ marginHorizontal: 20, marginTop: -36 }}
        >
          <Gradient
            colors={colors.gradient.coralCta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 18,
              padding: 16,
              shadowColor: colors.accent.DEFAULT,
              shadowOpacity: 0.28,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  height: 42,
                  width: 42,
                  borderRadius: 21,
                  backgroundColor: 'rgba(255,255,255,0.22)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="wallet" size={20} color="#FFFFFF" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                >
                  Wallet balance
                </Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: '#FFFFFF' }}>
                  {bal.isPending ? '—' : formatRupees(bal.data?.walletBalance ?? 0)}
                </Text>
                {(bal.data?.loyaltyPoints ?? 0) > 0 ? (
                  <Text
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: 'rgba(255,255,255,0.85)',
                      fontWeight: '700',
                    }}
                  >
                    ★ {bal.data?.loyaltyPoints ?? 0} loyalty points
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.85)" />
            </View>
          </Gradient>
        </Pressable>

        <Section title="Account">
          <MenuRow
            icon="wallet-outline"
            label="Wallet & transactions"
            onPress={() => router.push('/(app)/wallet' as never)}
          />
          <Divider />
          <MenuRow
            icon="receipt-outline"
            label="My bookings"
            onPress={() => router.push('/(app)/(tabs)/bookings' as never)}
          />
          <Divider />
          <MenuRow
            icon="call-outline"
            label="Mobile"
            value={user?.phone ? formatIndianPhone(user.phone) : '—'}
          />
        </Section>

        <Section title="Help">
          <MenuRow
            icon="help-circle-outline"
            label="Help & support"
            onPress={() => router.push('/(app)/help' as never)}
          />
          <Divider />
          <MenuRow
            icon="document-text-outline"
            label="Terms of service"
            onPress={() => router.push('/(app)/legal/terms' as never)}
          />
          <Divider />
          <MenuRow
            icon="shield-outline"
            label="Privacy policy"
            onPress={() => router.push('/(app)/legal/privacy' as never)}
          />
          <Divider />
          <MenuRow
            icon="cash-outline"
            label="Refund policy"
            onPress={() => router.push('/(app)/legal/refund' as never)}
          />
        </Section>

        <View style={{ paddingHorizontal: 20, paddingTop: 24 }}>
          <Pressable
            onPress={() => void logout.mutate()}
            disabled={logout.isPending}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: 'rgba(194,54,42,0.30)',
              backgroundColor: 'rgba(194,54,42,0.06)',
            }}
          >
            {logout.isPending ? (
              <ActivityIndicator color={colors.danger} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text
                  style={{ marginLeft: 8, fontSize: 15, fontWeight: '700', color: colors.danger }}
                >
                  Log out
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <Text
          style={{
            marginTop: 22,
            textAlign: 'center',
            fontSize: 11,
            color: colors.ink.subtle,
          }}
        >
          TrustNear · v0.1.0 · Jaipur, IN
        </Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22, paddingHorizontal: 20 }}>
      <Text
        style={{
          marginBottom: 8,
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: colors.ink.subtle,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          borderRadius: 18,
          backgroundColor: colors.surface.DEFAULT,
          borderWidth: 1,
          borderColor: colors.border.DEFAULT,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.brand[50],
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={18} color={colors.brand[700]} />
      </View>
      <Text
        style={{
          marginLeft: 12,
          flex: 1,
          fontSize: 14,
          color: colors.ink.DEFAULT,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
      {value ? (
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink.muted }}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={colors.ink.subtle} />
      ) : null}
    </Pressable>
  );
}

function Divider() {
  return <View style={{ marginLeft: 60, height: 1, backgroundColor: colors.border.DEFAULT }} />;
}
