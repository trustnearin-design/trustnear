import { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProDetail } from '../../../src/api/discovery';
import { useCreateBooking } from '../../../src/api/bookings';
import {
  FALLBACK_COORDS,
  getCurrentCoords,
  reverseGeocode,
  type ResolvedAddress,
} from '../../../src/lib/location';
import { ApiCallError } from '../../../src/api/client';
import { saveBookingOtp } from '../../../src/lib/bookingOtp';
import { formatRupees, priceUnitLabel } from '../../../src/lib/format';
import { colors } from '../../../src/theme/colors';
import { Avatar } from '../../../src/components/Avatar';

interface TimeSlot {
  key: string;
  label: string;
  iso: () => string;
}

function buildTimeSlots(): TimeSlot[] {
  return [
    {
      key: '1h',
      label: 'In 1 hour',
      iso: () => new Date(Date.now() + 60 * 60_000).toISOString(),
    },
    {
      key: '2h',
      label: 'In 2 hours',
      iso: () => new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
    },
    {
      key: 'tmrw10',
      label: 'Tomorrow 10 AM',
      iso: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return d.toISOString();
      },
    },
    {
      key: 'tmrw5',
      label: 'Tomorrow 5 PM',
      iso: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(17, 0, 0, 0);
        return d.toISOString();
      },
    },
  ];
}

const SLOTS = buildTimeSlots();
const DURATION_PRESETS = [60, 90, 120, 180] as const;

