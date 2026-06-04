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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
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
import { useCreatePaymentOrder, useVerifyPayment } from '../../../src/api/payments';
import { useWalletBalance } from '../../../src/api/wallet';
import { REVIEW_TAGS, useSubmitReview, type ReviewTag } from '../../../src/api/reviews';
import { startCashfreeWebPayment } from '../../../src/lib/cashfree';
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
  const [showReview, setShowReview] = useState(false);

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
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </SafeAreaView>
    );
  }
  if (isError || !data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-center text-sm text-danger">Couldn&apos;t load booking.</Text>
        <Pressable onPress={() => void refetch()} className="mt-3">
          <Text className="text-sm font-semibold text-brand">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

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

        {data.status === 'completed' && data.paymentStatus !== 'paid' ? (
          <PaymentCard booking={data} onPaid={() => void refetch()} />
        ) : null}

        {data.status === 'completed' && data.paymentStatus === 'paid' ? (
          <View className="mx-5 mt-5 flex-row items-center rounded-card bg-success/10 p-4">
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            <Text className="ml-2 flex-1 text-sm font-semibold text-success">
              Paid {formatRupees(data.totalAmount)} · Thanks for using TrustNear
            </Text>
          </View>
        ) : null}

        {data.status === 'completed' && data.professional ? (
          <RateCard booking={data} onRate={() => setShowReview(true)} />
        ) : null}

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

      {data.professional ? (
        <ReviewSheet
          visible={showReview}
          onClose={() => setShowReview(false)}
          bookingId={data.id}
          proName={data.professional.user.fullName}
        />
      ) : null}
    </View>
  );
}

function StatusHero({ booking, justBooked }: { booking: BookingDetail; justBooked: boolean }) {
  const router = useRouter();
  const tone = bookingStatusTone(booking.status);
  const bg =
    tone === 'success'
      ? colors.success
      : tone === 'danger'
        ? colors.danger
        : tone === 'progress'
          ? colors.brand.DEFAULT
          : colors.brand[800];
  return (
    <View style={{ backgroundColor: bg }}>
      {/* Gold glow accent — works against any tone */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: 'rgba(212,162,76,0.14)',
        }}
      />
      <SafeAreaView edges={['top']}>
        <View className="px-5 pb-5 pt-2">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text
              className="text-[11px] font-bold uppercase tracking-[2px]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              #{booking.bookingNumber}
            </Text>
            <View style={{ width: 40 }} />
          </View>

          <View className="mt-5">
            <Text
              className="text-[10px] font-bold uppercase tracking-[2px]"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {justBooked ? 'Booking confirmed' : 'Current status'}
            </Text>
            <Text className="mt-1 text-[26px] font-bold text-ink-inverse">
              {bookingStatusLabel(booking.status)}
            </Text>
            <Text className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {booking.category.name} · {formatScheduledAt(booking.scheduledAt)}
            </Text>
          </View>
        </View>
      </SafeAreaView>
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
      {booking.promoDiscount > 0 ? (
        <View className="mt-2 flex-row items-center">
          <Ionicons name="pricetag" size={13} color={colors.success} />
          <Text className="ml-1.5 text-xs font-semibold text-success">
            Promo discount applied · −{formatRupees(booking.promoDiscount)}
          </Text>
        </View>
      ) : null}
      <Text className="mt-1 text-[11px] text-ink-subtle">
        Payment status: {booking.paymentStatus}
      </Text>
    </View>
  );
}

