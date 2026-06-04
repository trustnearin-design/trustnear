import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMe, useUpdateProfile, type UpdateProfileInput } from '../../src/api/profile';
import { Avatar } from '../../src/components/Avatar';
import { colors } from '../../src/theme/colors';
import { CoralButton, KeyboardAwareScrollView } from '../../src/components/ui';

/**
 * Customer self-edit profile. Name / email / city / area are editable; phone
 * is the OTP-verified identity (read-only). Saves via PATCH /users/me and
 * syncs the auth store so the change shows immediately across the app.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const update = useUpdateProfile();

  const initial = useMemo(
    () => ({
      fullName: me.data?.fullName ?? '',
      email: me.data?.email ?? '',
      city: me.data?.city ?? '',
      area: me.data?.area ?? '',
    }),
    [me.data],
  );

  const [fullName, setFullName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);

  const v = {
    fullName: fullName ?? initial.fullName,
    email: email ?? initial.email,
    city: city ?? initial.city,
    area: area ?? initial.area,
  };

  const canSave = v.fullName.trim().length >= 2 && !update.isPending;

  const onSave = () => {
    if (!canSave) return;
    // Send only changed, non-empty fields. Empty optional fields are skipped
    // (the API treats "absent" as "leave unchanged").
    const patch: UpdateProfileInput = {};
    if (v.fullName.trim() !== initial.fullName) patch.fullName = v.fullName.trim();
    if (v.email.trim() && v.email.trim() !== initial.email) patch.email = v.email.trim();
    if (v.city.trim() && v.city.trim() !== initial.city) patch.city = v.city.trim();
    if (v.area.trim() && v.area.trim() !== initial.area) patch.area = v.area.trim();

    if (Object.keys(patch).length === 0) {
      router.back();
      return;
    }
    update.mutate(patch, {
      onSuccess: () => router.back(),
      onError: (e: Error) => Alert.alert('Save failed', e.message),
    });
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <SafeAreaView edges={['top']} className="bg-surface">
        <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            className="h-9 w-9 items-center justify-center rounded-full bg-surface-muted"
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink.DEFAULT} />
          </Pressable>
          <Text className="text-[17px] font-bold text-ink">Edit profile</Text>
        </View>
      </SafeAreaView>

      {me.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand.DEFAULT} />
        </View>
      ) : (
        <KeyboardAwareScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
          <View className="items-center">
            <Avatar
              fullName={v.fullName || 'You'}
              photoUrl={me.data?.profilePhoto ?? undefined}
              size={84}
            />
            <Text className="mt-2 text-[12px] text-ink-subtle">
              {me.data?.phone ? me.data.phone : ''}
            </Text>
          </View>

          <Field label="FULL NAME">
            <TextInput
              value={v.fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={colors.ink.subtle}
              autoCapitalize="words"
              style={inputStyle}
            />
          </Field>

          <Field label="EMAIL (optional)">
            <TextInput
              value={v.email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.ink.subtle}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={inputStyle}
            />
          </Field>

          <Field label="CITY (optional)">
            <TextInput
              value={v.city}
              onChangeText={setCity}
              placeholder="e.g. Jaipur"
              placeholderTextColor={colors.ink.subtle}
              autoCapitalize="words"
              style={inputStyle}
            />
          </Field>

          <Field label="AREA / LOCALITY (optional)">
            <TextInput
              value={v.area}
              onChangeText={setArea}
              placeholder="e.g. Malviya Nagar"
              placeholderTextColor={colors.ink.subtle}
              autoCapitalize="words"
              style={inputStyle}
            />
          </Field>

          <View className="mt-4 flex-row items-start gap-2 rounded-card bg-surface p-3">
            <Ionicons name="lock-closed" size={15} color={colors.ink.subtle} />
            <Text className="flex-1 text-[12px] text-ink-muted">
              Aapka mobile number verified identity hai — usse change karne ke liye support se baat
              karein.
            </Text>
          </View>
        </KeyboardAwareScrollView>
      )}

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-border bg-surface px-5 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16) }}
      >
        <CoralButton
          label="Save changes"
          onPress={onSave}
          disabled={!canSave}
          loading={update.isPending}
        />
      </View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-[12px] font-bold tracking-[0.4px] text-ink-muted">{label}</Text>
      {children}
    </View>
  );
}

const inputStyle = {
  backgroundColor: colors.surface.DEFAULT,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: colors.border.DEFAULT,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: colors.ink.DEFAULT,
};
