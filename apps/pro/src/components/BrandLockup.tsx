import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { colors } from '../theme/colors';

export type BrandTone = 'dark-on-light' | 'light-on-dark';
export type BrandSize = 'sm' | 'md' | 'lg' | 'xl';

const LOGO_LIGHT_BG = require('../../assets/logo-on-white.png');
const LOGO_DARK_BG = require('../../assets/splash-icon.png');

const SIZE_PX: Record<BrandSize, number> = {
  sm: 80,
  md: 120,
  lg: 180,
  xl: 240,
};

/**
 * TrustNear Pro brand lockup — same wordmark + tagline as customer app
 * with a "Pro" eyebrow so professionals know which app they're in.
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
  const source: ImageSourcePropType = isLightOnDark ? LOGO_DARK_BG : LOGO_LIGHT_BG;
  const width = SIZE_PX[size];
  const height = width;

  const taglineSize = size === 'xl' ? 13 : size === 'lg' ? 11 : 10;
  const taglineColor = isLightOnDark ? colors.brand[200] : colors.brand[700];

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: isLightOnDark ? colors.accent.DEFAULT : colors.brand[800],
          marginBottom: 8,
        }}
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 9,
            fontWeight: '800',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          Pro
        </Text>
      </View>
      <Image
        source={source}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="TrustNear Pro logo"
      />
      {showTagline ? (
        <Text
          style={{
            marginTop: 6,
            fontSize: taglineSize,
            fontWeight: '800',
            letterSpacing: 2.2,
            textTransform: 'uppercase',
            color: taglineColor,
          }}
        >
          For verified professionals
        </Text>
      ) : null}
    </View>
  );
}

export function BrandWordmark({
  tone = 'dark-on-light',
  height = 32,
}: {
  tone?: BrandTone;
  height?: number;
}) {
  const source: ImageSourcePropType = tone === 'light-on-dark' ? LOGO_DARK_BG : LOGO_LIGHT_BG;
  return (
    <Image
      source={source}
      style={{ height, aspectRatio: 1 }}
      resizeMode="contain"
      accessibilityLabel="TrustNear Pro"
    />
  );
}

/** Backward-compat shim — old code imported ShieldMark from this file. */
export function ShieldMark({ size = 56 }: { size?: number }) {
  return <BrandWordmark tone="dark-on-light" height={size} />;
}
