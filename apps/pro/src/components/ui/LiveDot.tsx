import { View, Text } from 'react-native';
import { colors } from '../../theme/colors';

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
