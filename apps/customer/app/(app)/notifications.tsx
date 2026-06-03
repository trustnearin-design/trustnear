import { View, Text, Pressable, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  useNotifications,
  useMarkAllRead,
  useMarkRead,
  type InboxItem,
  type InboxType,
} from '../../src/api/inbox';
import { colors } from '../../src/theme/colors';

const ICON: Record<InboxType, React.ComponentProps<typeof Ionicons>['name']> = {
  booking_matched: 'checkmark-circle',
  booking_confirmed: 'checkmark-circle',
  booking_status: 'navigate-circle',
  payment_received: 'card',
  payment_failed: 'alert-circle',
  system: 'megaphone',
};

function timeAgo(iso: string, now: number): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function NotificationsScreen() {
  const router = useRouter();
  const list = useNotifications();
  const markAll = useMarkAllRead();
  const markRead = useMarkRead();
  const now = Date.now();

  const items = list.data?.notifications ?? [];
  const hasUnread = items.some((n) => !n.isRead);

  const onTap = (n: InboxItem) => {
    if (!n.isRead) markRead.mutate(n.id);
    const bookingId = n.data?.bookingId;
    if (bookingId) {
      router.push({ pathname: '/(app)/booking/[id]', params: { id: bookingId } });
    }
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink.DEFAULT} />
          </Pressable>
          <Text className="flex-1 text-[17px] font-bold text-ink">Notifications</Text>
          {hasUnread ? (
            <Pressable onPress={() => markAll.mutate()} hitSlop={8}>
              <Text className="text-[13px] font-bold text-brand">Mark all read</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {list.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Ionicons name="notifications-off-outline" size={40} color={colors.ink.subtle} />
          <Text className="mt-3 text-center text-[15px] font-bold text-ink">
            No notifications yet
          </Text>
          <Text className="mt-1 text-center text-[13px] text-ink-muted">
            Booking updates, payments aur offers yahan dikhenge.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={list.isFetching}
              onRefresh={() => void list.refetch()}
              tintColor={colors.brand.DEFAULT}
            />
          }
          renderItem={({ item: n }) => (
            <Pressable
              onPress={() => onTap(n)}
              className={`mb-2 flex-row items-start rounded-card border p-3.5 ${
                n.isRead ? 'border-border bg-surface' : 'border-brand/30 bg-brand-50/40'
              }`}
            >
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.brand[50] }}
              >
                <Ionicons
                  name={ICON[n.type] ?? 'notifications'}
                  size={18}
                  color={colors.brand[700]}
                />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="flex-1 text-[14px] font-bold text-ink" numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.isRead ? <View className="ml-2 h-2 w-2 rounded-full bg-accent" /> : null}
                </View>
                <Text className="mt-0.5 text-[13px] leading-[18px] text-ink-muted">{n.body}</Text>
                <Text className="mt-1 text-[11px] text-ink-subtle">
                  {timeAgo(n.createdAt, now)}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
