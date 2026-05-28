import { useState } from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useSaveSchedule, type ScheduleSlot } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 5 — Weekly schedule. Pro toggles which days they work + sets
 * start/end hours per available day. The matcher uses these to filter
 * out bookings outside working hours.
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

const DEFAULT_SLOTS: ScheduleSlot[] = DAYS.map((d) => ({
  dayOfWeek: d.idx,
  startTime: '09:00',
  endTime: '20:00',
  // Weekend (Sun) default off; weekdays + Sat default on
  isAvailable: d.idx !== 0,
}));

export default function ScheduleScreen() {
  const router = useRouter();
  const save = useSaveSchedule();
  const [slots, setSlots] = useState<ScheduleSlot[]>(DEFAULT_SLOTS);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  const availableCount = slots.filter((s) => s.isAvailable).length;
  const canContinue = availableCount >= 1;

  const toggleDay = (idx: number) => {
    setSlots((prev) =>
      prev.map((s) => (s.dayOfWeek === idx ? { ...s, isAvailable: !s.isAvailable } : s)),
    );
  };

  const setTime = (idx: number, field: 'startTime' | 'endTime', value: string) => {
    setSlots((prev) => prev.map((s) => (s.dayOfWeek === idx ? { ...s, [field]: value } : s)));
  };

  const onContinue = () => {
    if (!canContinue) return;
    // Validate start < end on every available day
    const bad = slots.find((s) => s.isAvailable && s.startTime >= s.endTime);
    if (bad) {
      const dayLabel = DAYS[bad.dayOfWeek]?.label ?? `day ${bad.dayOfWeek}`;
      Alert.alert('Invalid hours', `Day ${dayLabel}: start time must be before end time.`);
      return;
    }
    save.mutate(slots, {
      onSuccess: () => router.push('/(onboarding)/aadhaar' as never),
      onError: (e: Error) => Alert.alert('Save failed', e.message),
    });
  };

  return (
    <WizardLayout
      stepIndex={5}
      stepTotal={8}
      title="Weekly schedule"
      subtitle="Kab kab available rahenge? Days toggle karein + hours set karein."
      mascotVariant="schedule"
      ctaLabel={availableCount === 0 ? 'Pick at least 1 day' : 'Continue'}
      onCta={onContinue}
      ctaDisabled={!canContinue}
      ctaLoading={save.isPending}
    >
      {DAYS.map((d) => {
        const slot = slots.find((s) => s.dayOfWeek === d.idx);
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
      })}

      <View
        style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: colors.support[50],
          borderRadius: 12,
          flexDirection: 'row',
          gap: 8,
        }}
      >
        <Ionicons name="information-circle" size={18} color={colors.support[700]} />
        <Text style={{ flex: 1, fontSize: 12, color: colors.support[700], lineHeight: 18 }}>
          Aap baad mein Profile tab se ye schedule update kar sakte hain.
        </Text>
      </View>
    </WizardLayout>
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
