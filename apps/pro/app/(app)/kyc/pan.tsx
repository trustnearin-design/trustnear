import { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useKycStatus, useVerifyPan } from '../../../src/api/kyc';
import { PremiumButton } from '../../../src/components/PremiumButton';
import { colors } from '../../../src/theme/colors';
import { ApiCallError } from '../../../src/api/client';

const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;

export default function PanKycScreen() {
  const router = useRouter();
  const status = useKycStatus();
  const verify = useVerifyPan();
  const [pan, setPan] = useState('');

  const verified = status.data?.panVerified ?? false;
  const valid = PAN_REGEX.test(pan);

  const onSubmit = async () => {
    if (!valid) return;
    try {
      const res = await verify.mutateAsync(pan);
      Alert.alert(
        'PAN verified',
        `Linked to ${res.fullName ?? 'your name'}. Tax compliance is set up.`,
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
              PAN verification
            </Text>
          </View>
          <View className="px-5 pt-5">
            <Text className="text-[26px] font-bold text-ink-inverse">
              {verified ? 'PAN linked' : 'Add your PAN'}
            </Text>
            <Text className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.78)' }}>
              For tax compliance + payout TDS settlement
            </Text>
          </View>
        </SafeAreaView>
      </View>

      <View className="flex-1 px-5 pt-6">
        {verified ? (
          <View className="rounded-card border border-success/30 bg-success/5 p-5">
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
              <Text className="ml-2 text-[15px] font-bold text-success">PAN verified</Text>
            </View>
            <Text className="mt-2 text-[13px] text-ink">PAN: {status.data?.panNumber}</Text>
            {status.data?.panFullName ? (
              <Text className="mt-1 text-[13px] text-ink">Name: {status.data.panFullName}</Text>
            ) : null}
          </View>
        ) : (
          <>
            <Text className="mb-2 text-[12px] font-bold uppercase tracking-wider text-ink-subtle">
              PAN number
            </Text>
            <TextInput
              value={pan}
              onChangeText={(v) => setPan(v.replace(/\s+/g, '').toUpperCase().slice(0, 10))}
              placeholder="ABCDE1234F"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              className="rounded-card border border-border bg-surface px-4 py-4 text-[18px] font-bold tracking-[2px] text-ink"
            />
            <Text className="mt-2 text-[11px] text-ink-subtle">
              Must match the name you signed up with. Use the name printed on your PAN card.
            </Text>

            <View className="mt-auto mb-6">
              <PremiumButton
                label={verify.isPending ? 'Verifying with NSDL…' : 'Verify PAN'}
                onPress={() => void onSubmit()}
                loading={verify.isPending}
                disabled={!valid}
                variant="brand"
                icon="shield-checkmark"
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
}
