import { View, Text, Pressable } from 'react-native';
import { Gradient } from './Gradient';
import { colors } from '../../theme/colors';
import { Avatar } from '../Avatar';

/**
 * Signature element of the "Top Verified Pros Near You" home strip — the
 * one new pattern that mirrors Toing's "Popular Brands" row, adapted for
 * humans. A round avatar inside a tier-colored ring, with a star badge at
 * the bottom-right and the pro's first name + rating below.
 *
 *   ┌──────────────┐
 *   │  ╭──────╮    │   ← ring (gradient for top tier)
 *   │  │ FACE │★4.9│   ← star badge clipped on the ring
 *   │  ╰──────╯    │
 *   │  Anita Sharma │
 *   │  ⭐ 4.9        │
 *   └──────────────┘
 */
interface ExpertCircleProps {
  fullName: string;
  photoUrl?: string | null;
  rating: number; // 0–5
  /** Tier drives the ring color & gradient. Defaults to 'silver'. */
  tier?: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  /** Optional secondary line (e.g. "Cleaning · 3y"). */
  subtitle?: string;
  onPress?: () => void;
  size?: number;
}

const TIER_RING: Record<
  NonNullable<ExpertCircleProps['tier']>,
  { type: 'solid' | 'gradient'; colors: readonly [string, string] | string }
> = {
  none: { type: 'solid', colors: colors.border.DEFAULT },
  bronze: { type: 'solid', colors: colors.badge.bronze },
  silver: { type: 'solid', colors: colors.badge.silver },
  gold: { type: 'gradient', colors: colors.gradient.butterGlow },
  platinum: { type: 'gradient', colors: [colors.brand[600], colors.brand[800]] as const },
};

export function ExpertCircle({
  fullName,
  photoUrl,
  rating,
  tier = 'silver',
  subtitle,
  onPress,
  size = 76,
}: ExpertCircleProps) {
  const ringPadding = 3;
  const wrapperSize = size + ringPadding * 2;
  const ring = TIER_RING[tier];
  const firstName = fullName.split(' ')[0] ?? fullName;

  return (
    <Pressable onPress={onPress} style={{ alignItems: 'center', width: wrapperSize + 12 }}>
      <View style={{ width: wrapperSize, height: wrapperSize }}>
        {ring.type === 'gradient' ? (
          <Gradient
            colors={ring.colors as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: wrapperSize,
              height: wrapperSize,
              borderRadius: wrapperSize / 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.surface.DEFAULT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar fullName={fullName} photoUrl={photoUrl} size={size - 4} />
            </View>
          </Gradient>
        ) : (
          <View
            style={{
              width: wrapperSize,
              height: wrapperSize,
              borderRadius: wrapperSize / 2,
              backgroundColor: ring.colors as string,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: colors.surface.DEFAULT,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Avatar fullName={fullName} photoUrl={photoUrl} size={size - 4} />
            </View>
          </View>
        )}

        {/* Rating star badge — bottom right */}
        <View
          style={{
            position: 'absolute',
            bottom: -2,
            right: -4,
            backgroundColor: colors.brand[800],
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 999,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: colors.surface.DEFAULT,
          }}
        >
          <Text style={{ color: colors.support.DEFAULT, fontSize: 9, marginRight: 2 }}>★</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
            {rating.toFixed(1)}
          </Text>
        </View>
      </View>

      <Text
        className="mt-2 font-display text-small text-ink"
        numberOfLines={1}
        style={{ maxWidth: wrapperSize + 12 }}
      >
        {firstName}
      </Text>
      {subtitle ? (
        <Text
          className="text-caption text-ink-subtle"
          numberOfLines={1}
          style={{ maxWidth: wrapperSize + 12 }}
        >
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}
