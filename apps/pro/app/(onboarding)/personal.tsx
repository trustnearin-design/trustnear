import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useMyProfile } from '../../src/api/me';
import { useSavePersonalInfo, type PersonalInfoInput } from '../../src/api/onboarding';
import { colors } from '../../src/theme/colors';

/**
 * Step 1 — Personal info. Captures full name, gender, DOB, languages,
 * residence address. Pre-fills from existing profile if any saved earlier
 * (so a returning pro doesn't re-type).
 */

type Gender = PersonalInfoInput['gender'];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const LANGUAGES: { code: string; label: string }[] = [
  { code: 'hi', label: 'Hindi' },
  { code: 'en', label: 'English' },
  { code: 'mr', label: 'Marathi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'pa', label: 'Punjabi' },
];

export default function PersonalScreen() {
  const router = useRouter();
  const profile = useMyProfile();
  const save = useSavePersonalInfo();

  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [languages, setLanguages] = useState<string[]>(['hi']);
  const [address, setAddress] = useState('');

  // Pre-fill from existing profile once it loads
  useEffect(() => {
    if (!profile.data) return;
    if (profile.data.user.fullName) setFullName(profile.data.user.fullName);
  }, [profile.data]);

  const dobIsValid = /^\d{4}-\d{2}-\d{2}$/.test(dob) && isAtLeast18(dob);
  const canContinue =
    fullName.trim().length >= 2 &&
    gender !== null &&
    dobIsValid &&
    languages.length >= 1 &&
    address.trim().length >= 10;

  const toggleLang = (code: string) => {
    setLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : prev.length < 8
          ? [...prev, code]
          : prev,
    );
  };

  const onContinue = () => {
    if (!canContinue || !gender) return;
    save.mutate(
      {
        fullName: fullName.trim(),
        gender,
        dob,
        languagesSpoken: languages,
        currentAddress: address.trim(),
      },
      {
        onSuccess: () => router.push('/(onboarding)/photo' as never),
        onError: (e: Error) => Alert.alert('Save failed', e.message),
      },
    );
  };

  return (
    <WizardLayout
      stepIndex={1}
      stepTotal={8}
      title="Personal details"
      subtitle="Aapke baare mein basic info — customers ye dekhenge."
      mascotVariant="personal"
      ctaLabel="Continue"
      onCta={onContinue}
      ctaDisabled={!canContinue}
      ctaLoading={save.isPending}
      canGoBack={false}
    >
      {/* Full Name */}
      <Field label="Full Name" required>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Aapka pura naam"
          placeholderTextColor={colors.ink.subtle}
          style={inputStyle()}
          autoCapitalize="words"
          maxLength={100}
        />
      </Field>

      {/* Gender */}
      <Field label="Gender" required>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GENDER_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setGender(opt.value)}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: gender === opt.value ? colors.brand[700] : colors.border.DEFAULT,
                backgroundColor: gender === opt.value ? colors.brand[50] : colors.surface.DEFAULT,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: gender === opt.value ? colors.brand[800] : colors.ink.muted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Field>

      {/* DOB */}
      <Field
        label="Date of birth"
        required
        helper="Format: YYYY-MM-DD (e.g. 1995-08-22). Must be 18+."
        error={dob.length > 0 && !dobIsValid ? 'Invalid date or under 18' : null}
      >
        <TextInput
          value={dob}
          onChangeText={setDob}
          placeholder="1995-08-22"
          placeholderTextColor={colors.ink.subtle}
          style={inputStyle()}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          autoCorrect={false}
        />
      </Field>

      {/* Languages */}
      <Field label="Languages spoken" required helper="Choose all that apply (min 1, max 8).">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {LANGUAGES.map((lang) => {
            const selected = languages.includes(lang.code);
            return (
              <Pressable
                key={lang.code}
                onPress={() => toggleLang(lang.code)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.brand[700] : colors.border.DEFAULT,
                  backgroundColor: selected ? colors.brand[700] : colors.surface.DEFAULT,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {selected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: selected ? '#fff' : colors.ink.muted,
                  }}
                >
                  {lang.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {/* Address */}
      <Field
        label="Current address"
        required
        helper="Where do you currently live? Min 10 characters."
      >
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="House no., street, area, city"
          placeholderTextColor={colors.ink.subtle}
          style={[inputStyle(), { minHeight: 88, textAlignVertical: 'top' }]}
          multiline
          maxLength={500}
        />
      </Field>
    </WizardLayout>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

function isAtLeast18(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

function Field({
  label,
  required,
  helper,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: colors.ink.DEFAULT,
          marginBottom: 8,
        }}
      >
        {label} {required ? <Text style={{ color: colors.danger }}>*</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={{ fontSize: 12, color: colors.danger, marginTop: 6 }}>{error}</Text>
      ) : helper ? (
        <Text style={{ fontSize: 12, color: colors.ink.subtle, marginTop: 6 }}>{helper}</Text>
      ) : null}
    </View>
  );
}

function inputStyle() {
  return {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink.DEFAULT,
  };
}
