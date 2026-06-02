import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { useOnboardingStatus } from '../../src/api/onboarding';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../src/theme/colors';

/**
 * Pending-review locked group (Phase 3g). A pro lands here right after
 * pressing Submit; nothing in here lets them edit data. Auto-redirects
 * out the moment admin flips status to approved (or back to rejected).
 */
export default function PendingLayout() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const onboarding = useOnboardingStatus();

  if (!isAuthed) return <Redirect href="/(auth)/phone" />;

  if (onboarding.isLoading && !onboarding.data) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surface.muted,
        }}
      >
        <ActivityIndicator color={colors.brand[700]} />
      </View>
    );
  }

  const status = onboarding.data?.approvalStatus;
  // NOTE: approved → don't redirect immediately. The index screen detects
  // the transition and plays a celebration interlude before pushing to
  // (app). This avoids a jarring instant cut when the admin approves.
  if (status && status !== 'submitted_for_review' && status !== 'approved')
    return <Redirect href="/(onboarding)/welcome" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
