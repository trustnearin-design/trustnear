import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth';

/**
 * Singleton Socket.IO client. Created lazily on first request, reused for
 * the app lifetime. Auth token is read from the auth store at connect time
 * and again on each reconnect via the auth callback form.
 */
let socket: Socket | null = null;

function resolveSocketUrl(): string {
  const envUrl = process.env['EXPO_PUBLIC_API_URL'];
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }
  const extra = (Constants.expoConfig?.extra ?? {}) as {
    apiBaseUrl?: string;
    apiBaseUrlDevice?: string;
  };
  const constantsAny = Constants as unknown as { isDevice?: boolean };
  const isDevice = constantsAny.isDevice ?? Platform.OS !== 'web';
  const url = isDevice && extra.apiBaseUrlDevice ? extra.apiBaseUrlDevice : extra.apiBaseUrl;
  if (!url) throw new Error('Missing apiBaseUrl in app.json extra or EXPO_PUBLIC_API_URL');
  return url.replace(/\/+$/, '');
}

/**
 * Get the live socket. Connects on first call. Subsequent callers share the
 * same connection — Socket.IO multiplexes rooms internally.
 */
export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;

  socket = io(resolveSocketUrl(), {
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10_000,
    // Read the current access token at every (re)connect attempt.
    // socket.io-client supports a function form for `auth` exactly for this.
    auth: (cb) => {
      const token = useAuthStore.getState().accessToken;
      cb({ token });
    },
  });

  return socket;
}

/**
 * Drop the socket completely. Call on logout — re-auth requires a new
 * handshake with the fresh user's token, and any old rooms must be cleared.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
