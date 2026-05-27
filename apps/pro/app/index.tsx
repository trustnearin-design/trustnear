import { Redirect } from 'expo-router';

export default function Index() {
  // Bootstrap completed in _layout.tsx — useAuthRouteGuard will correct
  // the destination based on isAuthed. This redirect is just the initial
  // landing while that effect runs.
  return <Redirect href="/(auth)/phone" />;
}
