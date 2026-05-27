import { useState } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import {
  isJobTerminal,
  nextProAction,
  useAcceptJob,
  useCancelJob,
  useCompleteJob,
  useJobDetail,
  useStartTrip,
  useVerifyJobOtp,
  type JobDetail,
} from '../../../src/api/jobs';
import { useJobTracking } from '../../../src/api/jobTracking';
import { JobMap, JobEtaBanner } from '../../../src/components/JobMap';
import { Avatar } from '../../../src/components/Avatar';
import { PremiumButton } from '../../../src/components/PremiumButton';
import {
  bookingStatusLabel,
  bookingStatusTone,
  formatIndianPhone,
  formatRupees,
  formatScheduledAt,
} from '../../../src/lib/format';
import { ApiCallError } from '../../../src/api/client';
import { colors } from '../../../src/theme/colors';

const TIMELINE: JobDetail['status'][] = [
  'matched',
  'confirmed',
  'pro_en_route',
  'in_progress',
  'completed',
];

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isPending, isError, isFetching, refetch } = useJobDetail(id);

  const accept = useAcceptJob(id ?? '');
  const startTrip = useStartTrip(id ?? '');
  const verifyOtp = useVerifyJobOtp(id ?? '');
  const complete = useCompleteJob(id ?? '');
  const cancel = useCancelJob(id ?? '');

  // Broadcast GPS only while we're physically en route or actively working
  // the job — outside of those statuses there's nothing for the customer
  // to track and we'd just be draining battery.
  const broadcast = data?.status === 'pro_en_route' || data?.status === 'in_progress';
  const tracking = useJobTracking(id, !!broadcast);

  const [otpVisible, setOtpVisible] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);

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
        <Text className="text-center text-sm text-danger">Couldn&apos;t load job.</Text>
        <Pressable onPress={() => void refetch()} className="mt-3">
          <Text className="text-sm font-semibold text-brand">Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const action = nextProAction(data.status);
  const terminal = isJobTerminal(data.status);
  const showMap =
    (data.status === 'pro_en_route' || data.status === 'in_progress') &&
    data.addressLat &&
    data.addressLng;

  const onPrimaryAction = async () => {
    try {
      if (action === 'accept') {
        await accept.mutateAsync();
      } else if (action === 'start_trip') {
        await startTrip.mutateAsync();
      } else if (action === 'arrived') {
        setOtpVisible(true);
      } else if (action === 'complete') {
        await complete.mutateAsync();
      }
    } catch (e) {
      Alert.alert(
        "Couldn't update",
        e instanceof ApiCallError ? e.message : 'Try again in a moment.',
      );
    }
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: action ? 140 : 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />}
      >
        <StatusHero booking={data} />

        {showMap ? (
          <View className="overflow-hidden">
            <JobMap
              customer={{
                lat: Number(data.addressLat),
                lng: Number(data.addressLng),
              }}
              pro={
                tracking.selfLocation
                  ? { lat: tracking.selfLocation.lat, lng: tracking.selfLocation.lng }
                  : null
              }
            />
            {tracking.selfLocation ? (
              <JobEtaBanner
                etaText={tracking.selfLocation.etaText}
                distanceMeters={tracking.selfLocation.distanceMeters}
                provider={tracking.selfLocation.provider}
              />
            ) : (
              <View className="flex-row items-center bg-brand-900 px-4 py-3">
                <ActivityIndicator color="#fff" />
                <Text className="ml-3 flex-1 text-sm font-semibold text-ink-inverse">
                  {tracking.locationPermission === 'denied'
                    ? 'Location permission denied — enable it to share your live ETA.'
                    : tracking.statusLabel}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <CustomerCard booking={data} />
        <AddressCard booking={data} />
        <Timeline status={data.status} />
        <DetailsCard booking={data} />
        <PayoutCard booking={data} />

        {data.status !== 'in_progress' && !terminal ? (
          <View className="mx-5 mt-5">
            <Pressable
              onPress={() => setCancelVisible(true)}
              className="flex-row items-center justify-center rounded-card border border-danger/30 bg-danger/5 py-3.5"
            >
              <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
              <Text className="ml-2 text-sm font-semibold text-danger">Cancel job</Text>
            </Pressable>
          </View>
        ) : null}

        {terminal ? (
          <View className="mx-5 mt-5">
            <Pressable
              onPress={() => router.replace('/(app)/(tabs)/jobs')}
              className="items-center rounded-card bg-brand py-3.5"
            >
              <Text className="text-sm font-semibold text-ink-inverse">Back to my jobs</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {action ? (
        <ActionBar
          action={action}
          loading={
            accept.isPending || startTrip.isPending || verifyOtp.isPending || complete.isPending
          }
          onPress={() => void onPrimaryAction()}
        />
      ) : null}

      <OtpEntrySheet
        visible={otpVisible}
        onClose={() => setOtpVisible(false)}
        loading={verifyOtp.isPending}
        onSubmit={async (otp) => {
          try {
            await verifyOtp.mutateAsync(otp);
            setOtpVisible(false);
          } catch (e) {
            Alert.alert(
              'Invalid OTP',
              e instanceof ApiCallError ? e.message : 'Ask the customer to read it again.',
            );
          }
        }}
      />

      <CancelSheet
        visible={cancelVisible}
        onClose={() => setCancelVisible(false)}
        loading={cancel.isPending}
        onConfirm={async (reason) => {
          try {
            await cancel.mutateAsync(reason);
            setCancelVisible(false);
          } catch (e) {
            Alert.alert(
              "Can't cancel",
              e instanceof ApiCallError ? e.message : 'Try again in a moment.',
            );
          }
        }}
      />
    </View>
  );
}

// ─── Status hero ──────────────────────────────────────────────────────────

function StatusHero({ booking }: { booking: JobDetail }) {
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
              {booking.status === 'completed' ? 'Job complete' : 'Job status'}
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

// ─── Customer card ────────────────────────────────────────────────────────

function CustomerCard({ booking }: { booking: JobDetail }) {
  const phone = booking.customer.phone;
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Customer
      </Text>
      <View className="flex-row items-center">
        <Avatar
          fullName={booking.customer.fullName}
          photoUrl={booking.customer.profilePhoto ?? undefined}
          size={52}
        />
        <View className="ml-3 flex-1">
          <Text className="text-base font-semibold text-ink">{booking.customer.fullName}</Text>
          <Text className="mt-0.5 text-xs text-ink-muted">{formatIndianPhone(phone)}</Text>
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

// ─── Address card ─────────────────────────────────────────────────────────

function AddressCard({ booking }: { booking: JobDetail }) {
  const lat = Number(booking.addressLat);
  const lng = Number(booking.addressLng);

  const openMaps = () => {
    // Platform-appropriate navigation deeplink. Google Maps drives the
    // turn-by-turn UX on Android; Apple Maps on iOS.
    const label = encodeURIComponent(booking.addressLine);
    const url = Platform.select({
      android: `google.navigation:q=${lat},${lng}`,
      ios: `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    });
    void Linking.openURL(url);
  };

  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Address
      </Text>
      <View className="flex-row items-start">
        <Ionicons name="location" size={18} color={colors.brand.DEFAULT} style={{ marginTop: 2 }} />
        <View className="ml-2 flex-1">
          <Text className="text-sm font-semibold text-ink">{booking.addressLine}</Text>
          {booking.addressArea ? (
            <Text className="mt-0.5 text-xs text-ink-muted">
              {booking.addressArea}
              {booking.addressCity ? `, ${booking.addressCity}` : ''}
            </Text>
          ) : booking.addressCity ? (
            <Text className="mt-0.5 text-xs text-ink-muted">{booking.addressCity}</Text>
          ) : null}
        </View>
      </View>
      <Pressable
        onPress={openMaps}
        className="mt-3 flex-row items-center justify-center rounded-card bg-brand py-3"
        style={{
          shadowColor: colors.brand.DEFAULT,
          shadowOpacity: 0.18,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        }}
      >
        <Ionicons name="navigate" size={16} color="#FFFFFF" />
        <Text className="ml-2 text-sm font-bold text-ink-inverse">Open in Maps</Text>
      </Pressable>
    </View>
  );
}

// ─── Details + payout ─────────────────────────────────────────────────────

function DetailsCard({ booking }: { booking: JobDetail }) {
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Job details
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
      {booking.notes ? (
        <Row icon="document-text-outline" label="Notes" value={booking.notes} multiline />
      ) : null}
    </View>
  );
}

function PayoutCard({ booking }: { booking: JobDetail }) {
  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Your payout
      </Text>
      <View className="flex-row items-end justify-between">
        <Text className="text-2xl font-bold text-success">{formatRupees(booking.proPayout)}</Text>
        <Text className="text-xs text-ink-subtle">
          Customer pays {formatRupees(booking.totalAmount)}
        </Text>
      </View>
      <Text className="mt-1 text-[11px] text-ink-subtle">
        Platform fee {formatRupees(booking.commission)} · Settled to your bank weekly
      </Text>
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

// ─── Timeline ─────────────────────────────────────────────────────────────

function Timeline({ status }: { status: JobDetail['status'] }) {
  if (
    status === 'cancelled_customer' ||
    status === 'cancelled_pro' ||
    status === 'disputed' ||
    status === 'pending_match'
  ) {
    return null;
  }
  const currentIdx =
    status === 'otp_verified' ? TIMELINE.indexOf('in_progress') : TIMELINE.indexOf(status);

  return (
    <View className="mx-5 mt-5 rounded-card border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
        Progress
      </Text>
      {TIMELINE.map((s, idx) => {
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
              {idx < TIMELINE.length - 1 ? (
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

// ─── Action bar ───────────────────────────────────────────────────────────

function ActionBar({
  action,
  loading,
  onPress,
}: {
  action: NonNullable<ReturnType<typeof nextProAction>>;
  loading: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();
  const label = ACTION_LABEL[action];
  const variant: 'brand' | 'accent' = action === 'arrived' ? 'accent' : 'brand';
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pt-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      <PremiumButton
        label={label}
        onPress={onPress}
        loading={loading}
        variant={variant}
        icon={action === 'complete' ? 'checkmark' : 'arrow-forward'}
      />
    </View>
  );
}

const ACTION_LABEL: Record<NonNullable<ReturnType<typeof nextProAction>>, string> = {
  accept: 'Accept job',
  start_trip: 'Start trip',
  arrived: "I'm at the location",
  complete: 'Complete job',
};

// ─── OTP entry sheet ──────────────────────────────────────────────────────

function OtpEntrySheet({
  visible,
  onClose,
  onSubmit,
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => Promise<void> | void;
  loading: boolean;
}) {
  const [otp, setOtp] = useState('');
  const valid = /^\d{6}$/.test(otp);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => undefined} className="rounded-t-3xl bg-surface px-5 pb-8 pt-5">
          <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
          <Text className="text-lg font-bold text-ink">Enter customer&apos;s OTP</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Ask the customer to read the 6-digit code from their TrustNear app. This proves
            you&apos;ve arrived and starts the work session.
          </Text>

          <TextInput
            value={otp}
            onChangeText={(v) => setOtp(v.replace(/\D/g, '').slice(0, 6))}
            placeholder="6-digit OTP"
            placeholderTextColor="#94A3B8"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            className="mt-4 rounded-card border border-border bg-surface-muted px-4 py-4 text-center text-2xl font-bold tracking-[10px] text-ink"
          />

          <View className="mt-4 flex-row">
            <Pressable
              onPress={() => {
                setOtp('');
                onClose();
              }}
              className="mr-2 flex-1 items-center rounded-card border border-border bg-surface py-3.5"
            >
              <Text className="text-sm font-semibold text-ink-muted">Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!valid || loading}
              onPress={() => void onSubmit(otp)}
              className={`ml-2 flex-1 items-center rounded-card py-3.5 ${
                valid && !loading ? 'bg-brand' : 'bg-brand/30'
              }`}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-bold text-ink-inverse">Verify & start</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Cancel sheet ─────────────────────────────────────────────────────────

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

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable onPress={() => undefined} className="rounded-t-3xl bg-surface px-5 pb-8 pt-5">
          <View className="mx-auto mb-4 h-1 w-12 rounded-full bg-border" />
          <Text className="text-lg font-bold text-ink">Cancel this job?</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Frequent cancellations hurt your trust score and may pause your account. Use this only
            when you genuinely can&apos;t make it.
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
              onPress={() => {
                setReason('');
                onClose();
              }}
              className="mr-2 flex-1 items-center rounded-card border border-border bg-surface py-3.5"
            >
              <Text className="text-sm font-semibold text-ink-muted">Keep job</Text>
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
                <Text className="text-sm font-bold text-ink-inverse">Cancel job</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
