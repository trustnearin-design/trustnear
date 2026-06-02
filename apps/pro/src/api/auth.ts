import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import { useAuthStore, type AuthUser } from '../stores/auth';

interface SendOtpResponse {
  phone: string;
  expiresInSeconds: number;
}

interface VerifyOtpResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function useSendOtp() {
  return useMutation({
    mutationFn: (phone: string) =>
      apiFetch<SendOtpResponse>('/auth/send-otp', {
        method: 'POST',
        body: { phone, role: 'professional' },
        auth: false,
      }),
  });
}

export function useVerifyOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { phone: string; otp: string; fullName?: string }) => {
      const data = await apiFetch<VerifyOtpResponse>('/auth/verify-otp', {
        method: 'POST',
        body: {
          phone: input.phone,
          otp: input.otp,
          role: 'professional',
          ...(input.fullName ? { fullName: input.fullName } : {}),
        },
        auth: false,
      });
      // Wipe any cached data from a previous account on this device BEFORE
      // setting the new session — otherwise the route guard can read the prior
      // pro's cached onboarding status and route the wrong user.
      qc.clear();
      await useAuthStore.getState().setSession({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      return data;
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { refreshToken, clearSession } = useAuthStore.getState();
      if (refreshToken) {
        await apiFetch<{ loggedOut: true }>('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          auth: false,
        }).catch(() => {
          // Logout is best-effort; clear local session even if server rejects.
        });
      }
      await clearSession();
      // Drop all cached queries so the next account starts clean (no stale
      // onboarding status / profile leaking across a logout->login switch).
      qc.clear();
    },
  });
}