export default function BookExpertScreen() {
  const router = useRouter();
  const { expertId } = useLocalSearchParams<{ expertId: string }>();
  const expert = useProDetail(expertId);
  const createBooking = useCreateBooking();

  const offerings = expert.data?.serviceOfferings ?? [];
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [slotKey, setSlotKey] = useState<string>(SLOTS[0]?.key ?? '1h');
  const [duration, setDuration] = useState<number>(60);
  const [flatNo, setFlatNo] = useState('');
  const [landmark, setLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [resolved, setResolved] = useState<ResolvedAddress | null>(null);
  const [locating, setLocating] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId && offerings[0]) setCategoryId(offerings[0].category.id);
  }, [offerings, categoryId]);

  const resolveLocation = async () => {
    setLocating(true);
    const c = await getCurrentCoords().catch(() => null);
    const finalCoords = c ?? FALLBACK_COORDS;
    setCoords(finalCoords);
    setUsingFallback(!c);
    const addr = await reverseGeocode(finalCoords);
    setResolved(addr);
    setLocating(false);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await resolveLocation();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedOffering = useMemo(
    () => offerings.find((o) => o.category.id === categoryId) ?? null,
    [offerings, categoryId],
  );

  const priceEstimate = useMemo(() => {
    if (!selectedOffering) return null;
    const perUnit = selectedOffering.customPrice ?? selectedOffering.category.basePrice;
    const unit = selectedOffering.category.priceUnit;
    if (unit === 'per_hour') return Math.round((perUnit * duration) / 60);
    return perUnit;
  }, [selectedOffering, duration]);

  const slot = SLOTS.find((s) => s.key === slotKey);
  const composedAddress = useMemo(() => {
    const parts = [
      flatNo.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : '',
      resolved?.area ?? '',
      resolved?.city ?? '',
      resolved?.pincode ?? '',
    ].filter(Boolean);
    return parts.join(', ');
  }, [flatNo, landmark, resolved]);

  const canSubmit =
    !!categoryId &&
    !!slot &&
    flatNo.trim().length >= 2 &&
    composedAddress.length >= 5 &&
    !!coords &&
    !createBooking.isPending;

  const onSubmit = async () => {
    if (!categoryId || !slot || !coords || !expertId) return;
    setSubmitError(null);
    try {
      const res = await createBooking.mutateAsync({
        categoryId,
        scheduledAt: slot.iso(),
        durationMinutes: duration,
        addressLine: composedAddress,
        addressLat: coords.lat,
        addressLng: coords.lng,
        addressCity: resolved?.city ?? 'Jaipur',
        ...(resolved?.area ? { addressArea: resolved.area } : {}),
        preferredProId: expertId,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      await saveBookingOtp(res.bookingId, res.otp);
      router.replace({
        pathname: '/(app)/booking/[id]',
        params: { id: res.bookingId, justBooked: '1' },
      });
    } catch (e) {
      if (e instanceof ApiCallError) {
        setSubmitError(e.message);
      } else {
        setSubmitError('Something went wrong. Try again.');
      }
    }
  };

  if (expert.isPending) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Stack.Screen options={{ title: 'Book expert' }} />
        <ActivityIndicator color={colors.brand.DEFAULT} />
      </SafeAreaView>
    );
  }
  if (expert.isError || !expert.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface px-6">
        <Stack.Screen options={{ title: 'Book expert' }} />
        <Text className="text-center text-sm text-danger">Couldn't load expert. Try again.</Text>
        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="text-sm font-semibold text-brand">Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const pro = expert.data;

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <Stack.Screen options={{ title: 'Book expert' }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-32"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center bg-brand p-4">
            <Avatar
              fullName={pro.user.fullName}
              photoUrl={pro.user.profilePhoto ?? undefined}
              size={48}
              borderColor="#FFFFFF"
            />
            <View className="ml-3 flex-1">
              <Text className="text-sm text-ink-inverse/80">Booking with</Text>
              <Text className="text-base font-bold text-ink-inverse">{pro.user.fullName}</Text>
              {pro.professionalTitle ? (
                <Text className="text-xs text-ink-inverse/80">{pro.professionalTitle}</Text>
              ) : null}
            </View>
          </View>

          {offerings.length === 0 ? (
            <View className="m-5 rounded-card border border-warning/30 bg-warning/5 p-4">
              <Text className="text-sm text-ink-muted">
                This expert hasn't listed any services yet.
              </Text>
            </View>
          ) : (
            <>
              <SectionTitle>Service</SectionTitle>
              <View className="px-5">
                {offerings.map((o) => {
                  const selected = o.category.id === categoryId;
                  return (
                    <Pressable
                      key={o.category.id}
                      onPress={() => setCategoryId(o.category.id)}
                      className={`mb-2 flex-row items-center rounded-card border p-3 ${
                        selected ? 'border-brand bg-brand-100' : 'border-border bg-surface'
                      }`}
                    >
                      <View
                        className={`mr-3 h-5 w-5 items-center justify-center rounded-full border-2 ${
                          selected ? 'border-brand bg-brand' : 'border-border'
                        }`}
                      >
                        {selected ? <View className="h-2 w-2 rounded-full bg-surface" /> : null}
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-ink">{o.category.name}</Text>
                        <Text className="mt-0.5 text-xs text-ink-muted">
                          {o.experienceYears}y experience
                        </Text>
                      </View>
                      <Text className="text-sm font-bold text-brand">
                        {formatRupees(o.customPrice ?? o.category.basePrice)}
                        {priceUnitLabel(o.category.priceUnit)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <SectionTitle>When?</SectionTitle>
              <View className="flex-row flex-wrap px-3">
                {SLOTS.map((s) => {
                  const selected = s.key === slotKey;
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() => setSlotKey(s.key)}
                      className={`m-1.5 rounded-pill border px-4 py-2 ${
                        selected ? 'border-brand bg-brand' : 'border-border bg-surface'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${selected ? 'text-ink-inverse' : 'text-ink'}`}
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <SectionTitle>How long?</SectionTitle>
              <View className="flex-row flex-wrap px-3">
                {DURATION_PRESETS.map((d) => {
                  const selected = d === duration;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDuration(d)}
                      className={`m-1.5 rounded-pill border px-4 py-2 ${
                        selected ? 'border-brand bg-brand' : 'border-border bg-surface'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${selected ? 'text-ink-inverse' : 'text-ink'}`}
                      >
                        {d < 60 ? `${d} min` : `${d / 60}h`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <SectionTitle>Where?</SectionTitle>
              <View className="px-5">
                <View className="flex-row items-start rounded-card border border-border bg-surface-muted p-3">
                  <Ionicons
                    name="location"
                    size={18}
                    color={colors.brand.DEFAULT}
                    style={{ marginTop: 2 }}
                  />
                  <View className="ml-2 flex-1">
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                      Detected location
                    </Text>
                    {locating ? (
                      <View className="mt-1 flex-row items-center">
                        <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
                        <Text className="ml-2 text-xs text-ink-muted">Locating…</Text>
                      </View>
                    ) : (
                      <Text className="mt-0.5 text-sm font-medium text-ink">
                        {resolved?.formatted ??
                          (usingFallback ? 'Jaipur (approximate)' : 'Address unavailable')}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={() => void resolveLocation()}
                    disabled={locating}
                    className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-surface"
                  >
                    <Ionicons name="refresh" size={16} color={colors.brand.DEFAULT} />
                  </Pressable>
                </View>

                {usingFallback ? (
                  <View className="mt-2 flex-row items-start rounded-card border border-warning/30 bg-warning/5 p-2.5">
                    <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                    <Text className="ml-1.5 flex-1 text-[11px] text-ink-muted">
                      GPS unavailable. Enable location in Settings for better accuracy.
                    </Text>
                  </View>
                ) : null}

                <TextInput
                  value={flatNo}
                  onChangeText={setFlatNo}
                  placeholder="Flat / house number (e.g. B-204)"
                  placeholderTextColor="#94A3B8"
                  className="mt-3 rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-ink"
                />
                <TextInput
                  value={landmark}
                  onChangeText={setLandmark}
                  placeholder="Landmark (optional, e.g. Opposite SBI ATM)"
                  placeholderTextColor="#94A3B8"
                  className="mt-2 rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-ink"
                />
              </View>

              <SectionTitle>Notes (optional)</SectionTitle>
              <View className="px-5">
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Anything the expert should know?"
                  placeholderTextColor="#94A3B8"
                  multiline
                  className="min-h-[60px] rounded-card border border-border bg-surface-muted px-4 py-3 text-sm text-ink"
                />
              </View>

              {priceEstimate !== null ? (
                <View className="mx-5 mt-5 rounded-card border border-border bg-surface-muted p-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-ink-muted">Estimated price</Text>
                    <Text className="text-lg font-bold text-brand">
                      {formatRupees(priceEstimate)}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[11px] text-ink-subtle">
                    Final amount confirmed after service completion.
                  </Text>
                </View>
              ) : null}

              {submitError ? (
                <Text className="mx-5 mt-3 text-sm text-danger">{submitError}</Text>
              ) : null}
            </>
          )}
        </ScrollView>

        <View
          className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pb-6 pt-3"
          style={{ elevation: 8 }}
        >
          <Pressable
            disabled={!canSubmit}
            onPress={() => {
              if (!canSubmit) {
                Alert.alert(
                  'Add flat number',
                  'Please enter your flat / house number to continue.',
                );
                return;
              }
              void onSubmit();
            }}
            className={`flex-row items-center justify-center rounded-card py-4 ${
              canSubmit ? 'bg-brand' : 'bg-brand/40'
            }`}
          >
            {createBooking.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text className="ml-2 text-base font-bold text-ink-inverse">Confirm booking</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text className="mb-2 mt-5 px-5 text-xs font-bold uppercase tracking-wider text-ink-subtle">
      {children}
    </Text>
  );
}
