import { ScrollView, View, Text, Pressable, Image } from 'react-native';
import { colors } from '../../theme/colors';

export interface TwoRowItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Price in paise — shown as a small chip on the image. */
  pricePaise?: number | undefined;
}

interface TwoRowCategorySliderProps {
  items: TwoRowItem[];
  onPress: (slug: string) => void;
}

const ITEM_W = 108;
const IMG_H = 104;
const LABEL_H = 34;
const ROW_GAP = 16;
const ITEM_H = IMG_H + 6 + LABEL_H;

/**
 * Myntra image-4 pattern — a horizontal slider laid out in TWO rows. Items
 * flow top→bottom into a fixed-height (2-row) column-wrapping container, so
 * the rows scroll together horizontally. Each tile = photo + price chip +
 * label below.
 */
export function TwoRowCategorySlider({ items, onPress }: TwoRowCategorySliderProps) {
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14 }}
    >
      <View
        style={{
          flexDirection: 'column',
          flexWrap: 'wrap',
          // Each item occupies ITEM_H + its marginBottom; two of those must
          // fit per column or items collapse into a single row (leaving a
          // large blank below the slider).
          height: (ITEM_H + ROW_GAP) * 2,
          alignContent: 'flex-start',
        }}
      >
        {items.map((item) => (
          <Pressable
            key={item.slug}
            onPress={() => onPress(item.slug)}
            style={{ width: ITEM_W, height: ITEM_H, marginRight: 12, marginBottom: ROW_GAP }}
          >
            <View
              style={{
                width: ITEM_W,
                height: IMG_H,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: colors.support[100],
              }}
            >
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : null}
              {item.pricePaise !== undefined ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 6,
                    bottom: 6,
                    paddingHorizontal: 7,
                    paddingVertical: 3,
                    borderRadius: 8,
                    backgroundColor: 'rgba(26,18,38,0.82)',
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10.5, fontWeight: '800' }}>
                    ₹{Math.floor(item.pricePaise / 100)}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              style={{
                marginTop: 6,
                width: ITEM_W,
                fontSize: 11,
                lineHeight: 14,
                fontWeight: '700',
                color: colors.ink.DEFAULT,
              }}
            >
              {item.name}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
