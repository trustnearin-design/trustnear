import { ScrollView, Pressable, View, Text } from 'react-native';
import { colors } from '../../theme/colors';

export interface ParentTabItem {
  slug: string;
  name: string;
}

interface ParentTabsBarProps {
  items: ParentTabItem[];
  /** Selected parent slug, or null for the "All" tab. */
  selected: string | null;
  onSelect: (slug: string | null) => void;
}

/**
 * Myntra-style top tab strip (ALL / MEN / WOMEN …). Here: "All" + each
 * parent category. Active tab = coral text with an underline indicator.
 *
 * This is the element pinned via `stickyHeaderIndices` on the home screen,
 * so it stays visible while the feed scrolls. Keep it thin + opaque
 * (surface.muted background) so scrolled content never bleeds through.
 */
export function ParentTabsBar({ items, selected, onSelect }: ParentTabsBarProps) {
  const tabs: ParentTabItem[] = [{ slug: '__all__', name: 'All' }, ...items];

  return (
    <View
      style={{
        backgroundColor: colors.surface.muted,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.DEFAULT,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 4 }}
      >
        {tabs.map((tab) => {
          const isAll = tab.slug === '__all__';
          const active = isAll ? selected === null : selected === tab.slug;
          return (
            <Pressable
              key={tab.slug}
              onPress={() => onSelect(isAll ? null : tab.slug)}
              style={{ paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text
                style={{
                  fontSize: 13.5,
                  fontWeight: active ? '800' : '600',
                  letterSpacing: 0.2,
                  color: active ? colors.accent[700] : colors.ink.muted,
                  textTransform: 'uppercase',
                }}
              >
                {tab.name}
              </Text>
              <View
                style={{
                  marginTop: 6,
                  height: 3,
                  width: active ? '100%' : 0,
                  borderRadius: 2,
                  backgroundColor: colors.accent.DEFAULT,
                }}
              />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
