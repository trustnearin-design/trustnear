import { View, Text, ActivityIndicator } from 'react-native';
import { AnimatedPressable, usePressScale } from './ui/pressScale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Primary CTA button — brand fill, branded soft shadow when enabled, gold
 * accent variant for "premium" actions. Used for "Send OTP", "Verify",
 * "Book now", "Confirm booking" — anywhere a screen has one dominant action.
 *
 * Falls back to a dim variant when disabled so the user sees something is
 * required upstream before they can proceed.
 */

interface PremiumButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Right-side icon — defaults to arrow-forward. Pass null to omit. */
  icon?: React.ComponentProps<typeof Ionicons>['name'] | null;
  /** Visual variant. 'brand' = navy fill, 'accent' = gold fill. */
  variant?: 'brand' | 'accent';
  /** Optional secondary text suffix (e.g. "· ₹399"). */
  suffix?: string;
}

export function PremiumButton({
  label,
  onPress,
  disabled,
  loading,
  icon = 'arrow-forward',
  variant = 'brand',
  suffix,
}: PremiumButtonProps) {
  const inactive = disabled || loading;
  const enabled = !inactive;
  const baseColor = variant === 'accent' ? colors.accent.DEFAULT : colors.brand.DEFAULT;
  const press = usePressScale();
  return (
    <AnimatedPressable
      disabled={inactive}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={
        enabled
          ? {
              shadowColor: baseColor,
              shadowOpacity: 0.22,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
              transform: [{ scale: press.scale }],
            }
          : { transform: [{ scale: press.scale }] }
      }
      className={`flex-row items-center justify-center rounded-card py-4 ${
        variant === 'accent'
          ? enabled
            ? 'bg-accent'
            : 'bg-accent/40'
          : enabled
            ? 'bg-brand'
            : 'bg-brand/30'
      }`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text className="text-base font-bold text-ink-inverse">{label}</Text>
          {suffix ? (
            <Text className="ml-2 text-base font-bold text-ink-inverse">{suffix}</Text>
          ) : null}
          {icon ? (
            <Ionicons name={icon} size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}

/**
 * Sticky bottom CTA bar — used at the foot of detail screens (expert,
 * booking, book flow). Wraps a PremiumButton with a top border and shadow
 * so the action stays anchored while content scrolls.
 */
export function StickyCtaBar({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pt-3"
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
      }}
    >
      {children}
    </View>
  );
}
