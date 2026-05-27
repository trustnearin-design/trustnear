import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useKycStatus, useVerifyBank } from '../../../src/api/kyc';
import { PremiumButton } from '../../../src/components/PremiumButton';
import { colors } from '../../../src/theme/colors';
import { ApiCallError } from '../../../src/api/client';

const ACCOUNT_REGEX = /^\d{9,18}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export default function BankKycScreen() {
  const router = useRouter();
  const status = useKycStatus();
  const verify = useVerifyBank();
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');

  const verified = status.data?.bankVerified ?? false;
  const valid = ACCOUNT_REGEX.test(account) && IFSC_REGEX.test(ifsc);

  const onSubmit = async () => {
    if (!valid) return;
    try {
      const res = await verify.mutateAsync({ accountNumber: account, ifsc });
      Alert.alert(
        'Bank account verified',
        `${res.bankName ? `${res.bankName} · ` : ''}XXXXXX${res.accountLastFour}${
          res.holderName ? `\nHolder: ${res.holderName}` : ''
        }`,
        [{ text: 'Done', onPress: () => router.replace('/(app)/kyc') }],
      );
    } catch (e) {
      Alert.alert(
        'Verification failed',
        e instanceof ApiCallError ? e.message : 'Try again in a moment.',
      );
    }
  };

  return (
    <View className="flex-1 bg-surface-muted">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />

      <View className="bg-brand-800" style={{ paddingBottom: 32 }}>
        <SafeAreaView edges={['top']}>
          <View className="flex-row items-center px-5 pt-2">
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </Pressable>
            <Text
              className="ml-3 text-[11px] font-bold uppercase tracking-[2px]"
              style={{ color: colors.accent[200] }}
            >
              Bank verification
            </Text>
          </View>
          <View className="px-5 pt-5">
            <Text className="text-[26px] font-bold text-ink-inverse">
              {verified ? 'Bank linked' : 'Add your bank'}
            </Text>
            <Text className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              Where your weekly TrustNear payouts will land
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 }}
      >
        {verified ? (
          <View className="rounded-card border border-success/30 bg-success/5 p-5">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text className="ml-2 text-[15px] font-bold text-success">Bank verified</Text>
            </View>
            {status.data?.bankAccountLastFour ? (
              <Text className="mt-2 text-[13px] text-ink">
                Account: XXXXXX{status.data.bankAccountLastFour}
              </Text>
            ) : null}
            {status.data?.ifscCode ? (
              <Text className="mt-1 text-[13px] text-ink">IFSC: {status.data.ifscCode}</Text>
            ) : null}
            {status.data?.bankAccountHolderName ? (
              <Text className="mt-1 text-[13px] text-ink">
                Holder: {status.data.bankAccountHolderName}
              </Text>
            ) : null}
          </View>
        ) : (
          <>
            <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-subtle">
              Account number
            </Text>
            <TextInput
              value={account}
              onChangeText={(v) => setAccount(v.replace(/\D/g, '').slice(0, 18))}
              placeholder="12345678901234"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={18}
              className="rounded-card border border-border bg-surface px-4 py-4 text-[16px] font-semibold text-ink"
            />

            <Text className="mb-2 mt-5 text-[12px] font-bold uppercase tracking-wider text-ink-subtle">
              IFSC code
            </Text>
            <TextInput
              value={ifsc}
              onChangeText={(v) => setIfsc(v.replace(/\s+/g, '').toUpperCase().slice(0, 11))}
              placeholder="HDFC0000001"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={11}
              className="rounded-card border border-border bg-surface px-4 py-4 text-[16px] font-semibold text-ink"
            />
            <Text className="mt-2 text-[11px] text-ink-subtle">
              Account must be in your own name. We verify via instant penny-less check (no money is
              debited). Must match the name on your TrustNear profile.
            </Text>

            <View className="mt-8">
              <PremiumButton
                label={verify.isPending ? 'Verifying…' : 'Verify bank account'}
                onPress={() => void onSubmit()}
                loading={verify.isPending}
                disabled={!valid}
                variant="brand"
                icon="shield-checkmark"
              />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
