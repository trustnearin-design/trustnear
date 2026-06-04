import { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

/**
 * Tactile press-scale for buttons and cards. Returns an Animated scale value
 * plus onPressIn/onPressOut handlers that spring the element down on touch and
 * back on release — the satisfying "give" found in polished apps. Uses the
 * built-in Animated API (native driver) so it works without reanimated
 * worklets.
 */
export function usePressScale(to = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: to,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 24,
      bounciness: 8,
    }).start();
  };

  return { scale, onPressIn, onPressOut };
}

/** Pressable with Animated support — use with {@link usePressScale}. */
export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
