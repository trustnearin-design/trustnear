import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

/**
 * Reusable navy hero section used at the top of most screens (home, categories,
 * bookings, OTP, booking detail, book flow). Provides the brand-consistent
 * navy background, gold corner glow, and an upper bar with optional
 * back/right slot. Children render below the upper bar, padded to 20px.
 *
 * Pair with a floating element below (e.g. SearchPill `-mt-6`) to get the
 * Urban Company-style boundary float.
 */

interface NavyHeroProps {
  /** Optional back tap. If omitted, no back button rendered. */
  onBack?: () => void;
  /** Optional right-side element (e.g. share button, notification bell). */
  rightSlot?: React.ReactNode;
  /** Small caps label rendered above title (e.g. "DELIVERING TO"). */
  eyebrow?: string;
  /** Large white title (e.g. "Namaste, Vikas"). */
  title?: string;
  /** Light-gold subtitle below title (e.g. "Verified pros at your doorstep"). */
  subtitle?: string;
  /** Extra space (px) below content — useful if a search pill needs to float
   * on the boundary. Default 16. */
  bottomGap?: number;
  /** Render arbitrary content in place of the default eyebrow/title/subtitle. */
  children?: React.ReactNode;
}

export function NavyHero({
  onBack,
  rightSlot,
  eyebrow,
  title,
  subtitle,
  bottomGap = 16,
  children,
}: NavyHeroProps) {
  return (
    <View className="bg-brand-800" style={{ paddingBottom: bottomGap }}>
      {/* Soft gold corner glow — adds depth without an image */}
      <View
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: 100,
          backgroundColor: 'rgba(212,162,76,0.16)',
        }}
      />
      <SafeAreaView edges={['top']}>
        {(onBack || rightSlot) && (
          <View className="flex-row items-center justify-between px-5 pt-2">
            {onBack ? (
              <GlassIconButton icon="arrow-back" onPress={onBack} />
            ) : (
              <View style={{ width: 40 }} />
            )}
            {rightSlot ?? <View style={{ width: 40 }} />}
          </View>
        )}
        {children ? (
          <View className="px-5 pt-2">{children}</View>
        ) : (
          <View className="px-5 pt-2">
            {eyebrow ? (
              <Text
                className="text-[10px] font-bold uppercase tracking-[2px]"
                style={{ color: colors.accent[200] }}
              >
                {eyebrow}
              </Text>
            ) : null}
            {title ? (
              <Text className="mt-1 text-[26px] font-bold text-ink-inverse">{title}</Text>
            ) : null}
            {subtitle ? (
              <Text className="mt-0.5 text-[13px]" style={{ color: colors.accent[200] }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

/**
 * Circular translucent button for use on dark backgrounds (back, heart,
 * share, notification bell). 40×40, white-translucent fill, white icon.
 */
export function GlassIconButton({
  icon,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
    </Pressable>
  );
}
