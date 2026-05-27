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
 * TrustNear brand lockup — stacked "trust / near." wordmark with coral dot.
 * Renders the master PNG (light or dark tone) at the requested size.
 *
 * The PNG is the source of truth — kept in `assets/` and synced via
 * `scripts/install-brand-assets.mjs`. To tweak kerning, color, or weight,
 * regenerate the PNG and rerun the script — this component just scales it.
 *
 *   tone = 'dark-on-light'  → purple lockup on cream/white surface
 *   tone = 'light-on-dark'  → white lockup on plum surface
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
      <Image
        source={source}
        style={{ width, height }}
        resizeMode="contain"
        accessibilityLabel="TrustNear logo"
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
          Trusted home services
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Compact 1-line wordmark for app bars / email signatures / footers.
 * Pass `tone='light-on-dark'` for plum-background contexts.
 */
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
      accessibilityLabel="TrustNear"
    />
  );
}

/**
 * Backward-compat shim — old code imported `ShieldMark` from this file.
 * The shield mark is now baked into the master logo PNG, so this just
 * renders the light-bg wordmark at the requested size.
 */
export function ShieldMark({ size = 56 }: { size?: number }) {
  return <BrandWordmark tone="dark-on-light" height={size} />;
}
