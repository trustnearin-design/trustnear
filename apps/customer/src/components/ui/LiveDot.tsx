import { View, Text } from 'react-native';
import { colors } from '../../theme/colors';

/**
 * Tiny pulsing-dot label for "live in your area" indicators on the home
 * screen — "🟢 12 cleaners available now". For the dot's pulse animation
 * we'll wire Reanimated in D9; for now it's a static disc which already
 * conveys liveness via the green color and small ring.
 */
export function LiveDot({
  label,
  tone = 'success',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'brand';
}) {
  const dotColor =
    tone === 'success'
      ? colors.success
      : tone === 'warning'
        ? colors.warning
        : colors.accent.DEFAULT;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: dotColor,
          marginRight: 8,
          shadowColor: dotColor,
          shadowOpacity: 0.4,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
      <Text className="text-small font-display text-ink">{label}</Text>
    </View>
  );
}
