import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '../../theme/colors';

interface PromoBannerProps {
  /** Background photo URL. Image is cropped to cover. */
  imageUrl: string;
  /** Small uppercase eyebrow shown above title, e.g. "INDIA'S FIRST". */
  eyebrow?: string | undefined;
  /** Big bold title — pass 1-2 lines max, e.g. "Weekend Spa\nRitual". */
  title: string;
  /** Subtitle under title, smaller. */
  subtitle?: string | undefined;
  /** CTA button label. */
  ctaLabel: string;
  onPress: () => void;
  /** Overlay tint applied over image for text contrast. Default 'dark'. */
  tint?: 'dark' | 'light' | 'plum' | 'coral' | undefined;
  /** Approximate aspect ratio (width / height). Default 16/9. Ignored if `minHeight` set. */
  aspectRatio?: number | undefined;
  /** Fixed minimum height in px. If set, aspectRatio is ignored. Default unset. */
  minHeight?: number | undefined;
  /** Horizontal margin around banner. Default 20. */
  marginHorizontal?: number | undefined;
}

const TINT_COLOR: Record<NonNullable<PromoBannerProps['tint']>, string> = {
  dark: 'rgba(15, 9, 24, 0.45)',
  light: 'rgba(255, 255, 255, 0.25)',
  plum: 'rgba(61, 31, 78, 0.55)',
  coral: 'rgba(255, 122, 92, 0.45)',
};

/**
 * D6 promotional banner — full-bleed photo with bold typography overlay and
 * a CTA pill. Used as a 4-up auto-rotating carousel slot on the home screen
 * (e.g. "Weekend Spa", "Monsoon Special", "First Booking 20% Off").
 *
 * Pattern source: YesMadam "Weekday Stress?" / Urban Company seasonal banners.
 */
export function PromoBanner({
  imageUrl,
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  onPress,
  tint = 'dark',
  aspectRatio,
  minHeight,
  marginHorizontal = 20,
}: PromoBannerProps) {
  // Default to minHeight 220 so banner always fits eyebrow + 2-line title +
  // 2-line subtitle + CTA pill comfortably. aspectRatio honoured only if no
  // minHeight passed (back-compat for older call sites).
  const sizeStyle =
    minHeight != null ? { minHeight } : aspectRatio != null ? { aspectRatio } : { minHeight: 220 };
  return (
    <Pressable
      onPress={onPress}
      style={{
        marginHorizontal,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.brand[800],
        ...sizeStyle,
      }}
    >
      <Image
        source={{ uri: imageUrl }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        resizeMode="cover"
      />
      {/* Tint overlay */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: TINT_COLOR[tint],
        }}
      />

      {/* Content */}
      <View
        style={{
          flex: 1,
          padding: 20,
          justifyContent: 'space-between',
          maxWidth: '70%',
        }}
      >
        <View>
          {eyebrow ? (
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: '800',
                letterSpacing: 1.4,
                marginBottom: 6,
                opacity: 0.9,
              }}
            >
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 22,
              fontWeight: '900',
              lineHeight: 27,
            }}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{
                marginTop: 6,
                color: '#FFFFFF',
                fontSize: 13,
                opacity: 0.92,
                lineHeight: 18,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            alignSelf: 'flex-start',
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 999,
            backgroundColor: colors.accent.DEFAULT,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>{ctaLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}
