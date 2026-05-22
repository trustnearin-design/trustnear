import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../src/stores/auth';
import { useLogout } from '../../../src/api/auth';
import { formatIndianPhone } from '../../../src/lib/format';
import { Avatar } from '../../../src/components/Avatar';
import { colors } from '../../../src/theme/colors';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-5 pt-3">
          <Text className="text-2xl font-bold text-ink">Profile</Text>
        </View>

        <View className="mx-5 mt-5 rounded-card bg-brand p-5">
          <View className="flex-row items-center">
            <Avatar fullName={user?.fullName ?? 'Guest'} size={64} borderColor="#FFFFFF" />
            <View className="ml-4 flex-1">
              <Text numberOfLines={1} className="text-lg font-bold text-ink-inverse">
                {user?.fullName ?? 'Guest'}
              </Text>
              <Text className="text-sm text-ink-inverse/80">
                {user?.phone ? formatIndianPhone(user.phone) : ''}
              </Text>
              {user?.isVerified ? (
                <View className="mt-1.5 flex-row items-center self-start rounded-pill bg-accent px-2 py-0.5">
                  <Ionicons name="shield-checkmark" size={10} color="#fff" />
                  <Text className="ml-1 text-[10px] font-bold text-ink-inverse">Verified</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <Section title="Account">
          <MenuRow icon="information-circle-outline" label="Role" value={user?.role ?? '—'} />
          <Divider />
          <MenuRow
            icon="call-outline"
            label="Mobile"
            value={user?.phone ? formatIndianPhone(user.phone) : '—'}
          />
        </Section>

        <Section title="Coming soon">
          <MenuRow icon="wallet-outline" label="Wallet" value="Phase 2e" muted />
          <Divider />
          <MenuRow icon="heart-outline" label="Saved experts" value="Later" muted />
          <Divider />
          <MenuRow icon="help-circle-outline" label="Help & support" value="Phase 5" muted />
        </Section>

        <View className="px-5 pt-6">
          <Pressable
            onPress={() => void logout.mutate()}
            disabled={logout.isPending}
            className="flex-row items-center justify-center rounded-card border border-danger/30 bg-danger/5 py-4"
          >
            {logout.isPending ? (
              <ActivityIndicator color="#DC2626" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                <Text className="ml-2 text-base font-semibold text-danger">Log out</Text>
              </>
            )}
          </Pressable>
        </View>

        <Text className="mt-6 text-center text-[11px] text-ink-subtle">
          TrustNear · v0.1.0 · Jaipur, IN
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-5 px-5">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        {title}
      </Text>
      <View className="rounded-card border border-border bg-surface">{children}</View>
    </View>
  );
}

function MenuRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View className="flex-row items-center px-4 py-3.5">
      <Ionicons name={icon} size={20} color={muted ? colors.ink.subtle : colors.ink.muted} />
      <Text className={`ml-3 flex-1 text-sm ${muted ? 'text-ink-subtle' : 'text-ink-muted'}`}>
        {label}
      </Text>
      <Text className={`text-sm font-medium ${muted ? 'text-ink-subtle' : 'capitalize text-ink'}`}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="ml-11 h-px bg-border" />;
}
