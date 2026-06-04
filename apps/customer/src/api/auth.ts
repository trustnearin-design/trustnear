import { useMutation } from '@tanstack/react-query';
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
        body: { phone, role: 'customer' },
        auth: false,
      }),
  });
}

export function useVerifyOtp() {
  return useMutation({
    mutationFn: async (input: {
      phone: string;
      otp: string;
      fullName?: string;
      referralCode?: string;
    }) => {
      const data = await apiFetch<VerifyOtpResponse>('/auth/verify-otp', {
        method: 'POST',
        body: {
          phone: input.phone,
          otp: input.otp,
          role: 'customer',
          ...(input.fullName ? { fullName: input.fullName } : {}),
          ...(input.referralCode ? { referralCode: input.referralCode } : {}),
        },
        auth: false,
      });
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
    },
  });
}
