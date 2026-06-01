import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface SectionTitleProps {
  /** Big bold heading — kept to one line (ellipsised) so it never wraps oddly. */
  title: string;
  /** Tiny uppercase kicker above the title (single line). */
  kicker?: string | undefined;
  /** Optional CTA on the right, e.g. "See all". */
  ctaLabel?: string | undefined;
  onCtaPress?: (() => void) | undefined;
  /** Show the coral accent bar to the left of the title. Default true. */
  accentBar?: boolean | undefined;
  /** Horizontal padding. Default 20. */
  paddingHorizontal?: number | undefined;
}

/**
 * Myntra-grade section header. Bold display title with an optional coral
 * accent bar + uppercase kicker + right "See all" CTA. Title is single-line
 * with ellipsis and the CTA is fixed-width, so a long title can never push
 * the layout into the one-word-per-line wrap we hit before.
 */
export function SectionTitle({
  title,
  kicker,
  ctaLabel,
  onCtaPress,
  accentBar = true,
  paddingHorizontal = 20,
}: SectionTitleProps) {
  return (
    <View
      style={{
        paddingHorizontal,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: 10 }}>
        {accentBar ? (
          <View
            style={{
              width: 4,
              height: 22,
              borderRadius: 2,
              backgroundColor: colors.accent.DEFAULT,
              marginRight: 10,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          {kicker ? (
            <Text
              numberOfLines={1}
              style={{
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: colors.accent[600],
                marginBottom: 2,
              }}
            >
              {kicker}
            </Text>
          ) : null}
          <Text
            numberOfLines={1}
            style={{
              fontSize: 19,
              fontWeight: '800',
              letterSpacing: -0.3,
              color: colors.ink.DEFAULT,
            }}
          >
            {title}
          </Text>
        </View>
      </View>
      {ctaLabel && onCtaPress ? (
        <Pressable
          onPress={onCtaPress}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Text style={{ fontSize: 12.5, fontWeight: '800', color: colors.brand[700] }}>
            {ctaLabel}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color={colors.brand[700]}
            style={{ marginLeft: 2 }}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
