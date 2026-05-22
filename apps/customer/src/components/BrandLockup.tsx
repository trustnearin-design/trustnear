import { View, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';

/**
 * TrustNear shield mark — gold shield with white checkmark.
 * Renders inline via react-native-svg so it scales crisply at any size
 * and theme switches without raster assets.
 *
 * Use stand-alone as a logo (e.g. on splash) or inside [[BrandLockup]]
 * for the full wordmark stack.
 */
export function ShieldMark({ size = 56 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 40 48" fill="none">
      <Path
        d="M20 0 C28 2, 36 4, 36 8 L36 26 C36 38, 28 44, 20 48 C12 44, 4 38, 4 26 L4 8 C4 4, 12 2, 20 0 Z"
        fill={colors.accent.DEFAULT}
      />
      <Path
        d="M13 24 L18 30 L28 17"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export type BrandTone = 'dark-on-light' | 'light-on-dark';
export type BrandSize = 'sm' | 'md' | 'lg';

/**
 * Full TrustNear brand lockup: shield + wordmark + tagline, stacked.
 *
 *   tone = 'light-on-dark' — use on a navy hero or brand-colored surface
 *   tone = 'dark-on-light' — default; wordmark navy, tagline ink-muted
 *
 * Size scales each piece together so proportions stay consistent.
 */
export function BrandLockup({
  tone = 'dark-on-light',
  size = 'lg',
  showTagline = true,
}: {
  tone?: BrandTone;
  size?: BrandSize;
  showTagline?: boolean;
}) {
  const isLightOnDark = tone === 'light-on-dark';
  const shieldSize = size === 'lg' ? 56 : size === 'md' ? 44 : 32;
  const wordmarkSize = size === 'lg' ? 34 : size === 'md' ? 28 : 22;
  const taglineSize = size === 'lg' ? 11 : 10;
  const wordmarkColor = isLightOnDark ? '#FFFFFF' : colors.brand.DEFAULT;
  const taglineColor = isLightOnDark ? colors.brand[100] : colors.ink.muted;

  return (
    <View style={{ alignItems: 'center' }}>
      <ShieldMark size={shieldSize} />
      <Text
        style={{
          fontSize: wordmarkSize,
          fontWeight: '800',
          letterSpacing: -0.8,
          color: wordmarkColor,
          marginTop: size === 'lg' ? 14 : 10,
        }}
      >
        TrustNear
      </Text>
      {showTagline ? (
        <Text
          style={{
            fontSize: taglineSize,
            fontWeight: '700',
            letterSpacing: 2,
            color: taglineColor,
            marginTop: 4,
          }}
        >
          VERIFIED PROS · NEAR YOU
        </Text>
      ) : null}
    </View>
  );
}
