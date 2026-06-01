import type { ReactNode } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';

/** Shared chrome for the post-approval profile editors (services / schedule). */

export function EditHeader({ title, onBack }: { title: string; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.surface.DEFAULT,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.DEFAULT,
      }}
    >
      <Pressable
        onPress={onBack}
        hitSlop={12}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.subtle,
        }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.ink.DEFAULT} />
      </Pressable>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink.DEFAULT }}>{title}</Text>
    </View>
  );
}

export function EditFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: insets.bottom + 16,
        paddingTop: 16,
        backgroundColor: colors.surface.DEFAULT,
        borderTopWidth: 1,
        borderTopColor: colors.border.DEFAULT,
      }}
    >
      {children}
    </View>
  );
}
