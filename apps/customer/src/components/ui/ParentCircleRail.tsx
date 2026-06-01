import { ScrollView, Pressable, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

export interface ParentCircleItem {
  slug: string;
  name: string;
  heroImageUrl: string | null;
}

interface ParentCircleRailProps {
  items: ParentCircleItem[];
  /** Currently selected parent slug, or null for the "All" feed. */
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

/**
 * Myntra circular category rail (Fashion / Beauty / Footwear circles), with a
 * leading "All" tile. Active item gets a coral ring + bold coral label.
 * Controlled by the same `selected` state as ParentTabsBar.
 */
export function ParentCircleRail({ items, selected, onSelect }: ParentCircleRailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 2, gap: 12 }}
    >
      {/* Leading "All" */}
      <Circle
        active={selected === null}
        label="All"
        onPress={() => onSelect(null)}
        renderInner={(active) => (
          <View
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.accent.DEFAULT : colors.brand[50],
            }}
          >
            <Ionicons name="apps" size={26} color={active ? '#FFFFFF' : colors.brand[600]} />
          </View>
        )}
      />

      {items.map((item) => (
        <Circle
          key={item.slug}
          active={selected === item.slug}
          label={item.name}
          onPress={() => onSelect(selected === item.slug ? null : item.slug)}
          renderInner={() =>
            item.heroImageUrl ? (
              <Image
                source={{ uri: item.heroImageUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View style={{ width: '100%', height: '100%', backgroundColor: colors.brand[200] }} />
            )
          }
        />
      ))}
    </ScrollView>
  );
}

function Circle({
  active,
  label,
  onPress,
  renderInner,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  renderInner: (active: boolean) => React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={{ width: 66, alignItems: 'center' }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          padding: active ? 2.5 : 0,
          borderWidth: active ? 2.5 : 0,
          borderColor: colors.accent.DEFAULT,
        }}
      >
        <View
          style={{
            flex: 1,
            borderRadius: 30,
            overflow: 'hidden',
            backgroundColor: colors.brand[100],
          }}
        >
          {renderInner(active)}
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={{
          marginTop: 6,
          maxWidth: 66,
          fontSize: 10.5,
          fontWeight: active ? '800' : '600',
          color: active ? colors.accent[700] : colors.ink.muted,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
