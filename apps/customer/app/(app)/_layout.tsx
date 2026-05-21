import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';

export default function AppStackLayout() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  if (!isAuthed) return <Redirect href="/(auth)/phone" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="category/[slug]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="pro/[id]" options={{ headerShown: true, title: '' }} />
    </Stack>
  );
}
