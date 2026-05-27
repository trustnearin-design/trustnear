import { View, Text, Pressable, ImageSourcePropType, Image } from 'react-native';
import { Gradient } from './Gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

/**
 * Rich category tile — used on customer home for the 4 parent categories.
 * Each tile is a tall card with:
 *   - Eyebrow (small uppercase context)
 *   - Display title
 *   - 2-line description
 *   - Price strip ("from ₹299")
 *   - Right-edge illustration (or icon fallback)
 *   - Soft gradient bg (pearl → tint)
 *
 * Variant `tone` rotates the background tint so the 4 tiles in a 2×2 grid
 * have distinct personalities while staying within the palette.
 */
interface CategoryTileProps {
  eyebrow?: string;
  title: string;
  description: string;
  startingPrice?: string;
  illustration?: ImageSourcePropType;
  /** Fallback icon when no illustration provided. */
  fallbackIcon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: 'plum' | 'coral' | 'butter' | 'mint';
  onPress?: () => void;
}

export function CategoryTile({
  eyebrow,
  title,
  description,
  startingPrice,
  illustration,
  fallbackIcon = 'home-outline',
  tone = 'plum',
  onPress,
}: CategoryTileProps) {
  const palettes = {
    plum: {
      bg: [colors.brand[50], colors.brand[100]] as readonly [string, string],
      iconBg: colors.brand[200],
      iconFg: colors.brand[800],
      accentBar: colors.brand[600],
    },
    coral: {
      bg: [colors.accent[50], colors.accent[100]] as readonly [string, string],
      iconBg: colors.accent[200],
      iconFg: colors.accent[700],
      accentBar: colors.accent.DEFAULT,
    },
    butter: {
      bg: [colors.support[50], colors.support[100]] as readonly [string, string],
      iconBg: colors.support[200],
      iconFg: colors.support[700],
      accentBar: colors.support[600],
    },
    mint: {
      bg: ['#EAF7F0', '#D8EFE3'] as readonly [string, string],
      iconBg: '#BDE3CA',
      iconFg: '#1F6E45',
      accentBar: colors.success,
    },
  };
  const palette = palettes[tone];

  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Gradient
        colors={palette.bg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 22,
          padding: 16,
          minHeight: 168,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top-left accent bar */}
        <View
          style={{
            position: 'absolute',
            top: 16,
            left: 0,
            width: 4,
            height: 28,
            borderTopRightRadius: 2,
            borderBottomRightRadius: 2,
            backgroundColor: palette.accentBar,
          }}
        />

        {/* Illustration / icon — right side */}
        <View style={{ position: 'absolute', right: -4, top: -2 }}>
          {illustration ? (
            <Image source={illustration} style={{ width: 80, height: 80 }} resizeMode="contain" />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                marginTop: 12,
                marginRight: 14,
                borderRadius: 18,
                backgroundColor: palette.iconBg,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={fallbackIcon} size={28} color={palette.iconFg} />
            </View>
          )}
        </View>

        {/* Content stack */}
        <View style={{ flex: 1, paddingTop: 4, paddingRight: 64 }}>
          {eyebrow ? (
            <Text className="text-overline uppercase" style={{ color: palette.iconFg }}>
              {eyebrow}
            </Text>
          ) : null}
          <Text className="mt-1 font-display text-h3 text-ink" numberOfLines={1}>
            {title}
          </Text>
          <Text className="mt-1 text-small text-ink-muted" numberOfLines={2}>
            {description}
          </Text>
        </View>

        {startingPrice ? (
          <View style={{ marginTop: 8 }}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '700',
                letterSpacing: 0.4,
                color: palette.iconFg,
              }}
            >
              FROM {startingPrice}
            </Text>
          </View>
        ) : null}
      </Gradient>
    </Pressable>
  );
}
