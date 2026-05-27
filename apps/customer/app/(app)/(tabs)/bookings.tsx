import { ScrollView, View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { isTerminalStatus, useMyBookings, type BookingListItem } from '../../../src/api/bookings';
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatRupees,
  formatScheduledAt,
} from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';

export default function BookingsScreen() {
  const router = useRouter();
  const { data, isPending, isError, isFetching, refetch } = useMyBookings();
  const insets = useSafeAreaInsets();
  const bottomPad = 64 + insets.bottom + 32;

  const active = (data?.bookings ?? []).filter((b) => !isTerminalStatus(b.status));
  const past = (data?.bookings ?? []).filter((b) => isTerminalStatus(b.status));

  return (
    <View className="flex-1 bg-surface-muted">
      <StatusBar style="light" />
      <View className="bg-brand-800" style={{ paddingBottom: 16 }}>
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
          <View className="px-5 pt-2">
            <Text
              className="text-[10px] font-bold uppercase tracking-[2px]"
              style={{ color: colors.accent[200] }}
            >
              Your activity
            </Text>
            <Text className="mt-1 text-[26px] font-bold text-ink-inverse">My bookings</Text>
            <Text className="mt-0.5 text-[13px]" style={{ color: colors.accent[200] }}>
              {active.length} active · {past.length} past
            </Text>
          </View>
        </SafeAreaView>
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="px-5 pt-6">
          <Text className="text-sm text-danger">Couldn't load bookings.</Text>
          <Pressable onPress={() => void refetch()} className="mt-2 self-start">
            <Text className="text-sm font-semibold text-brand">Try again</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: bottomPad }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
          }
        >
          {active.length === 0 && past.length === 0 ? <Empty /> : null}

          {active.length > 0 ? (
            <>
              <SectionHeader title="Active" />
              {active.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onPress={() =>
                    router.push({ pathname: '/(app)/booking/[id]', params: { id: b.id } })
                  }
                />
              ))}
            </>
          ) : null}

          {past.length > 0 ? (
            <>
              <SectionHeader title="Past" />
              {past.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onPress={() =>
                    router.push({ pathname: '/(app)/booking/[id]', params: { id: b.id } })
                  }
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-1 mt-5 px-5 text-xs font-bold uppercase tracking-wider text-ink-subtle">
      {title}
    </Text>
  );
}

function Empty() {
  return (
    <View className="items-center px-6 pt-12">
      <Ionicons name="receipt-outline" size={42} color={colors.ink.subtle} />
      <Text className="mt-3 text-base font-semibold text-ink">No bookings yet</Text>
      <Text className="mt-1 text-center text-sm text-ink-muted">
        Find a verified expert from the Services tab and book your first visit.
      </Text>
    </View>
  );
}

function BookingCard({ booking, onPress }: { booking: BookingListItem; onPress: () => void }) {
  const tone = bookingStatusTone(booking.status);
  const pillBg =
    tone === 'success'
      ? 'bg-success/10'
      : tone === 'danger'
        ? 'bg-danger/10'
        : tone === 'progress'
          ? 'bg-brand/10'
          : 'bg-ink-subtle/10';
  const pillText =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'progress'
          ? 'text-brand'
          : 'text-ink-muted';

  return (
    <Pressable
      onPress={onPress}
      className="mx-5 mt-3 rounded-card border border-border bg-surface p-4"
      style={{ elevation: 1 }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text numberOfLines={1} className="text-sm font-semibold text-ink">
            {booking.category.name}
          </Text>
          <Text className="mt-0.5 text-[11px] text-ink-subtle">#{booking.bookingNumber}</Text>
        </View>
        <View className={`rounded-pill px-2.5 py-1 ${pillBg}`}>
          <Text className={`text-[10px] font-bold ${pillText}`}>
            {bookingStatusLabel(booking.status)}
          </Text>
        </View>
      </View>

      {booking.professional ? (
        <View className="mt-3 flex-row items-center">
          <Avatar
            fullName={booking.professional.user.fullName}
            photoUrl={booking.professional.user.profilePhoto ?? undefined}
            size={36}
          />
          <View className="ml-2 flex-1">
            <Text className="text-xs font-semibold text-ink-muted">
              {booking.professional.user.fullName}
            </Text>
            {booking.professional.professionalTitle ? (
              <Text className="text-[11px] text-ink-subtle">
                {booking.professional.professionalTitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View className="mt-3 flex-row items-center">
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
          <Text className="ml-2 text-xs text-ink-muted">Matching expert…</Text>
        </View>
      )}

      <View className="mt-3 flex-row items-center justify-between border-t border-border pt-3">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={12} color={colors.ink.subtle} />
          <Text className="ml-1 text-[11px] text-ink-muted">
            {formatScheduledAt(booking.scheduledAt)}
          </Text>
        </View>
        <Text className="text-sm font-bold text-brand">{formatRupees(booking.totalAmount)}</Text>
      </View>
    </Pressable>
  );
}
