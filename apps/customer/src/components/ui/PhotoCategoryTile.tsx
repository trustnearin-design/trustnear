import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '../../theme/colors';

interface PhotoCategoryTileProps {
  imageUrl?: string | null | undefined;
  title: string;
  /** e.g. "7 services" */
  subtitle?: string | undefined;
  /** Optional small badge top-left (e.g. "New", "Hot") */
  badge?: string | undefined;
  /** Optional starting price label e.g. "From ₹149" */
  startingPrice?: string | undefined;
  /** Override aspect ratio (w/h). Default 1.0 (square). */
  aspectRatio?: number | undefined;
  onPress: () => void;
}

/**
 * D6 photo category tile — photographic background with dark gradient
 * overlay and bold white title. Pattern source: YesMadam category tiles
 * (Image #1 — "Salon for Women", "Spa for Women", "HydraGlo Facials").
 *
 * Lives in the home screen "Explore Categories" grid (3-col mosaic). Use
 * with category.heroImageUrl so every tile is image-driven, not icon-driven.
 */
export function PhotoCategoryTile({
  imageUrl,
  title,
  subtitle,
  badge,
  startingPrice,
  aspectRatio = 1.0,
  onPress,
}: PhotoCategoryTileProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        aspectRatio,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: colors.brand[100],
      }}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.brand[200],
          }}
        />
      )}

      {/* Dark gradient overlay (bottom 55%) for text contrast — simulated
          via two layered views since the wrapper Gradient is for solid use. */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '60%',
          backgroundColor: 'rgba(15, 9, 24, 0.55)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '35%',
          backgroundColor: 'rgba(15, 9, 24, 0.30)',
        }}
      />

      {/* Badge top-left */}
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.accent.DEFAULT,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 10,
              fontWeight: '800',
              letterSpacing: 0.5,
            }}
          >
            {badge.toUpperCase()}
          </Text>
        </View>
      ) : null}

      {/* Text overlay bottom */}
      <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
        {subtitle ? (
          <Text
            style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 9,
              fontWeight: '800',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 3,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          numberOfLines={2}
          style={{
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: '800',
            lineHeight: 19,
          }}
        >
          {title}
        </Text>
        {startingPrice ? (
          <Text
            style={{
              marginTop: 4,
              color: colors.support[300],
              fontSize: 11,
              fontWeight: '800',
            }}
          >
            {startingPrice}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
