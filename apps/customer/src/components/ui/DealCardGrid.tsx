import { View, Text, Pressable, Image } from 'react-native';
import { colors } from '../../theme/colors';

export interface DealCardItem {
  slug: string;
  name: string;
  imageUrl: string | null;
  pricePaise: number;
  mrpPaise?: number | undefined;
  discountLabel?: string | undefined;
}

interface DealCardGridProps {
  items: DealCardItem[];
  onPress: (slug: string) => void;
  paddingHorizontal?: number | undefined;
}

/**
 * Myntra "MEGA DEAL DROP" 2-col grid — large photo cards with a discount chip,
 * a bottom gradient, and title + price/MRP. The home deal block.
 */
export function DealCardGrid({ items, onPress, paddingHorizontal = 16 }: DealCardGridProps) {
  const rows: DealCardItem[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));

  return (
    <View style={{ paddingHorizontal }}>
      {rows.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', marginTop: i === 0 ? 0 : 12, gap: 12 }}>
          {row.map((item) => (
            <Pressable
              key={item.slug}
              onPress={() => onPress(item.slug)}
              style={{
                flex: 1,
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: colors.brand[100],
              }}
            >
              <View style={{ width: '100%', aspectRatio: 1.15 }}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                    resizeMode="cover"
                  />
                ) : null}
                {/* single bottom gradient for text contrast */}
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: '55%',
                    backgroundColor: 'rgba(15,9,24,0.45)',
                  }}
                />
                {item.discountLabel ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 10,
                      left: 10,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                      backgroundColor: colors.accent.DEFAULT,
                    }}
                  >
                    <Text
                      style={{
                        color: '#FFFFFF',
                        fontSize: 10,
                        fontWeight: '900',
                        letterSpacing: 0.3,
                      }}
                    >
                      {item.discountLabel}
                    </Text>
                  </View>
                ) : null}
                <View style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
                  <Text
                    numberOfLines={2}
                    style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 18 }}
                  >
                    {item.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>
                      ₹{Math.round(item.pricePaise / 100)}
                    </Text>
                    {item.mrpPaise && item.mrpPaise > item.pricePaise ? (
                      <Text
                        style={{
                          marginLeft: 6,
                          color: 'rgba(255,255,255,0.7)',
                          fontSize: 11,
                          textDecorationLine: 'line-through',
                        }}
                      >
                        ₹{Math.round(item.mrpPaise / 100)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </Pressable>
          ))}
          {row.length < 2 ? <View style={{ flex: 1 }} /> : null}
        </View>
      ))}
    </View>
  );
}
