import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ApiResponse, ApiError } from '@sevalink/types';
import { useAuthStore } from '../stores/auth';

/**
 * Pick the right API base URL for the current runtime, in priority order:
 *   1. EXPO_PUBLIC_API_URL env var — set at EAS Build time per profile.
 *      This is how preview/production APKs target staging or prod APIs
 *      without rebuilding app.json.
 *   2. app.json extra.apiBaseUrlDevice — physical device on Expo Go
 *      (typically laptop LAN IP for dev).
 *   3. app.json extra.apiBaseUrl — Android emulator (10.0.2.2) /
 *      iOS simulator (localhost).
 */
function resolveBaseUrl(): string {
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
  if (!url) {
    throw new Error('Missing apiBaseUrl in app.json extra or EXPO_PUBLIC_API_URL');
  }
  return url.replace(/\/+$/, '');
}

const BASE_URL = resolveBaseUrl();
const API_VERSION = '/api/v1';

export class ApiCallError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: Record<string, unknown> | undefined;
  constructor(error: ApiError['error'], status: number) {
    super(error.message);
    this.name = 'ApiCallError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

let refreshInFlight: Promise<void> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshInFlight) {
    await refreshInFlight;
    return useAuthStore.getState().isAuthed;
  }
  const { refreshToken, updateTokens, clearSession } = useAuthStore.getState();
  if (!refreshToken) return false;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${BASE_URL}${API_VERSION}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      const json = (await res.json()) as ApiResponse<{
        accessToken: string;
        refreshToken: string;
      }>;
      if (!res.ok || !json.success) {
        await clearSession();
        return;
      }
      await updateTokens({
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
      });
    } catch {
      await clearSession();
    } finally {
      refreshInFlight = null;
    }
  })();

  await refreshInFlight;
  return useAuthStore.getState().isAuthed;
}

async function rawFetch<T>(path: string, opts: RequestOptions): Promise<T> {
  const { body, auth = true, headers, ...rest } = opts;
  const merged: Record<string, string> = {
    Accept: 'application/json',
    ...((headers as Record<string, string> | undefined) ?? {}),
  };
  if (body !== undefined) merged['Content-Type'] = 'application/json';
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) merged['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${API_VERSION}${path}`, {
    ...rest,
    headers: merged,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!json) {
    throw new ApiCallError(
      { code: 'SL_904_INTERNAL_ERROR', message: `Empty response (${res.status})` },
      res.status,
    );
  }
  if (!json.success) {
    throw new ApiCallError(json.error, res.status);
  }
  return json.data;
}

/**
 * Authenticated request with one-shot refresh on 401-SL_105.
 * Other auth errors (invalid token, account disabled) clear the session.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  try {
    return await rawFetch<T>(path, opts);
  } catch (err) {
    if (
      err instanceof ApiCallError &&
      err.status === 401 &&
      err.code === 'SL_105_TOKEN_EXPIRED' &&
      opts.auth !== false
    ) {
      const refreshed = await tryRefresh();
      if (refreshed) return rawFetch<T>(path, opts);
    }
    if (
      err instanceof ApiCallError &&
      err.status === 401 &&
      (err.code === 'SL_104_INVALID_TOKEN' || err.code === 'SL_109_ACCOUNT_DISABLED')
    ) {
      await useAuthStore.getState().clearSession();
    }
    throw err;
  }
}

export const apiBaseUrl = BASE_URL;
