import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '../../theme/colors';

export interface CircleLabelItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Optional tiny caption under the name, e.g. "from ₹199" or "7 services". */
  caption?: string | undefined;
}

interface CircleLabelGridProps {
  items: CircleLabelItem[];
  onPress: (slug: string) => void;
  /** Columns. Default 3 (Myntra "In the Spotlight"). */
  columns?: number | undefined;
  paddingHorizontal?: number | undefined;
}

/**
 * Myntra "In the Spotlight" grid — circular photo + label (+ optional caption)
 * laid out in a clean N-column grid. Labels always show (2 lines), never
 * truncated to a cramped circle. Used on the Categories spotlight pane and
 * the home "Explore all" block.
 */
export function CircleLabelGrid({
  items,
  onPress,
  columns = 3,
  paddingHorizontal = 16,
}: CircleLabelGridProps) {
  return (
    <View
      style={{
        paddingHorizontal,
        flexDirection: 'row',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item) => (
        <Pressable
          key={item.slug}
          onPress={() => onPress(item.slug)}
          style={{
            width: `${100 / columns}%`,
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 4,
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              overflow: 'hidden',
              backgroundColor: colors.brand[100],
              borderWidth: 1,
              borderColor: colors.border.DEFAULT,
            }}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : null}
          </View>
          <Text
            numberOfLines={2}
            style={{
              marginTop: 7,
              fontSize: 11.5,
              lineHeight: 14,
              fontWeight: '700',
              textAlign: 'center',
              color: colors.ink.DEFAULT,
            }}
          >
            {item.name}
          </Text>
          {item.caption ? (
            <Text
              numberOfLines={1}
              style={{ marginTop: 1, fontSize: 10, fontWeight: '700', color: colors.accent[600] }}
            >
              {item.caption}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
