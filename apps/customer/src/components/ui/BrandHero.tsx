import { View, Text, Pressable, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Gradient } from './Gradient';
import { colors } from '../../theme/colors';

/**
 * D1 brand hero — plum 3-stop gradient with optional eyebrow/title/subtitle
 * or arbitrary children. Replaces the flat `NavyHero` for new screens; the
 * existing `NavyHero` stays as a back-compat alias.
 *
 * Pairs with a floating element below (e.g. SearchPill `-mt-6`) for the
 * boundary-float pattern used on customer home + category screens.
 */

interface BrandHeroProps {
  /** Optional back tap. If omitted, no back button rendered. */
  onBack?: () => void;
  /** Optional right-side element (e.g. share button, notification bell). */
  rightSlot?: React.ReactNode;
  /** Small caps label rendered above title. */
  eyebrow?: string;
  /** Large white title. */
  title?: string;
  /** Light coral-tinted subtitle below title. */
  subtitle?: string;
  /** Extra padding (px) below content. Default 16. */
  bottomGap?: number;
  /** Render arbitrary content in place of eyebrow/title/subtitle. */
  children?: React.ReactNode;
  /** Disable the soft coral corner glow (e.g. when hero contains a busy
   * mascot illustration that the glow would clash with). Default false. */
  noGlow?: boolean;
  /** Compact hero for non-home screens — pulls in vertical padding. */
  compact?: boolean;
  /** Extra wrapper style for niche cases (e.g. extending bg to absolute layer). */
  style?: ViewStyle;
}

export function BrandHero({
  onBack,
  rightSlot,
  eyebrow,
  title,
  subtitle,
  bottomGap = 16,
  children,
  noGlow = false,
  compact = false,
  style,
}: BrandHeroProps) {
  return (
    <View style={style}>
      <Gradient
        colors={colors.gradient.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingBottom: bottomGap }}
      >
        {!noGlow && (
          <>
            <View
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 220,
                height: 220,
                borderRadius: 110,
                backgroundColor: 'rgba(255, 122, 92, 0.18)',
              }}
            />
            <View
              style={{
                position: 'absolute',
                bottom: -40,
                left: -40,
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: 'rgba(245, 199, 106, 0.10)',
              }}
            />
          </>
        )}
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
            <View className={`px-5 ${compact ? 'pt-1' : 'pt-2'}`}>{children}</View>
          ) : (
            <View className={`px-5 ${compact ? 'pt-1' : 'pt-2'}`}>
              {eyebrow ? (
                <Text
                  className="font-display text-overline uppercase"
                  style={{ color: colors.support[300] }}
                >
                  {eyebrow}
                </Text>
              ) : null}
              {title ? (
                <Text className="mt-2 font-display text-h1 text-ink-inverse">{title}</Text>
              ) : null}
              {subtitle ? (
                <Text className="mt-1 text-body" style={{ color: colors.brand[200] }}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </SafeAreaView>
      </Gradient>
    </View>
  );
}

/**
 * Circular translucent button for use on dark hero backgrounds (back, heart,
 * share, notification bell). 40×40, white-translucent fill, white icon.
 */
export function GlassIconButton({
  icon,
  onPress,
  badge,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  /** Small numeric/dot badge (e.g. unread notifications). */
  badge?: number | true;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      className="h-10 w-10 items-center justify-center rounded-full"
      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
    >
      <Ionicons name={icon} size={20} color="#FFFFFF" />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: colors.accent.DEFAULT,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1.5,
            borderColor: colors.brand[800],
          }}
        >
          {typeof badge === 'number' ? (
            <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800' }}>
              {badge > 9 ? '9+' : badge}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}
