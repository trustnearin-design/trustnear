import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, type ViewStyle } from 'react-native';

/**
 * Entrance motion — fades + slides its children up on mount. Pass a `delay`
 * to stagger siblings into a cascade (e.g. 0, 80, 160ms) for the "everything
 * animates in" feel of polished apps. Native-driver Animated, so it's smooth
 * without reanimated worklets.
 */
export function FadeSlideIn({
  children,
  delay = 0,
  offset = 16,
  style,
}: {
  children: ReactNode;
  delay?: number;
  /** How far (px) the element travels up into place. */
  offset?: number;
  style?: ViewStyle;
}) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [progress, delay]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [offset, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