function PaymentCard({ booking, onPaid }: { booking: BookingDetail; onPaid: () => void }) {
  const createOrder = useCreatePaymentOrder();
  const verify = useVerifyPayment();
  const wallet = useWalletBalance();
  const [error, setError] = useState<string | null>(null);
  const [useWallet, setUseWallet] = useState(true);
  const inFlight = createOrder.isPending || verify.isPending;

  const walletBalance = wallet.data?.walletBalance ?? 0;
  const hasWallet = walletBalance > 0;
  const walletApplicable = useWallet ? Math.min(walletBalance, booking.totalAmount) : 0;
  const payable = booking.totalAmount - walletApplicable;

  const handlePay = async () => {
    setError(null);
    try {
      const order = await createOrder.mutateAsync({ bookingId: booking.id, useWallet });
      // Wallet covered the whole amount — server already settled it (paymentStatus
      // is 'paid' before this resolves). Trust it; skip the gateway SDK entirely.
      if (order.paid) {
        void verify.mutateAsync(booking.id).catch(() => undefined);
        void wallet.refetch();
        onPaid();
        return;
      }
      // The SDK environment MUST match where the server minted the session.
      // Trust the server's `environment`; fall back to __DEV__ only if an
      // older API build didn't send it.
      const sandbox = order.environment ? order.environment === 'sandbox' : __DEV__;
      const result = await startCashfreeWebPayment({
        sessionId: order.paymentSessionId,
        orderId: order.providerOrderId,
        sandbox,
      });
      // Webhook usually wins the race, but verifying gives us instant UI
      // feedback. Either path ends with paymentStatus === 'paid'.
      const verifyRes = await verify.mutateAsync(booking.id);
      void wallet.refetch();
      if (verifyRes.status === 'paid') {
        onPaid();
        return;
      }
      if (!result.ok) {
        setError(result.error?.message ?? 'Payment was not completed.');
      } else {
        // SDK said ok but backend hasn't reconciled yet — poll picks it up.
        setError("Payment received. We're confirming with the bank…");
      }
    } catch (e) {
      if (e instanceof ApiCallError) {
        setError(e.message);
      } else if (e instanceof Error) {
        setError(
          e.message.includes('CFPaymentGatewayService') ||
            e.message.includes('Native module') ||
            e.message.includes('TurboModule')
            ? 'Payment requires the TrustNear dev client app — re-install from the latest EAS build.'
            : e.message,
        );
      } else {
        setError('Could not start payment.');
      }
    }
  };

  return (
    <View className="mx-5 mt-5 rounded-card bg-brand p-5">
      <View className="flex-row items-center">
        <Ionicons name="card" size={18} color="#fff" />
        <Text className="ml-2 text-xs font-bold uppercase tracking-wider text-ink-inverse">
          Payment due
        </Text>
      </View>
      <Text className="mt-2 text-3xl font-black text-ink-inverse">{formatRupees(payable)}</Text>
      <Text className="mt-1 text-xs text-ink-inverse/80">
        {payable === 0
          ? 'Fully covered by your wallet — tap to confirm.'
          : 'Service complete. Pay securely via UPI, card, or netbanking.'}
      </Text>

      {hasWallet ? (
        <Pressable
          onPress={() => setUseWallet((v) => !v)}
          className="mt-3 flex-row items-center justify-between rounded-card bg-white/10 px-3.5 py-3"
        >
          <View className="flex-1 flex-row items-center">
            <Ionicons name="wallet" size={16} color="#fff" />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-bold text-ink-inverse">Use wallet balance</Text>
              <Text className="text-[11px] text-ink-inverse/70">
                {formatRupees(walletBalance)} available
                {useWallet && walletApplicable > 0
                  ? ` · −${formatRupees(walletApplicable)} applied`
                  : ''}
              </Text>
            </View>
          </View>
          {/* Lightweight toggle pill */}
          <View
            className={`h-6 w-11 justify-center rounded-full px-0.5 ${
              useWallet ? 'bg-accent' : 'bg-white/30'
            }`}
          >
            <View
              className={`h-5 w-5 rounded-full bg-white ${useWallet ? 'self-end' : 'self-start'}`}
            />
          </View>
        </Pressable>
      ) : null}

      <Pressable
        disabled={inFlight}
        onPress={() => void handlePay()}
        className={`mt-4 flex-row items-center justify-center rounded-card bg-accent py-3.5 ${
          inFlight ? 'opacity-60' : ''
        }`}
      >
        {inFlight ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons
              name={payable === 0 ? 'checkmark-circle' : 'lock-closed'}
              size={16}
              color="#fff"
            />
            <Text className="ml-2 text-sm font-bold text-ink-inverse">
              {payable === 0 ? 'Confirm with wallet' : `Pay ${formatRupees(payable)}`}
            </Text>
          </>
        )}
      </Pressable>
      {error ? (
        <Text className="mt-3 text-center text-xs font-medium text-ink-inverse/90">{error}</Text>
      ) : null}
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
  const insets = useSafeAreaInsets();
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
        <Pressable
          onPress={() => undefined}
          className="rounded-t-3xl bg-surface px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
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

// ─── Rating ──────────────────────────────────────────────────────────
// Shown on a completed booking. Either invites a review or, once one
// exists (booking.review), reflects the rating the customer gave.
function RateCard({ booking, onRate }: { booking: BookingDetail; onRate: () => void }) {
  if (booking.review) {
    return (
      <View className="mx-5 mt-5 flex-row items-center rounded-card border border-border bg-surface p-4">
        <Ionicons name="star" size={20} color={colors.accent.DEFAULT} />
        <Text className="ml-2 flex-1 text-sm font-semibold text-ink">
          You rated this {booking.review.rating}★
        </Text>
        <Text className="text-xs text-ink-subtle">Thanks for the feedback</Text>
      </View>
    );
  }
  return (
    <View className="mx-5 mt-5 rounded-card border border-accent/30 bg-accent/5 p-4">
      <Text className="text-sm font-bold text-ink">How was your experience?</Text>
      <Text className="mt-1 text-xs text-ink-muted">
        Rate {booking.professional?.user.fullName ?? 'your expert'} to help others book with
        confidence.
      </Text>
      <Pressable
        onPress={onRate}
        className="mt-3 flex-row items-center justify-center rounded-card bg-accent py-3"
      >
        <Ionicons name="star" size={16} color="#fff" />
        <Text className="ml-2 text-sm font-bold text-ink-inverse">Rate your expert</Text>
      </Pressable>
    </View>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View className="flex-row justify-center">
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} className="px-1.5">
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={40}
            color={n <= value ? colors.accent.DEFAULT : colors.border.DEFAULT}
          />
        </Pressable>
      ))}
    </View>
  );
}

