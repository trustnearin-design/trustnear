import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { disconnectSocket } from '../lib/socket';
import { unregisterPushTokenFromBackend } from '../lib/notifications';

/**
 * Auth state strategy:
 *   - Sensitive tokens (access + refresh) → expo-secure-store (Keychain/Keystore)
 *   - Non-sensitive user profile + isAuthed flag → AsyncStorage via zustand persist
 *
 * On app boot, call `bootstrapAuth()` to hydrate tokens from SecureStore into
 * memory. Until that resolves, treat the store as unauthenticated.
 */

export interface AuthUser {
  id: string;
  phone: string;
  role: 'customer' | 'professional' | 'admin';
  fullName: string;
  isVerified: boolean;
  profilePhoto?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthed: boolean;
  isHydrated: boolean;
  setSession: (args: {
    user: AuthUser;
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  updateTokens: (args: { accessToken: string; refreshToken: string }) => Promise<void>;
  updateUser: (partial: Partial<AuthUser>) => void;
  clearSession: () => Promise<void>;
  setHydrated: (v: boolean) => void;
}

const ACCESS_KEY = 'sevalink.accessToken';
const REFRESH_KEY = 'sevalink.refreshToken';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthed: false,
      isHydrated: false,

      setSession: async ({ user, accessToken, refreshToken }) => {
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_KEY, accessToken),
          SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
        ]);
        set({ user, accessToken, refreshToken, isAuthed: true });
      },

      updateTokens: async ({ accessToken, refreshToken }) => {
        await Promise.all([
          SecureStore.setItemAsync(ACCESS_KEY, accessToken),
          SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
        ]);
        set({ accessToken, refreshToken });
      },

      updateUser: (partial) => set((s) => (s.user ? { user: { ...s.user, ...partial } } : s)),

      clearSession: async () => {
        const swallow = () => undefined;
        // Unregister BEFORE we drop the token — backend needs auth on
        // the DELETE call. Best-effort; we don't block logout on it.
        await unregisterPushTokenFromBackend().catch(swallow);
        disconnectSocket();
        await Promise.all([
          SecureStore.deleteItemAsync(ACCESS_KEY).catch(swallow),
          SecureStore.deleteItemAsync(REFRESH_KEY).catch(swallow),
        ]);
        set({ user: null, accessToken: null, refreshToken: null, isAuthed: false });
      },

      setHydrated: (v) => set({ isHydrated: v }),
    }),
    {
      name: 'sevalink.auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user, isAuthed: s.isAuthed }),
    },
  ),
);

/**
 * Pull tokens out of SecureStore into the in-memory store at app start.
 * If the persisted `isAuthed` says true but tokens are missing, fall back
 * to logged-out state (corrupted install / user wiped Keychain).
 *
 * Zustand's `persist` middleware hydrates asynchronously from AsyncStorage.
 * We must wait for that to finish before reading `user` / `isAuthed`,
 * otherwise we'd see the default (logged-out) state on cold start.
 */
export async function bootstrapAuth(): Promise<void> {
  if (!useAuthStore.persist.hasHydrated()) {
    await new Promise<void>((resolve) => {
      const unsub = useAuthStore.persist.onFinishHydration(() => {
        unsub();
        resolve();
      });
    });
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);

  const { user, isAuthed, setHydrated, clearSession } = useAuthStore.getState();

  if (isAuthed && user && accessToken && refreshToken) {
    useAuthStore.setState({ accessToken, refreshToken });
  } else if (isAuthed && (!accessToken || !refreshToken)) {
    await clearSession();
  }
  setHydrated(true);
}
