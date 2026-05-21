import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/stores/auth';
import { useLogout } from '../../src/api/auth';
import { formatIndianPhone } from '../../src/lib/format';

export default function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();

  return (
    <SafeAreaView className="flex-1 bg-surface-muted">
      <ScrollView contentContainerClassName="p-6">
        <View className="rounded-card bg-brand p-6">
          <Text className="text-sm text-brand-100">Namaste 🙏</Text>
          <Text className="mt-1 text-2xl font-bold text-ink-inverse">
            {user?.fullName ?? 'Customer'}
          </Text>
          {user?.phone && (
            <Text className="mt-1 text-sm text-brand-100">{formatIndianPhone(user.phone)}</Text>
          )}
        </View>

        <View className="mt-6 rounded-card bg-surface p-5">
          <Text className="text-base font-semibold text-ink">SEVALINK is getting ready</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Discovery, booking and live tracking screens land in Phase 2b. For now you&apos;re
            successfully signed in — the auth + token-refresh layer is working end-to-end.
          </Text>
        </View>

        <Pressable
          disabled={logout.isPending}
          onPress={() => logout.mutate()}
          className="mt-8 items-center rounded-card border border-danger py-4"
        >
          {logout.isPending ? (
            <ActivityIndicator color="#DC2626" />
          ) : (
            <Text className="text-base font-semibold text-danger">Log out</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
