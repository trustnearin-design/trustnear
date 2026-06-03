import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { NotificationGate } from '../../src/components/NotificationGate';

export default function AppStackLayout() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  if (!isAuthed) return <Redirect href="/(auth)/phone" />;

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="job/[id]" />
        {/* KYC screens remain accessible AFTER approval (e.g. bank update) */}
        <Stack.Screen name="kyc/index" />
        <Stack.Screen name="kyc/aadhaar" />
        <Stack.Screen name="kyc/pan" />
        <Stack.Screen name="kyc/bank" />
        {/* Post-approval profile editors — services / schedule / location / details */}
        <Stack.Screen name="edit/services" />
        <Stack.Screen name="edit/schedule" />
      </Stack>
      <NotificationGate />
    </>
  );
}
