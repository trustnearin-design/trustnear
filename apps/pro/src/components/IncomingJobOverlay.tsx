import { useMemo } from 'react';
import { Modal, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors } from '../theme/colors';
import { formatRupees } from '../lib/format';
import { useIncomingJobAlerts } from '../api/incomingJobs';

/**
 * Zomato/Swiggy-style full-screen incoming-job overlay. Mounted once at
 * the root layout — pops over any screen whenever `job:new-match` fires.
 *
 * The countdown ring uses an SVG circle stroke whose dashoffset scales
 * with `secondsLeft / RESPONSE_WINDOW`. Re-renders every second along
 * with the surrounding number so the depletion is visually obvious.
 *
 * Accept navigates the pro into the new job/[id] screen on success;
 * decline / timeout just dismiss (backend re-offers to the next pro).
 */

const RESPONSE_WINDOW_SECONDS = 60;
const RING_SIZE = 220;
const RING_STROKE = 12;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export function IncomingJobOverlay() {
  const router = useRouter();
  const { current, secondsLeft, accept, decline, acceptPending, declinePending, acceptError } =
    useIncomingJobAlerts();
  const insets = useSafeAreaInsets();
  const visible = !!current;

  // Stroke dash offset — at full window the ring is empty (offset = 0,
  // so the whole circle is drawn), as it depletes the offset grows so
  // the visible arc shrinks.
  const fraction = Math.max(0, Math.min(1, secondsLeft / RESPONSE_WINDOW_SECONDS));
  const dashOffset = useMemo(() => RING_CIRC * (1 - fraction), [fraction]);

  const ringColor =
    secondsLeft <= 10 ? colors.danger : secondsLeft <= 25 ? colors.warning : colors.accent.DEFAULT;

  const scheduledLabel = current ? formatScheduledShort(current.scheduledAt) : '';
  const distanceLabel =
    current?.distanceKm !== null && current?.distanceKm !== undefined
      ? `${current.distanceKm.toFixed(1)} km away`
      : null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={decline}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.brand[900],
          paddingTop: insets.top + 24,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
      >
        {/* Gold corner glow — same accent the rest of the app uses */}
        <View
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 240,
            height: 240,
            borderRadius: 120,
            backgroundColor: 'rgba(212,162,76,0.22)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: -80,
            left: -80,
            width: 260,
            height: 260,
            borderRadius: 130,
            backgroundColor: 'rgba(212,162,76,0.12)',
          }}
        />

        {/* Header */}
        <View style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              letterSpacing: 3,
              color: colors.accent[200],
            }}
          >
            INCOMING JOB
          </Text>
          {current ? (
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              #{current.bookingNumber}
            </Text>
          ) : null}
        </View>

        {/* Countdown ring + customer avatar inside */}
        {current ? (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <View style={{ width: RING_SIZE, height: RING_SIZE }}>
              <Svg width={RING_SIZE} height={RING_SIZE}>
                {/* Background track */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                />
                {/* Depleting progress arc */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RING_RADIUS}
                  stroke={ringColor}
                  strokeWidth={RING_STROKE}
                  fill="transparent"
                  strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  // Rotate -90deg so the start is at 12 o'clock
                  transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
              </Svg>

              {/* Avatar centered inside the ring */}
              <View
                style={{
                  position: 'absolute',
                  top: RING_STROKE * 2,
                  left: RING_STROKE * 2,
                  right: RING_STROKE * 2,
                  bottom: RING_STROKE * 2,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Avatar
                  fullName={current.customer.fullName}
                  photoUrl={current.customer.profilePhoto ?? undefined}
                  size={140}
                  borderColor="rgba(255,255,255,0.18)"
                />
              </View>

              {/* Seconds bubble pinned to the ring's bottom */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -8,
                  alignSelf: 'center',
                  left: 0,
                  right: 0,
                  alignItems: 'center',
                }}
              >
                <View
                  style={{
                    backgroundColor: ringColor,
                    paddingHorizontal: 14,
                    paddingVertical: 5,
                    borderRadius: 999,
                    minWidth: 64,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>
                    {secondsLeft}s
                  </Text>
                </View>
              </View>
            </View>

            {/* Customer name */}
            <Text
              style={{
                marginTop: 28,
                color: '#fff',
                fontSize: 24,
                fontWeight: '700',
              }}
            >
              {current.customer.fullName}
            </Text>
            <Text
              style={{
                marginTop: 4,
                color: colors.accent[200],
                fontSize: 13,
                fontWeight: '700',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {current.category.name}
            </Text>
          </View>
        ) : null}

        {/* Detail strip */}
        {current ? (
          <View
            style={{
              marginTop: 22,
              marginHorizontal: 24,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 18,
              padding: 16,
            }}
          >
            <DetailRow icon="time-outline" label="Scheduled" value={scheduledLabel} />
            <View
              style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }}
            />
            <DetailRow
              icon="location-outline"
              label="Address"
              value={current.addressArea ?? current.addressLine}
              {...(distanceLabel ? { extra: distanceLabel } : {})}
            />
            <View
              style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 10 }}
            />
            <DetailRow
              icon="cash-outline"
              label="Your payout"
              value={formatRupees(current.proPayout)}
              valueAccent
            />
          </View>
        ) : null}

        {acceptError ? (
          <View style={{ marginTop: 18, paddingHorizontal: 24 }}>
            <Text
              style={{
                color: colors.danger,
                backgroundColor: '#fff',
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                fontSize: 13,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {acceptError}
            </Text>
          </View>
        ) : null}

        {/* Actions pinned at the bottom */}
        <View style={{ marginTop: 'auto', paddingHorizontal: 24 }}>
          <Pressable
            disabled={acceptPending || declinePending}
            onPress={() => {
              if (!current) return;
              const id = current.bookingId;
              // Navigate only on a confirmed accept (passed as the success
              // callback). A failed accept now surfaces the error in-place
              // instead of dumping the pro onto an error job screen.
              accept(() => router.push({ pathname: '/(app)/job/[id]', params: { id } }));
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.success,
              borderRadius: 18,
              paddingVertical: 18,
              shadowColor: colors.success,
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            {acceptPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={{ marginLeft: 8, color: '#fff', fontSize: 17, fontWeight: '800' }}>
                  Accept job
                </Text>
              </>
            )}
          </Pressable>

          <Pressable
            disabled={acceptPending || declinePending}
            onPress={decline}
            style={{
              marginTop: 14,
              alignItems: 'center',
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600' }}>
              {declinePending ? 'Declining…' : 'Decline'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function DetailRow({
  icon,
  label,
  value,
  extra,
  valueAccent,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  extra?: string;
  valueAccent?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons name={icon} size={16} color={colors.accent[200]} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        <Text
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: 10,
            fontWeight: '700',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            color: valueAccent ? colors.accent.DEFAULT : '#fff',
            fontSize: valueAccent ? 18 : 14,
            fontWeight: valueAccent ? '800' : '600',
            marginTop: 1,
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {extra ? (
        <Text style={{ color: colors.accent[200], fontSize: 12, fontWeight: '700' }}>{extra}</Text>
      ) : null}
    </View>
  );
}

function formatScheduledShort(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Today, ${time}`;
  const tmrw = new Date(now);
  tmrw.setDate(tmrw.getDate() + 1);
  if (d.toDateString() === tmrw.toDateString()) return `Tomorrow, ${time}`;
  return (
    d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }) + ` · ${time}`
  );
}
