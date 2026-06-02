import { View, Text, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

interface ServiceCardProps {
  imageUrl?: string | null | undefined;
  title: string;
  /** e.g. "Cleaning Pro" or category name shown small under title */
  subtitle?: string | undefined;
  /** e.g. 4.8 — rendered as ★ 4.8 */
  rating?: number | undefined;
  /** e.g. "2.6k bookings" — shown after rating */
  ratingCount?: string | undefined;
  /** Current price in paise. */
  pricePaise: number;
  /** Optional MRP in paise — when set, shown struck-through next to price. */
  mrpPaise?: number | undefined;
  /** Optional 1-line discount label like "45% OFF" */
  discountLabel?: string | undefined;
  /** Optional duration text like "1 hr 30 mins" */
  durationLabel?: string | undefined;
  /** Floating badge label (top-left corner of image), e.g. "Bestseller" */
  badge?: string | undefined;
  /** Card width in px — pass for horizontal-scroll lists. Default fills container. */
  width?: number | undefined;
  onPress: () => void;
  onAddPress: () => void;
}

function paiseToRupees(p: number): string {
  return '₹' + Math.round(p / 100).toLocaleString('en-IN');
}

/**
 * D6 service card — Urban Company / YesMadam style.
 * Big photo top, badge overlay, title, rating, price + discount, Add button.
 * Used in horizontal scrollers ("Trending in Jaipur", "Most Booked") and
 * 2-col grids (category detail page).
 */
export function ServiceCard({
  imageUrl,
  title,
  subtitle,
  rating,
  ratingCount,
  pricePaise,
  mrpPaise,
  discountLabel,
  durationLabel,
  badge,
  width,
  onPress,
  onAddPress,
}: ServiceCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width,
        backgroundColor: colors.surface.DEFAULT,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border.DEFAULT,
      }}
    >
      {/* Image with optional badge overlay */}
      <View style={{ position: 'relative', backgroundColor: colors.surface.muted }}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: '100%', aspectRatio: 1, backgroundColor: colors.surface.muted }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: '100%',
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.brand[100],
            }}
          >
            <Ionicons name="image-outline" size={42} color={colors.brand[400]} />
          </View>
        )}
        {badge ? (
          <View
            style={{
              position: 'absolute',
              top: 10,
              left: 10,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: 'rgba(34, 16, 47, 0.85)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>
              {badge}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Body */}
      <View style={{ padding: 12 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.ink.DEFAULT,
            lineHeight: 19,
            minHeight: 38,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ marginTop: 2, fontSize: 11, color: colors.ink.subtle }}>
            {subtitle}
          </Text>
        ) : null}

        {/* Rating row */}
        {rating != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Ionicons name="star" size={12} color={colors.support[500]} />
            <Text
              style={{
                marginLeft: 4,
                fontSize: 12,
                fontWeight: '700',
                color: colors.ink.DEFAULT,
              }}
            >
              {rating.toFixed(1)}
            </Text>
            {ratingCount ? (
              <Text style={{ marginLeft: 4, fontSize: 11, color: colors.ink.subtle }}>
                ({ratingCount})
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Duration row */}
        {durationLabel ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Ionicons name="time-outline" size={12} color={colors.ink.subtle} />
            <Text style={{ marginLeft: 4, fontSize: 11, color: colors.ink.muted }}>
              {durationLabel}
            </Text>
          </View>
        ) : null}

        {/* Price row */}
        <View
          style={{ marginTop: 8, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink.DEFAULT }}>
            {paiseToRupees(pricePaise)}
          </Text>
          {mrpPaise && mrpPaise > pricePaise ? (
            <Text
              style={{
                marginLeft: 6,
                fontSize: 12,
                color: colors.ink.subtle,
                textDecorationLine: 'line-through',
              }}
            >
              {paiseToRupees(mrpPaise)}
            </Text>
          ) : null}
          {discountLabel ? (
            <Text style={{ marginLeft: 6, fontSize: 11, color: '#16A34A', fontWeight: '800' }}>
              {discountLabel}
            </Text>
          ) : null}
        </View>

        {/* Add button */}
        <Pressable
          onPress={onAddPress}
          style={{
            marginTop: 10,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.accent.DEFAULT,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: colors.accent.DEFAULT, fontSize: 13, fontWeight: '800' }}>
            Book
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
