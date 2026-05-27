import { View, type ViewStyle, type StyleProp } from 'react-native';

/**
 * Gradient wrapper — uses expo-linear-gradient when available, otherwise
 * falls back to a flat View with the first color of the gradient. The
 * fallback exists because the current dev build APK doesn't have the
 * LinearGradient native ViewManager registered (will be fixed in next
 * EAS build).
 *
 * To re-enable real gradients after a fresh dev build APK is installed,
 * flip USE_NATIVE_GRADIENT to true.
 */
const USE_NATIVE_GRADIENT = false;

interface GradientProps {
  colors: readonly string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function Gradient({ colors, start, end, style, children }: GradientProps) {
  if (USE_NATIVE_GRADIENT) {
    // Lazy require so the native module is only touched when the flag is on.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LinearGradient } = require('expo-linear-gradient');
    return (
      <LinearGradient colors={colors} start={start} end={end} style={style}>
        {children}
      </LinearGradient>
    );
  }
  const bg = colors[0] ?? '#000000';
  return <View style={[style, { backgroundColor: bg }]}>{children}</View>;
}
