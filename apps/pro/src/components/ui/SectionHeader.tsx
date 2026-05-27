import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export function SectionHeader({
  eyebrow,
  title,
  ctaLabel,
  onCtaPress,
  className,
}: {
  eyebrow?: string;
  title: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
  className?: string;
}) {
  return (
    <View className={`flex-row items-end justify-between ${className ?? ''}`}>
      <View className="flex-1 pr-3">
        {eyebrow ? (
          <Text className="text-overline uppercase" style={{ color: colors.accent[600] }}>
            {eyebrow}
          </Text>
        ) : null}
        <Text
          className={`font-display text-h2 text-ink ${eyebrow ? 'mt-1' : ''}`}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
      {ctaLabel && onCtaPress ? (
        <Pressable onPress={onCtaPress} hitSlop={10} className="flex-row items-center pb-1">
          <Text className="text-small font-display" style={{ color: colors.brand[700] }}>
            {ctaLabel}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={14}
            color={colors.brand[700]}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
