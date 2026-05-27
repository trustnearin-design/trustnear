import { View, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TrustNear Pro mascot — same 3D character as customer app. One master
 * PNG drives every variant; the variant prop captures mood for
 * accessibility + future per-variant art.
 */
type Variant =
  | 'greeter'
  | 'locator'
  | 'notifier'
  | 'verifier'
  | 'cleaner'
  | 'plumber'
  | 'electrician'
  | 'beautician'
  | 'trainer'
  | 'celebrator'
  | 'resting'
  | 'searcher'
  | 'apologizer';

const MASCOT_PNG: ImageSourcePropType = require('../../../assets/mascot-hero.png');

const FALLBACK_ICON: Record<Variant, React.ComponentProps<typeof Ionicons>['name']> = {
  greeter: 'happy-outline',
  locator: 'location-outline',
  notifier: 'notifications-outline',
  verifier: 'checkmark-circle-outline',
  cleaner: 'sparkles-outline',
  plumber: 'water-outline',
  electrician: 'flash-outline',
  beautician: 'flower-outline',
  trainer: 'barbell-outline',
  celebrator: 'gift-outline',
  resting: 'cafe-outline',
  searcher: 'search-outline',
  apologizer: 'sad-outline',
};

interface MascotImageProps {
  variant: Variant;
  source?: ImageSourcePropType;
  size?: number;
  tone?: 'plum' | 'coral' | 'butter';
  withHalo?: boolean;
}

export function MascotImage({
  variant,
  source,
  size = 200,
  tone = 'plum',
  withHalo = true,
}: MascotImageProps) {
  const haloColor =
    tone === 'coral'
      ? 'rgba(255,122,92,0.18)'
      : tone === 'butter'
        ? 'rgba(245,199,106,0.20)'
        : 'rgba(141,93,178,0.18)';

  const finalSource = source ?? MASCOT_PNG;

  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {withHalo ? (
        <View
          style={{
            position: 'absolute',
            width: size * 0.92,
            height: size * 0.92,
            borderRadius: size,
            backgroundColor: haloColor,
            bottom: size * 0.04,
          }}
        />
      ) : null}
      <Image
        source={finalSource}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityLabel={`TrustNear Pro mascot — ${variant}`}
        onError={() => {
          const _fallback = FALLBACK_ICON[variant];
          void _fallback;
        }}
      />
    </View>
  );
}
