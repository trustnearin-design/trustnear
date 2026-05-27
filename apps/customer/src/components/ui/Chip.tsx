import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

/**
 * Pill-shaped chip — used for filters, tags, and small inline labels.
 *
 *   ✓ Verified   ← `selected` (filled coral)
 *     4.5+        ← `default` (outline)
 *     Premium ↑   ← `tone='butter'` for top-tier emphasis
 */
interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'brand' | 'coral' | 'butter' | 'neutral';
  size?: 'sm' | 'md';
}

export function Chip({ label, selected, onPress, icon, tone = 'brand', size = 'md' }: ChipProps) {
  const palette = {
    brand: { bg: colors.brand.DEFAULT, fg: colors.ink.inverse, outline: colors.brand[700] },
    coral: { bg: colors.accent.DEFAULT, fg: colors.ink.inverse, outline: colors.accent[700] },
    butter: { bg: colors.support.DEFAULT, fg: colors.ink.DEFAULT, outline: colors.support[600] },
    neutral: { bg: colors.surface.DEFAULT, fg: colors.ink.DEFAULT, outline: colors.border.DEFAULT },
  }[tone];

  const px = size === 'sm' ? 10 : 14;
  const py = size === 'sm' ? 4 : 7;
  const fontSize = size === 'sm' ? 11 : 13;

  return (
    <Pressable onPress={onPress} disabled={!onPress}>
      <View
        style={{
          paddingHorizontal: px,
          paddingVertical: py,
          borderRadius: 999,
          backgroundColor: selected ? palette.bg : 'transparent',
          borderWidth: 1,
          borderColor: selected ? palette.bg : palette.outline,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={fontSize}
            color={selected ? palette.fg : palette.outline}
            style={{ marginRight: 4 }}
          />
        ) : null}
        <Text
          style={{
            color: selected ? palette.fg : palette.outline,
            fontSize,
            fontWeight: '700',
            letterSpacing: 0.2,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
