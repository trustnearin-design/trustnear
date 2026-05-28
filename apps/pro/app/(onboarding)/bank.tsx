import { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { WizardLayout } from '../../src/components/wizard/WizardLayout';
import { useKycStatus, useVerifyBank } from '../../src/api/kyc';
import { colors } from '../../src/theme/colors';

const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function BankWizardScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const status = useKycStatus();
  const verify = useVerifyBank();
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  const verified = status.data?.bankVerified ?? false;
  const accountValid = /^\d{9,18}$/.test(account);
  const ifscValid = IFSC_REGEX.test(ifsc);

  const onSubmit = async () => {
    if (verified) {
      router.push('/(onboarding)/review' as never);
      return;
    }
    if (!accountValid || !ifscValid) {
      Alert.alert('Invalid input', 'Check account number and IFSC');
      return;
    }
    try {
      await verify.mutateAsync({ accountNumber: account, ifsc });
      void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
      router.push('/(onboarding)/review' as never);
    } catch (e: unknown) {
      Alert.alert('Verification failed', (e as Error).message);
    }
  };

  return (
    <WizardLayout
      stepIndex={8}
      stepTotal={8}
      title="Bank account"
      subtitle="Yahin par aapko har booking ka payout milega. Bank verify zaroori hai daily payouts ke liye."
      mascotVariant="kyc"
      ctaLabel={verified ? 'Continue' : 'Verify bank'}
      onCta={onSubmit}
      ctaDisabled={!verified && (!accountValid || !ifscValid)}
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
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <Text style={{ fontSize: 16, fontWeight: '800' }}>Bank Verified</Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.ink.muted }}>
            Account:{' '}
            <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
              ****{status.data.bankAccountLastFour}
            </Text>
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink.muted, marginTop: 4 }}>
            IFSC:{' '}
            <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
              {status.data.ifscCode}
            </Text>
          </Text>
          <Text style={{ fontSize: 13, color: colors.ink.muted, marginTop: 4 }}>
            Name:{' '}
            <Text style={{ fontWeight: '700', color: colors.ink.DEFAULT }}>
              {status.data.bankAccountHolderName}
            </Text>
          </Text>
        </View>
      ) : (
        <>
          <Field label="Account number">
            <TextInput
              value={account}
              onChangeText={(t) => setAccount(t.replace(/[^0-9]/g, ''))}
              placeholder="9-18 digits"
              placeholderTextColor={colors.ink.subtle}
              style={inputStyle(account.length > 0 && !accountValid)}
              keyboardType="number-pad"
              maxLength={18}
            />
          </Field>
          <Field label="IFSC code">
            <TextInput
              value={ifsc}
              onChangeText={(t) => setIfsc(t.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="e.g. HDFC0001234"
              placeholderTextColor={colors.ink.subtle}
              style={inputStyle(ifsc.length > 0 && !ifscValid)}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
            />
          </Field>
          <View
            style={{
              padding: 12,
              backgroundColor: colors.support[50],
              borderRadius: 12,
              flexDirection: 'row',
              gap: 8,
            }}
          >
            <Ionicons name="information-circle" size={18} color={colors.support[700]} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.support[700], lineHeight: 18 }}>
              Account holder ka naam aapke Aadhaar/PAN naam se match hona chahiye.
            </Text>
          </View>
        </>
      )}
    </WizardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.ink.DEFAULT, marginBottom: 8 }}>
        {label} <Text style={{ color: colors.danger }}>*</Text>
      </Text>
      {children}
    </View>
  );
}

function inputStyle(invalid: boolean) {
  return {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: invalid ? colors.danger : colors.border.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.ink.DEFAULT,
  };
}
