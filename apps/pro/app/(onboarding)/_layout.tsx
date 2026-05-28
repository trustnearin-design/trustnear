import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { useOnboardingStatus } from '../../src/api/onboarding';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../src/theme/colors';

/**
 * Onboarding wizard route group (Phase 3g). All screens inside this
 * group are gated by:
 *   1. isAuthed — must be logged in
 *   2. approvalStatus IS draft / rejected — anyone else gets redirected
 *
 * The root layout's useAuthRouteGuard already handles routing between
 * groups, so by the time we land here we should usually be a draft or
 * rejected pro. This layout is the second safety net + handles the
 * loading state cleanly.
 */
export default function OnboardingLayout() {
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
  if (status === 'approved') return <Redirect href="/(app)" />;
  if (status === 'submitted_for_review') return <Redirect href="/(pending)" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="personal" />
      <Stack.Screen name="photo" />
      <Stack.Screen name="services" />
      <Stack.Screen name="area" />
      <Stack.Screen name="schedule" />
      <Stack.Screen name="aadhaar" />
      <Stack.Screen name="pan" />
      <Stack.Screen name="bank" />
      <Stack.Screen name="review" />
    </Stack>
  );
}
