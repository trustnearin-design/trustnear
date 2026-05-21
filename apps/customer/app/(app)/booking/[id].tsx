import { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  customerCanCancel,
  isTerminalStatus,
  useBookingDetail,
  useCancelBooking,
  type BookingDetail,
  type BookingStatus,
} from '../../../src/api/bookings';
import { trackingConnLabel, useBookingTracking } from '../../../src/api/tracking';
import { BookingMap, EtaBanner } from '../../../src/components/BookingMap';
import { clearBookingOtp, getBookingOtp, saveBookingOtp } from '../../../src/lib/bookingOtp';
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatRupees,
  formatScheduledAt,
  priceUnitLabel,
} from '../../../src/lib/format';
import { ApiCallError } from '../../../src/api/client';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';

const STATE_TIMELINE: BookingStatus[] = [
  'pending_match',
  'matched',
  'confirmed',
  'pro_en_route',
  'in_progress',
  'completed',
];

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id, justBooked } = useLocalSearchParams<{ id: string; justBooked?: string }>();
  const { data, isPending, isError, isFetching, refetch } = useBookingDetail(id);
  const cancelMut = useCancelBooking();
  const tracking = useBookingTracking(id);
  const [otp, setOtp] = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      const v = await getBookingOtp(id);
      if (!cancelled) setOtp(v);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Once booking enters terminal state, wipe the saved OTP — it's no longer needed.
  useEffect(() => {
    if (data && isTerminalStatus(data.status) && id) {
      void clearBookingOtp(id);
    }
  }, [data, id]);

  if (isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Stack.Screen options={{ title: 'Booking' }} />
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Stack.Screen options={{ title: 'Booking' }} />
        <Text className="text-center text-sm text-danger">Couldn't load booking.</Text>
        <Pressable onPress={() => void refetch()} className="mt-3">
          <Text className="text-sm font-semibold text-brand">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface-muted" edges={['bottom']}>
      <Stack.Screen options={{ title: `#${data.bookingNumber}` }} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      >
        <StatusHero booking={data} justBooked={justBooked === '1'} />

        {(data.status === 'pro_en_route' || data.status === 'in_progress') &&
        data.addressLat &&
        data.addressLng ? (
          <View className="overflow-hidden">
            <BookingMap
              customer={{ lat: Number(data.addressLat), lng: Number(data.addressLng) }}
              pro={
                tracking.proLocation
                  ? { lat: tracking.proLocation.latitude, lng: tracking.proLocation.longitude }
                  : null
              }
            />
            {tracking.proLocation ? (
              <EtaBanner
                etaText={tracking.proLocation.etaText}
                distanceMeters={tracking.proLocation.distanceMeters}
                provider={tracking.proLocation.provider}
              />
            ) : (
              <View className="flex-row items-center bg-brand-900 px-4 py-3">
                <ActivityIndicator color="#fff" />
                <Text className="ml-3 flex-1 text-sm font-semibold text-ink-inverse">
                  {trackingConnLabel(tracking)}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {data.status === 'confirmed' || data.status === 'pro_en_route' ? (
          <OtpCard otp={otp} bookingId={data.id} onRegenerate={() => void refetch()} />
        ) : null}

        <Timeline status={data.status} />

        {data.professional ? <ExpertCard booking={data} /> : <MatchingCard />}

        <DetailsCard booking={data} />
        <PriceCard booking={data} />

        {customerCanCancel(data.status) ? (
          <View className="mx-5 mt-5">
            <Pressable
              onPress={() => setShowCancel(true)}
              className="flex-row items-center justify-center rounded-card border border-danger/30 bg-danger/5 py-3.5"
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text className="ml-2 text-sm font-semibold text-danger">Cancel booking</Text>
            </Pressable>
          </View>
        ) : null}

        {isTerminalStatus(data.status) ? (
          <View className="mx-5 mt-5">
            <Pressable
              onPress={() => router.replace('/(app)/(tabs)/bookings')}
              className="items-center rounded-card bg-brand py-3.5"
            >
              <Text className="text-sm font-semibold text-ink-inverse">Back to my bookings</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <CancelSheet
        visible={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={async (reason) => {
          if (!id) return;
          try {
            await cancelMut.mutateAsync({ id, reason });
            setShowCancel(false);
          } catch (e) {
            if (e instanceof ApiCallError) {
              Alert.alert("Can't cancel", e.message);
            } else {
              Alert.alert('Error', 'Try again in a moment.');
            }
          }
        }}
        loading={cancelMut.isPending}
      />
    </SafeAreaView>
  );
}

function StatusHero({ booking, justBooked }: { booking: BookingDetail; justBooked: boolean }) {
  const tone = bookingStatusTone(booking.status);
  const bg =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'progress'
          ? colors.brand.DEFAULT
          : colors.brand[700];
  return (
    <View style={{ backgroundColor: bg }} className="px-5 pb-5 pt-4">
      <Text className="text-[11px] font-bold uppercase tracking-wider text-ink-inverse/80">
        {justBooked ? 'Booking confirmed' : 'Current status'}
      </Text>
      <Text className="mt-1 text-2xl font-bold text-ink-inverse">
        {bookingStatusLabel(booking.status)}
      </Text>
      <Text className="mt-1 text-xs text-ink-inverse/80">
        {booking.category.name} · {formatScheduledAt(booking.scheduledAt)}
      </Text>
    </View>
  );
}

function OtpCard({
  otp,
  bookingId,
  onRegenerate,
}: {
  otp: string | null;
  bookingId: string;
  onRegenerate: () => void;
}) {
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (otp || recovered) return;
    void (async () => {
      const v = await getBookingOtp(bookingId);
      if (v) {
        await saveBookingOtp(bookingId, v);
        setRecovered(true);
        onRegenerate();
      }
    })();
  }, [otp, recovered, bookingId, onRegenerate]);

  return (
    <View className="mx-5 mt-5 rounded-card bg-accent p-5">
      <View className="flex-row items-center">
        <Ionicons name="key" size={18} color="#fff" />
        <Text className="ml-2 text-xs font-bold uppercase tracking-wider text-ink-inverse">
          Share this OTP with your expert
        </Text>
      </View>
      <Text className="mt-3 text-center text-4xl font-black tracking-[8px] text-ink-inverse">
        {otp ?? '— — — — — —'}
      </Text>
      <Text className="mt-3 text-center text-[11px] text-ink-inverse/90">
        Only share once your expert has arrived at your address. The OTP unlocks the work session.
      </Text>
    </View>
  );
}

function Timeline({ status }: { status: BookingStatus }) {
  if (status === 'cancelled_customer' || status === 'cancelled_pro' || status === 'disputed') {
    return null;
  }
  const currentIdx =
    status === 'otp_verified'
      ? STATE_TIMELINE.indexOf('in_progress')
      : STATE_TIMELINE.indexOf(status);

  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Progress
      </Text>
      {STATE_TIMELINE.map((s, idx) => {
        const isDone = idx < currentIdx;
        const isActive = idx === currentIdx;
        return (
          <View key={s} className="flex-row">
            <View className="items-center" style={{ width: 22 }}>
              <View
                className={`h-4 w-4 items-center justify-center rounded-full ${
                  isDone || isActive ? 'bg-brand' : 'bg-border'
                }`}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={10} color="#fff" />
                ) : isActive ? (
                  <View className="h-1.5 w-1.5 rounded-full bg-surface" />
                ) : null}
              </View>
              {idx < STATE_TIMELINE.length - 1 ? (
                <View
                  className={`w-px flex-1 ${isDone ? 'bg-brand' : 'bg-border'}`}
                  style={{ minHeight: 18 }}
                />
              ) : null}
            </View>
            <Text
              className={`ml-3 pb-3 text-sm ${
                isActive ? 'font-bold text-ink' : isDone ? 'text-ink-muted' : 'text-ink-subtle'
              }`}
            >
              {bookingStatusLabel(s)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function MatchingCard() {
  return (
    <View className="mx-5 mt-5 items-center rounded-card border border-border bg-surface p-6">
      <ActivityIndicator color={colors.brand.DEFAULT} />
      <Text className="mt-3 text-sm font-semibold text-ink">Looking for an available expert</Text>
      <Text className="mt-1 text-center text-xs text-ink-muted">
        This usually takes under a minute. We'll notify you as soon as someone accepts.
      </Text>
    </View>
  );
}

function ExpertCard({ booking }: { booking: BookingDetail }) {
  if (!booking.professional) return null;
  const pro = booking.professional;
  const phone = pro.user.phone;
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Your expert
      </Text>
      <View className="flex-row items-center">
        <Avatar
          fullName={pro.user.fullName}
          photoUrl={pro.user.profilePhoto ?? undefined}
          size={52}
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-ink">{pro.user.fullName}</Text>
          {pro.professionalTitle ? (
            <Text className="text-xs text-ink-muted">{pro.professionalTitle}</Text>
          ) : null}
          <View className="mt-0.5 flex-row items-center">
            <Ionicons name="star" size={12} color={colors.accent.DEFAULT} />
            <Text className="ml-1 text-xs font-medium text-ink">
              {Number(pro.trustScore).toFixed(1)}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => void Linking.openURL(`tel:${phone}`)}
          className="h-11 w-11 items-center justify-center rounded-full bg-brand-100"
        >
          <Ionicons name="call" size={20} color={colors.brand.DEFAULT} />
        </Pressable>
      </View>
    </View>
  );
}

function DetailsCard({ booking }: { booking: BookingDetail }) {
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Details
      </Text>
      <Row icon="construct-outline" label="Service" value={booking.category.name} />
      <Row icon="time-outline" label="When" value={formatScheduledAt(booking.scheduledAt)} />
      <Row
        icon="hourglass-outline"
        label="Duration"
        value={
          booking.durationMinutes < 60
            ? `${booking.durationMinutes} min`
            : `${booking.durationMinutes / 60}h`
        }
      />
      <Row icon="location-outline" label="Address" value={booking.addressLine} multiline />
      {booking.notes ? (
        <Row icon="document-text-outline" label="Notes" value={booking.notes} multiline />
      ) : null}
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  multiline,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View className="flex-row items-start py-1.5">
      <Ionicons name={icon} size={16} color={colors.ink.subtle} style={{ marginTop: 1 }} />
      <Text className="ml-2 w-20 text-xs text-ink-subtle">{label}</Text>
      <Text className="flex-1 text-sm text-ink" numberOfLines={multiline ? undefined : 1}>
        {value}
      </Text>
    </View>
  );
}

function PriceCard({ booking }: { booking: BookingDetail }) {
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">Price</Text>
      <View className="flex-row items-end justify-between">
        <Text className="text-2xl font-bold text-brand">{formatRupees(booking.totalAmount)}</Text>
        <Text className="text-xs text-ink-subtle">
          Base {formatRupees(booking.category.basePrice)}
          {priceUnitLabel(booking.category.priceUnit)}
        </Text>
      </View>
      <Text className="mt-1 text-[11px] text-ink-subtle">
        Payment status: {booking.paymentStatus}
      </Text>
    </View>
  );
}

function CancelSheet({
  visible,
  onClose,
  onConfirm,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  const valid = reason.trim().length >= 3;

  useEffect(() => {
    if (!visible) setReason('');
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => undefined} className="rounded-t-3xl bg-surface px-5 pb-8 pt-5">
          <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
          <Text className="text-lg font-bold text-ink">Cancel booking?</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Tell us why so we can improve. Cancellation fees may apply if your expert is en route.
          </Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (min 3 characters)"
            placeholderTextColor="#94A3B8"
            multiline
            className="mt-4 min-h-[80px] rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-ink"
          />
          <View className="mt-4 flex-row">
            <Pressable
              onPress={onClose}
              className="mr-2 flex-1 items-center rounded-card border border-border bg-surface py-3.5"
            >
              <Text className="text-sm font-semibold text-ink-muted">Keep booking</Text>
            </Pressable>
            <Pressable
              disabled={!valid || loading}
              onPress={() => void onConfirm(reason.trim())}
              className={`ml-2 flex-1 items-center rounded-card py-3.5 ${
                valid && !loading ? 'bg-danger' : 'bg-danger/40'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-bold text-ink-inverse">Cancel booking</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
