import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiBaseUrl, apiFetch } from './client';
import { useAuthStore } from '../stores/auth';

/**
 * Customer self-profile read + edit. Backs the Profile → Edit screen.
 * Mutations also sync the auth store so the avatar + name update everywhere
 * (home greeting, profile hero) without a reload.
 */

export interface MeProfile {
  id: string;
  phone: string;
  email: string | null;
  fullName: string;
  role: 'customer' | 'professional' | 'admin';
  profilePhoto: string | null;
  city: string | null;
  area: string | null;
  preferredLang: string | null;
  referralCode: string | null;
  walletBalance: number;
  loyaltyPoints: number;
  isVerified: boolean;
  createdAt: string;
}

export function useMe() {
  return useQuery({
    queryKey: ['users.me'],
    queryFn: () => apiFetch<MeProfile>('/users/me'),
    staleTime: 60_000,
  });
}

export interface UpdateProfileInput {
  fullName?: string;
  email?: string;
  city?: string;
  area?: string;
  preferredLang?: string;
  latitude?: number;
  longitude?: number;
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileInput) =>
      apiFetch<MeProfile>('/users/me', { method: 'PATCH', body: data }),
    onSuccess: (user) => {
      qc.setQueryData(['users.me'], user);
      useAuthStore.getState().updateUser({
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
      });
    },
  });
}

/**
 * Upload a new avatar. Multipart, so we use raw fetch (apiFetch forces JSON).
 */
async function uploadAvatar(uri: string, mime = 'image/jpeg'): Promise<{ profilePhoto: string }> {
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  form.append('file', { uri, name: 'avatar.jpg', type: mime } as unknown as Blob);

  const res = await fetch(`${apiBaseUrl}/api/v1/users/me/photo`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form as unknown as BodyInit_,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: { profilePhoto: string } }
    | { success: false; error: { code: string; message: string } }
    | null;
  if (!json || !json.success) {
    throw new Error(json && 'error' in json ? json.error.message : `Upload failed (${res.status})`);
  }
  return json.data;
}

export function useUploadAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) => uploadAvatar(uri, mime),
    onSuccess: ({ profilePhoto }) => {
      useAuthStore.getState().updateUser({ profilePhoto });
      void qc.invalidateQueries({ queryKey: ['users.me'] });
    },
  });
}
