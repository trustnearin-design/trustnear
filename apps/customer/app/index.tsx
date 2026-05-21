import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth';

export default function Index() {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  return <Redirect href={isAuthed ? '/(app)' : '/(auth)/phone'} />;
}
