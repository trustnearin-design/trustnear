import { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useKycStatus, useVerifyPan } from '../../src/api/kyc';
import { colors } from '../../src/theme/colors';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function PanWizardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const status = useKycStatus();
  const verify = useVerifyPan();
  const [pan, setPan] = useState('');

  const verified = status.data?.panVerified ?? false;
  const isValid = PAN_REGEX.test(pan);

  const onSubmit = async () => {
    if (verified) {
      router.push('/(onboarding)/bank' as never);
      return;
    }
    if (!isValid) {
      Alert.alert('Invalid PAN', 'PAN must be 5 letters + 4 digits + 1 letter, e.g. ABCDE1234F');
      return;
    }
    try {
      await verify.mutateAsync(pan);
      void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
      router.push('/(onboarding)/bank' as never);
    } catch (e: unknown) {
      Alert.alert('Verification failed', (e as Error).message);
    }
  };

  return (
    <WizardLayout
      stepIndex={7}
      stepTotal={8}
      title="PAN verification"
      subtitle="Income Tax department se directly verify. PAN aapke Aadhaar naam se match hona chahiye."
      mascotVariant="kyc"
      ctaLabel={verified ? 'Continue' : 'Verify PAN'}
      onCta={onSubmit}
      ctaDisabled={!verified && !isValid}
      ctaLoading={verify.isPending}
    >
      {verified && status.data ? (
        <View
          style={{
            padding: 18,
            backgroundColor: colors.brand[50],
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: colors.success,
            marginBottom: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <Text style={{ fontSize: 16, fontWeight: '800' }}>PAN Verified</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.ink.muted }}>
            PAN:{' '}
            <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
              {status.data.panNumber}
            </Text>
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink.muted, marginTop: 4 }}>
            Name on PAN:{' '}
            <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
              {status.data.panFullName}
            </Text>
          </Text>
        </View>
      ) : (
        <>
          <Text
            style={{ fontSize: 13, fontWeight: '700', color: colors.ink.DEFAULT, marginBottom: 8 }}
          >
            PAN number
          </Text>
          <TextInput
            value={pan}
            onChangeText={(t) => setPan(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="ABCDE1234F"
            placeholderTextColor={colors.ink.subtle}
            style={{
              backgroundColor: colors.surface.DEFAULT,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: pan.length > 0 && !isValid ? colors.danger : colors.border.DEFAULT,
              paddingHorizontal: 14,
              paddingVertical: 14,
              fontSize: 17,
              fontWeight: '700',
              letterSpacing: 1,
              color: colors.ink.DEFAULT,
            }}
            maxLength={10}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={{ fontSize: 12, color: colors.ink.subtle, marginTop: 6 }}>
            Format: 5 letters + 4 digits + 1 letter
          </Text>
        </>
      )}
    </WizardLayout>
  );
}
