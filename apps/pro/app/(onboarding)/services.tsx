import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import {
  useLeafCategories,
  useSaveServices,
  type ServiceOfferingInput,
} from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 3 — Services + pricing. Pro picks 1–8 service categories they
 * offer + (optionally) custom prices in rupees. Custom price defaults
 * to the category's basePrice — pro can override.
 */

interface SelectedService {
  categoryId: string;
  name: string;
  basePrice: number; // paise
  priceUnit: string;
  customPriceRupees: string; // user-facing string for the input
  experienceYears: number;
}

export default function ServicesScreen() {
  const router = useRouter();
  const cats = useLeafCategories();
  const save = useSaveServices();
  const [selected, setSelected] = useState<Record<string, SelectedService>>({});

  const selectedCount = Object.keys(selected).length;
  const canContinue = selectedCount >= 1 && selectedCount <= 8;

  interface CategoryLike {
    id: string;
    name: string;
    basePrice: number;
    priceUnit: string;
  }

  const toggle = (c: CategoryLike) => {
    setSelected((prev) => {
      const next = { ...prev };
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

  const updatePrice = (id: string, rupees: string) => {
    setSelected((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: { ...existing, customPriceRupees: rupees.replace(/[^0-9]/g, '') },
      };
    });
  };

  const updateExperience = (id: string, years: number) => {
    setSelected((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: { ...existing, experienceYears: Math.max(0, Math.min(60, years)) },
      };
    });
  };

  const onContinue = () => {
    if (!canContinue) return;
    const services: ServiceOfferingInput[] = Object.values(selected).map((s) => ({
      categoryId: s.categoryId,
      customPrice: s.customPriceRupees ? Number(s.customPriceRupees) * 100 : null,
      experienceYears: s.experienceYears,
    }));
    save.mutate(services, {
      onSuccess: () => router.push('/(onboarding)/area' as never),
      onError: (e: Error) => Alert.alert('Save failed', e.message),
    });
  };

  return (
    <WizardLayout
      stepIndex={3}
      stepTotal={8}
      title="Services & pricing"
      subtitle={`Aap kya services dete hain? ${selectedCount}/8 selected.`}
      mascotVariant="services"
      ctaLabel={selectedCount === 0 ? 'Pick at least 1 service' : 'Continue'}
      onCta={onContinue}
      ctaDisabled={!canContinue}
      ctaLoading={save.isPending}
    >
      {cats.isLoading ? (
        <ActivityIndicator color={colors.brand[700]} style={{ marginTop: 32 }} />
      ) : cats.error ? (
        <Text style={{ color: colors.danger }}>Couldn't load categories. Try again.</Text>
      ) : (
        <>
          {/* Selected services with price editors */}
          {selectedCount > 0 ? (
            <View style={{ marginBottom: 24 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: colors.ink.muted,
                  marginBottom: 10,
                  letterSpacing: 0.4,
                }}
              >
                YOUR SERVICES
              </Text>
              {Object.values(selected).map((s) => (
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
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: colors.ink.subtle,
                          marginBottom: 4,
                        }}
                      >
                        Price ({priceUnitLabel(s.priceUnit)})
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 14, color: colors.ink.muted, fontWeight: '700' }}>
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
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: colors.ink.subtle,
                          marginBottom: 4,
                        }}
                      >
                        Experience (years)
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable
                          onPress={() => updateExperience(s.categoryId, s.experienceYears - 1)}
                          style={{
                            padding: 6,
                            backgroundColor: colors.surface.muted,
                            borderRadius: 8,
                          }}
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
                          style={{
                            padding: 6,
                            backgroundColor: colors.surface.muted,
                            borderRadius: 8,
                          }}
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

          {/* Category picker grid */}
          <Text
            style={{
              fontSize: 13,
              fontWeight: '700',
              color: colors.ink.muted,
              marginBottom: 10,
              letterSpacing: 0.4,
            }}
          >
            BROWSE CATEGORIES
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(cats.data?.categories ?? []).map((c) => {
              const isSelected = !!selected[c.id];
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
    </WizardLayout>
  );
}

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
