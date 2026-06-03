import { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CoralButton } from '../../../src/components/ui/CoralButton';
import { KeyboardAwareScrollView } from '../../../src/components/ui/KeyboardAwareScrollView';
import { EditHeader, EditFooter } from '../../../src/components/edit/EditChrome';
import { useMyProfile, useSaveProfileDetails } from '../../../src/api/me';
import { colors } from '../../../src/theme/colors';

/**
 * Post-approval editor — "About you": professional title, bio, and years of
 * experience. Saves via PATCH /pros/me/profile with no re-review. KYC,
 * services, area + schedule each have their own editors.
 */

const EXPERIENCE_PRESETS = [0, 1, 2, 5, 10, 15];

export default function EditDetailsScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const save = useSaveProfileDetails();

  const initial = useMemo(
    () => ({
      title: profile.data?.professionalTitle ?? '',
      bio: profile.data?.bio ?? '',
      years: profile.data?.yearsExperience ?? 0,
    }),
    [profile.data],
  );

  const [title, setTitle] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [years, setYears] = useState<number | null>(null);

  const titleVal = title ?? initial.title;
  const bioVal = bio ?? initial.bio;
  const yearsVal = years ?? initial.years;

  const canSave = titleVal.trim().length >= 2 && !save.isPending;

  const onSave = () => {
    if (!canSave) return;
    save.mutate(
      {
        professionalTitle: titleVal.trim(),
        bio: bioVal.trim(),
        yearsExperience: yearsVal,
      },
      {
        onSuccess: () => {
          void profile.refetch();
          router.back();
        },
        onError: (e: Error) => Alert.alert('Save failed', e.message),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface.muted }}>
      <EditHeader title="About you" onBack={() => router.back()} />

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 160 }}
      >
        <Text style={labelStyle}>PROFESSIONAL TITLE</Text>
        <TextInput
          value={titleVal}
          onChangeText={setTitle}
          placeholder="e.g. Senior AC & Appliance Technician"
          placeholderTextColor={colors.ink.subtle}
          maxLength={80}
          style={inputStyle}
        />
        <Text style={hintStyle}>Yeh customer ko aapke naam ke neeche dikhega.</Text>

        <Text style={[labelStyle, { marginTop: 22 }]}>ABOUT / BIO</Text>
        <TextInput
          value={bioVal}
          onChangeText={setBio}
          placeholder="Apne kaam, experience aur specialities ke baare mein 1-2 lines likhein."
          placeholderTextColor={colors.ink.subtle}
          multiline
          maxLength={600}
          style={[inputStyle, { minHeight: 110, textAlignVertical: 'top' }]}
        />
        <Text style={hintStyle}>{bioVal.length}/600</Text>

        <Text style={[labelStyle, { marginTop: 22 }]}>YEARS OF EXPERIENCE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {EXPERIENCE_PRESETS.map((y) => {
            const selected = y === yearsVal;
            return (
              <Pressable
                key={y}
                onPress={() => setYears(y)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.brand[700] : colors.border.DEFAULT,
                  backgroundColor: selected ? colors.brand[700] : colors.surface.DEFAULT,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: selected ? '#fff' : colors.ink.DEFAULT,
                  }}
                >
                  {y === 0 ? 'New' : `${y}+ yr`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View
          style={{
            marginTop: 24,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 8,
            padding: 12,
            borderRadius: 12,
            backgroundColor: colors.brand[50],
          }}
        >
          <Ionicons name="shield-checkmark" size={16} color={colors.brand[700]} />
          <Text style={{ flex: 1, fontSize: 12, color: colors.ink.muted }}>
            Title, bio aur experience kabhi bhi badal sakte hain — koi dobara verification nahi
            hoti. KYC documents alag se manage hote hain.
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <EditFooter>
        <CoralButton
          label="Save changes"
          onPress={onSave}
          disabled={!canSave}
          loading={save.isPending}
        />
      </EditFooter>
    </View>
  );
}

const labelStyle = {
  fontSize: 12,
  fontWeight: '700' as const,
  color: colors.ink.muted,
  marginBottom: 8,
  letterSpacing: 0.4,
};
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
const hintStyle = {
  fontSize: 11,
  color: colors.ink.subtle,
  marginTop: 6,
};
