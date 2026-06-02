import { useMemo, useState } from 'react';
import { View, Text, Pressable, Switch, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CoralButton } from '../../../src/components/ui/CoralButton';
import { EditHeader, EditFooter } from '../../../src/components/edit/EditChrome';
import { useMyProfile } from '../../../src/api/me';
import { useSaveSchedule, type ScheduleSlot } from '../../../src/api/onboarding';
import { colors } from '../../../src/theme/colors';

/**
 * Post-approval editor — Weekly schedule. Prefilled from the pro's current
 * schedule, saved via PATCH /me/onboarding/schedule. Stays approved/live.
 */

const DAYS = [
  { idx: 0, label: 'Sun' },
  { idx: 1, label: 'Mon' },
  { idx: 2, label: 'Tue' },
  { idx: 3, label: 'Wed' },
  { idx: 4, label: 'Thu' },
  { idx: 5, label: 'Fri' },
  { idx: 6, label: 'Sat' },
];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

function defaultsFor(idx: number): ScheduleSlot {
  return { dayOfWeek: idx, startTime: '09:00', endTime: '20:00', isAvailable: idx !== 0 };
}

export default function EditScheduleScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const save = useSaveSchedule();

  // Prefill from profile.schedules; fill any missing day with a default.
  const initial = useMemo<ScheduleSlot[]>(() => {
    const byDay = new Map<number, ScheduleSlot>();
    for (const s of profile.data?.schedules ?? []) {
      byDay.set(s.dayOfWeek, {
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isAvailable: s.isAvailable,
      });
    }
    return DAYS.map((d) => byDay.get(d.idx) ?? defaultsFor(d.idx));
  }, [profile.data]);

  const [slots, setSlots] = useState<ScheduleSlot[] | null>(null);
  const current = slots ?? initial;
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const availableCount = current.filter((s) => s.isAvailable).length;
  const canSave = availableCount >= 1;

  const toggleDay = (idx: number) =>
    setSlots(() =>
      current.map((s) => (s.dayOfWeek === idx ? { ...s, isAvailable: !s.isAvailable } : s)),
    );

  const setTime = (idx: number, field: 'startTime' | 'endTime', value: string) =>
    setSlots(() => current.map((s) => (s.dayOfWeek === idx ? { ...s, [field]: value } : s)));

  const onSave = () => {
    if (!canSave) return;
    const bad = current.find(
      (s) => s.isAvailable && s.endTime !== '00:00' && s.startTime >= s.endTime,
    );
    if (bad) {
      const dayLabel = DAYS[bad.dayOfWeek]?.label ?? `day ${bad.dayOfWeek}`;
      Alert.alert('Invalid hours', `${dayLabel}: start time must be before end time.`);
      return;
    }
    save.mutate(current, {
      onSuccess: () => {
        void profile.refetch();
        router.back();
      },
      onError: (e: Error) => Alert.alert('Save failed', e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <EditHeader title="Edit schedule" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
      >
        <Text style={{ fontSize: 13, color: colors.ink.muted, marginBottom: 16 }}>
          Kab kab available rahenge? Days toggle karein + hours set karein.
        </Text>

        {profile.isPending ? (
          <ActivityIndicatorRow />
        ) : (
          DAYS.map((d) => {
            const slot = current.find((s) => s.dayOfWeek === d.idx);
            if (!slot) return null;
            const open = activeDay === d.idx && slot.isAvailable;
            return (
              <View
                key={d.idx}
                style={{
                  backgroundColor: colors.surface.DEFAULT,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: open ? colors.brand[300] : colors.border.DEFAULT,
                  padding: 14,
                  marginBottom: 10,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '800',
                      color: slot.isAvailable ? colors.ink.DEFAULT : colors.ink.subtle,
                      width: 48,
                    }}
                  >
                    {d.label}
                  </Text>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => slot.isAvailable && setActiveDay(open ? null : d.idx)}
                    disabled={!slot.isAvailable}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '700',
                        color: slot.isAvailable ? colors.brand[700] : colors.ink.subtle,
                      }}
                    >
                      {slot.isAvailable ? `${slot.startTime} – ${slot.endTime}` : 'Off'}
                    </Text>
                  </Pressable>
                  <Switch
                    value={slot.isAvailable}
                    onValueChange={() => toggleDay(d.idx)}
                    trackColor={{ false: colors.border.DEFAULT, true: colors.brand[500] }}
                    thumbColor="#fff"
                  />
                </View>

                {open ? (
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                    <HourPicker
                      label="Start"
                      value={slot.startTime}
                      onChange={(v) => setTime(d.idx, 'startTime', v)}
                    />
                    <HourPicker
                      label="End"
                      value={slot.endTime}
                      onChange={(v) => setTime(d.idx, 'endTime', v)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <EditFooter>
        <CoralButton
          label={canSave ? 'Save changes' : 'Pick at least 1 day'}
          onPress={onSave}
          disabled={!canSave}
          loading={save.isPending}
        />
      </EditFooter>
    </View>
  );
}

function ActivityIndicatorRow() {
  return (
    <View style={{ alignItems: 'center', marginTop: 32 }}>
      <Ionicons name="time-outline" size={24} color={colors.ink.subtle} />
    </View>
  );
}

function HourPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const currentHour = Number(value.split(':')[0] ?? '9');
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.ink.subtle, marginBottom: 6 }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {HOURS.map((h) => {
          const selected = h === currentHour;
          return (
            <Pressable
              key={h}
              onPress={() => onChange(`${String(h).padStart(2, '0')}:00`)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 8,
                backgroundColor: selected ? colors.brand[700] : colors.surface.muted,
                minWidth: 36,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  color: selected ? '#fff' : colors.ink.DEFAULT,
                }}
              >
                {String(h).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
