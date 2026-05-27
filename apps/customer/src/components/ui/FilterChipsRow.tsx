import { ScrollView, Pressable, Text, View } from 'react-native';
import { colors } from '../../theme/colors';

export interface FilterChip {
  /** Stable key — also passed back via `onSelect`. */
  key: string;
  label: string;
  /** Optional count suffix shown after label, e.g. "Cleaning (12)". */
  count?: number;
}

interface FilterChipsRowProps {
  chips: FilterChip[];
  /** Currently selected chip key. Pass `null` for "All" / no selection. */
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  /** Show an "All" chip at the start (selectedKey === null). Default true. */
  includeAll?: boolean;
  /** Padding applied to ScrollView contentContainer left/right. Default 20. */
  edgePadding?: number;
}

/**
 * D6 horizontal filter chips — pill-shaped row with active fill in coral.
 * Pattern source: YesMadam / Urban Company category filter rows.
 *
 * Active chip = solid coral background + white text. Inactive = white card
 * with thin border. Tap toggles selection (tap-again on active = clear).
 */
export function FilterChipsRow({
  chips,
  selectedKey,
  onSelect,
  includeAll = true,
  edgePadding = 20,
}: FilterChipsRowProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: edgePadding, gap: 8 }}
    >
      {includeAll ? (
        <Chip label="All" active={selectedKey === null} onPress={() => onSelect(null)} />
      ) : null}
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.count != null ? `${chip.label} (${chip.count})` : chip.label}
          active={selectedKey === chip.key}
          onPress={() => onSelect(chip.key === selectedKey ? null : chip.key)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: active ? colors.accent.DEFAULT : colors.surface.DEFAULT,
        borderWidth: 1.5,
        borderColor: active ? colors.accent.DEFAULT : colors.border.DEFAULT,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: active ? '#FFFFFF' : colors.ink.DEFAULT,
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
