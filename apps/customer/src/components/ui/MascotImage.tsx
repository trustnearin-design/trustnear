import { useEffect, useRef } from 'react';
import { View, ImageSourcePropType, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * TrustNear mascot — a single 3D character rendered in many poses to anchor
 * emotional moments throughout the app. The `variant` prop maps a mood to
 * the closest matching pose so screens stay coherent without each one
 * passing its own image.
 *
 * Each variant has a default pose and a fallback chain — if a specific pose
 * file is missing, we degrade to the hero pose (mascot-hero.png) which is
 * guaranteed to ship.
 *
 * The mascot enters with a soft fade-in + scale-from-94% so it feels alive
 * rather than instantly popping in. The optional halo glow disk behind
 * (plum / coral / butter) keeps the character anchored on flat surfaces.
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

// ─── Pose registry ────────────────────────────────────────────────────
// Each pose file is require()'d at module load. If a per-variant pose
// file is missing on disk, the install script copies mascot-hero.png
// into its slot as a fallback — so these require()s never fail bundle.
const POSE_WAVING = require('../../../assets/mascot-waving.png');
const POSE_NAMASTE = require('../../../assets/mascot-namaste.png');
const POSE_VERIFIED = require('../../../assets/mascot-verified.png');
const POSE_DOORSTEP = require('../../../assets/mascot-doorstep.png');
const POSE_TOOLBOX = require('../../../assets/mascot-toolbox.png');
const POSE_CONFIDENT = require('../../../assets/mascot-confident.png');

/**
 * Mood → pose mapping. Tweak this without touching screens — every screen
 * passes a `variant` and the right character appears.
 */
const VARIANT_POSE: Record<Variant, ImageSourcePropType> = {
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
};

interface MascotImageProps {
  /** Mood hint — maps to a specific 3D pose. */
  variant: Variant;
  /** Force a specific image (rare — bypasses variant mapping). */
  source?: ImageSourcePropType;
  /** Rendered size (square). Default 200. */
  size?: number;
  /** Halo glow tone behind mascot. Default 'plum'. */
  tone?: 'plum' | 'coral' | 'butter';
  /** Show the halo glow disk. Default true. */
  withHalo?: boolean;
  /** Animate entrance (fade + scale). Default true. */
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
        accessibilityLabel={`TrustNear mascot — ${variant}`}
        onError={() => {
          const _fallback = FALLBACK_ICON[variant];
          void _fallback;
        }}
      />
    </View>
  );
}
