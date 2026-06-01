import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CoralButton } from '../../../src/components/ui/CoralButton';
import { EditHeader, EditFooter } from '../../../src/components/edit/EditChrome';
import { useMyProfile } from '../../../src/api/me';
import {
  useLeafCategories,
  useSaveServices,
  type ServiceOfferingInput,
} from '../../../src/api/onboarding';
import { colors } from '../../../src/theme/colors';

/**
 * Post-approval editor — Services & pricing. Prefilled from the pro's
 * current offerings. Reuses the same save endpoint as onboarding
 * (PATCH /me/onboarding/services); an approved pro stays approved/live
 * after saving (no re-review). Mirrors the onboarding services UI.
 */

interface SelectedService {
  categoryId: string;
  name: string;
  basePrice: number;
  priceUnit: string;
  customPriceRupees: string;
  experienceYears: number;
}

export default function EditServicesScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const cats = useLeafCategories();
  const save = useSaveServices();

  // Prefill once from the current profile offerings.
  const initial = useMemo<Record<string, SelectedService>>(() => {
    const map: Record<string, SelectedService> = {};
    for (const o of profile.data?.serviceOfferings ?? []) {
      map[o.category.id] = {
        categoryId: o.category.id,
        name: o.category.name,
        basePrice: o.category.basePrice,
        priceUnit: o.category.priceUnit,
        customPriceRupees: String(Math.round((o.customPrice ?? o.category.basePrice) / 100)),
        experienceYears: o.experienceYears,
      };
    }
    return map;
  }, [profile.data]);

  const [selected, setSelected] = useState<Record<string, SelectedService> | null>(null);
  const current = selected ?? initial;
  const selectedCount = Object.keys(current).length;
  const canSave = selectedCount >= 1 && selectedCount <= 8;

  interface CategoryLike {
    id: string;
    name: string;
    basePrice: number;
    priceUnit: string;
  }

  const toggle = (c: CategoryLike) => {
    setSelected(() => {
      const next = { ...current };
      if (next[c.id]) {
        delete next[c.id];
      } else if (Object.keys(next).length < 8) {
        next[c.id] = {
          categoryId: c.id,
          name: c.name,
          basePrice: c.basePrice,
          priceUnit: c.priceUnit,
          customPriceRupees: String(Math.round(c.basePrice / 100)),
          experienceYears: 0,
        };
      }
      return next;
    });
  };

  const updatePrice = (id: string, rupees: string) =>
    setSelected(() => {
      const ex = current[id];
      if (!ex) return current;
      return { ...current, [id]: { ...ex, customPriceRupees: rupees.replace(/[^0-9]/g, '') } };
    });

  const updateExperience = (id: string, years: number) =>
    setSelected(() => {
      const ex = current[id];
      if (!ex) return current;
      return { ...current, [id]: { ...ex, experienceYears: Math.max(0, Math.min(60, years)) } };
    });

  const onSave = () => {
    if (!canSave) return;
    const services: ServiceOfferingInput[] = Object.values(current).map((s) => ({
      categoryId: s.categoryId,
      customPrice: s.customPriceRupees ? Number(s.customPriceRupees) * 100 : null,
      experienceYears: s.experienceYears,
    }));
    save.mutate(services, {
      onSuccess: () => {
        void profile.refetch();
        router.back();
      },
      onError: (e: Error) => Alert.alert('Save failed', e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <EditHeader title="Edit services" onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 140 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, color: colors.ink.muted, marginBottom: 16 }}>
          {selectedCount}/8 services selected. Price aur experience update kar sakte hain.
        </Text>

        {cats.isLoading || profile.isPending ? (
          <ActivityIndicator color={colors.brand[700]} style={{ marginTop: 32 }} />
        ) : (
          <>
            {selectedCount > 0 ? (
              <View style={{ marginBottom: 24 }}>
                <Text style={labelStyle}>YOUR SERVICES</Text>
                {Object.values(current).map((s) => (
                  <View
                    key={s.categoryId}
                    style={{
                      backgroundColor: colors.surface.DEFAULT,
                      borderRadius: 16,
                      borderWidth: 1.5,
                      borderColor: colors.brand[200],
                      padding: 14,
                      marginBottom: 10,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '800',
                          color: colors.ink.DEFAULT,
                          flex: 1,
                        }}
                      >
                        {s.name}
                      </Text>
                      <Pressable
                        onPress={() =>
                          toggle({
                            id: s.categoryId,
                            name: s.name,
                            basePrice: s.basePrice,
                            priceUnit: s.priceUnit,
                          })
                        }
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.ink.subtle} />
                      </Pressable>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={fieldLabelStyle}>Price ({priceUnitLabel(s.priceUnit)})</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <Text
                            style={{ fontSize: 14, color: colors.ink.muted, fontWeight: '700' }}
                          >
                            ₹
                          </Text>
                          <TextInput
                            value={s.customPriceRupees}
                            onChangeText={(t) => updatePrice(s.categoryId, t)}
                            keyboardType="number-pad"
                            style={{
                              flex: 1,
                              backgroundColor: colors.surface.muted,
                              borderRadius: 10,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              fontSize: 14,
                              fontWeight: '600',
                            }}
                            maxLength={6}
                          />
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={fieldLabelStyle}>Experience (years)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Pressable
                            onPress={() => updateExperience(s.categoryId, s.experienceYears - 1)}
                            style={stepperStyle}
                          >
                            <Ionicons name="remove" size={14} color={colors.ink.DEFAULT} />
                          </Pressable>
                          <Text
                            style={{
                              fontSize: 14,
                              fontWeight: '700',
                              minWidth: 24,
                              textAlign: 'center',
                            }}
                          >
                            {s.experienceYears}
                          </Text>
                          <Pressable
                            onPress={() => updateExperience(s.categoryId, s.experienceYears + 1)}
                            style={stepperStyle}
                          >
                            <Ionicons name="add" size={14} color={colors.ink.DEFAULT} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={labelStyle}>BROWSE CATEGORIES</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(cats.data?.categories ?? []).map((c) => {
                const isSelected = !!current[c.id];
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => toggle(c)}
                    disabled={!isSelected && selectedCount >= 8}
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      borderWidth: 1.5,
                      borderColor: isSelected ? colors.brand[700] : colors.border.DEFAULT,
                      backgroundColor: isSelected ? colors.brand[700] : colors.surface.DEFAULT,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      opacity: !isSelected && selectedCount >= 8 ? 0.4 : 1,
                    }}
                  >
                    {isSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isSelected ? '#fff' : colors.ink.DEFAULT,
                      }}
                    >
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <EditFooter>
        <CoralButton
          label={canSave ? 'Save changes' : 'Pick at least 1 service'}
          onPress={onSave}
          disabled={!canSave}
          loading={save.isPending}
        />
      </EditFooter>
    </View>
  );
}

const labelStyle = {
  fontSize: 13,
  fontWeight: '700' as const,
  color: colors.ink.muted,
  marginBottom: 10,
  letterSpacing: 0.4,
};
const fieldLabelStyle = {
  fontSize: 11,
  fontWeight: '700' as const,
  color: colors.ink.subtle,
  marginBottom: 4,
};
const stepperStyle = { padding: 6, backgroundColor: colors.surface.muted, borderRadius: 8 };

function priceUnitLabel(unit: string): string {
  switch (unit) {
    case 'per_hour':
      return 'per hour';
    case 'per_visit':
      return 'per visit';
    case 'per_day':
      return 'per day';
    case 'fixed':
      return 'fixed';
    default:
      return unit;
  }
}
