import { useEffect, useRef } from 'react';
import { View, ImageSourcePropType, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TrustNear Pro mascot — same 3D character as customer, but with a
 * Pro-app-specific variant set (KYC + onboarding moods) on top of the
 * shared registry. The `variant` prop maps a mood to a specific pose so
 * each screen stays coherent without passing its own image.
 *
 * Enters with a soft fade-in + spring scale-from-94% so it feels alive.
 * Halo glow disk anchors the character on flat surfaces.
 */
type Variant =
  // Generic moods (shared with customer)
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
  | 'apologizer'
  // Phase 3g onboarding-specific moods
  | 'welcome' // First-time waving
  | 'personal' // Confident "tell us about you"
  | 'photo' // Namaste / smile-please
  | 'services' // Toolbox / what can you do
  | 'area' // Doorstep / where you serve
  | 'schedule' // Confident / your hours
  | 'kyc' // Verified shield
  | 'submitted' // Doorstep waiting
  | 'approved' // Celebrator
  | 'rejected'; // Supportive confident (we got you)

// ─── Pose registry (PNG — Pro app doesn't have WebP yet) ─────────────
const POSE_HERO = require('../../../assets/mascot-hero.png');
const POSE_WAVING = require('../../../assets/mascot-waving.png');
const POSE_NAMASTE = require('../../../assets/mascot-namaste.png');
const POSE_VERIFIED = require('../../../assets/mascot-verified.png');
const POSE_DOORSTEP = require('../../../assets/mascot-doorstep.png');
const POSE_TOOLBOX = require('../../../assets/mascot-toolbox.png');
const POSE_CONFIDENT = require('../../../assets/mascot-confident.png');

const VARIANT_POSE: Record<Variant, ImageSourcePropType> = {
  // Generic
  greeter: POSE_WAVING,
  locator: POSE_DOORSTEP,
  notifier: POSE_WAVING,
  verifier: POSE_VERIFIED,
  cleaner: POSE_DOORSTEP,
  plumber: POSE_TOOLBOX,
  electrician: POSE_TOOLBOX,
  beautician: POSE_NAMASTE,
  trainer: POSE_CONFIDENT,
  celebrator: POSE_NAMASTE,
  resting: POSE_CONFIDENT,
  searcher: POSE_TOOLBOX,
  apologizer: POSE_NAMASTE,
  // Phase 3g onboarding
  welcome: POSE_WAVING,
  personal: POSE_CONFIDENT,
  photo: POSE_NAMASTE,
  services: POSE_TOOLBOX,
  area: POSE_DOORSTEP,
  schedule: POSE_CONFIDENT,
  kyc: POSE_VERIFIED,
  submitted: POSE_DOORSTEP,
  approved: POSE_HERO,
  rejected: POSE_CONFIDENT,
};

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
  welcome: 'hand-right-outline',
  personal: 'person-outline',
  photo: 'camera-outline',
  services: 'briefcase-outline',
  area: 'location-outline',
  schedule: 'calendar-outline',
  kyc: 'shield-checkmark-outline',
  submitted: 'time-outline',
  approved: 'checkmark-done-circle-outline',
  rejected: 'alert-circle-outline',
};

interface MascotImageProps {
  variant: Variant;
  source?: ImageSourcePropType;
  size?: number;
  tone?: 'plum' | 'coral' | 'butter';
  withHalo?: boolean;
  animated?: boolean;
}

export function MascotImage({
  variant,
  source,
  size = 200,
  tone = 'plum',
  withHalo = true,
  animated = true,
}: MascotImageProps) {
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const scale = useRef(new Animated.Value(animated ? 0.94 : 1)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 8,
        bounciness: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animated, opacity, scale, variant]);

  const haloColor =
    tone === 'coral'
      ? 'rgba(255,122,92,0.18)'
      : tone === 'butter'
        ? 'rgba(245,199,106,0.22)'
        : 'rgba(141,93,178,0.18)';

  const finalSource = source ?? VARIANT_POSE[variant];

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
      <Animated.Image
        source={finalSource}
        style={{
          width: size,
          height: size,
          opacity,
          transform: [{ scale }],
        }}
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
