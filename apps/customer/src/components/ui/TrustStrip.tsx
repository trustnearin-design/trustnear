import { ScrollView, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

const TRUST = [
  { icon: 'finger-print' as const, label: 'Aadhaar verified' },
  { icon: 'shield-checkmark' as const, label: 'Police-checked' },
  { icon: 'ribbon' as const, label: 'Trained pros' },
  { icon: 'time' as const, label: 'On-time or free' },
  { icon: 'card' as const, label: 'Pay after service' },
];

/**
 * Premium trust-chip row — our analog of Myntra's "Brand Partners / bank
 * offer" strip. Reinforces the platform's core promise right under the hero.
 */
export function TrustStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
    >
      {TRUST.map((t) => (
        <View
          key={t.label}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: colors.surface.DEFAULT,
            borderWidth: 1,
            borderColor: colors.border.DEFAULT,
          }}
        >
          <Ionicons name={t.icon} size={14} color={colors.brand[600]} />
          <Text
            style={{ marginLeft: 6, fontSize: 12, fontWeight: '700', color: colors.ink.DEFAULT }}
          >
            {t.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}