const RATING_HINTS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

function ReviewSheet({
  visible,
  onClose,
  bookingId,
  proName,
}: {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  proName: string;
}) {
  const insets = useSafeAreaInsets();
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<ReviewTag[]>([]);
  const [text, setText] = useState('');
  const submit = useSubmitReview();

  // Reset whenever the sheet opens fresh.
  useEffect(() => {
    if (!visible) {
      setRating(0);
      setTags([]);
      setText('');
    }
  }, [visible]);

  // Drop sentiment-mismatched tags when the rating flips across the midpoint
  // (e.g. picked "Punctual" at 5★, then dropped to 2★ → clear positives).
  const positive = rating >= 4;
  const chips = REVIEW_TAGS.filter((t) => (positive ? t.positive : !t.positive));
  useEffect(() => {
    if (rating === 0) return;
    setTags((prev) =>
      prev.filter((k) => {
        const meta = REVIEW_TAGS.find((t) => t.key === k);
        return meta ? meta.positive === positive : false;
      }),
    );
  }, [rating, positive]);

  const toggleTag = (k: ReviewTag) => {
    setTags((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : prev.length >= 5 ? prev : [...prev, k],
    );
  };

  const onSubmit = async () => {
    if (rating < 1) return;
    try {
      await submit.mutateAsync({ bookingId, rating, tags, reviewText: text });
      onClose();
      Alert.alert('Thank you!', 'Your review helps the TrustNear community.');
    } catch (e) {
      Alert.alert(
        "Couldn't submit",
        e instanceof ApiCallError ? e.message : 'Please try again in a moment.',
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={() => undefined}
          className="rounded-t-3xl bg-surface px-5 pt-5"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
          <Text className="text-center text-lg font-bold text-ink">Rate your experience</Text>
          <Text className="mt-1 text-center text-sm text-ink-muted">with {proName}</Text>

          <View className="mt-5">
            <StarPicker value={rating} onChange={setRating} />
            <Text className="mt-2 text-center text-sm font-semibold text-accent">
              {RATING_HINTS[rating] ?? ''}
            </Text>
          </View>

          {rating > 0 ? (
            <View className="mt-5 flex-row flex-wrap justify-center">
              {chips.map((t) => {
                const on = tags.includes(t.key);
                return (
                  <Pressable
                    key={t.key}
                    onPress={() => toggleTag(t.key)}
                    className={`m-1 rounded-full border px-3.5 py-2 ${
                      on ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${on ? 'text-accent' : 'text-ink-muted'}`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {rating > 0 ? (
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
              className="mt-4 min-h-[72px] rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-ink"
            />
          ) : null}

          <Pressable
            disabled={rating < 1 || submit.isPending}
            onPress={() => void onSubmit()}
            className={`mt-5 items-center rounded-card py-3.5 ${
              rating >= 1 && !submit.isPending ? 'bg-accent' : 'bg-accent/40'
            }`}
          >
            {submit.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-bold text-ink-inverse">Submit review</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
