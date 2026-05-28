import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiBaseUrl, apiFetch } from './client';
import { useAuthStore } from '../stores/auth';

/**
 * Phase 3g — Pro onboarding wizard API client.
 *
 * Each step has its own hook so the wizard screens stay focused. All
 * mutations invalidate ['pro.onboarding.status'] + ['pro.me'] so the
 * guard logic re-runs after each save and the Home tab reflects the
 * latest verification chips.
 */

export type ApprovalStatus =
  | 'draft'
  | 'personal_info_done'
  | 'services_done'
  | 'area_done'
  | 'schedule_done'
  | 'kyc_in_progress'
  | 'submitted_for_review'
  | 'approved'
  | 'rejected';

export type WizardStepKey =
  | 'personal'
  | 'photo'
  | 'services'
  | 'area'
  | 'schedule'
  | 'aadhaar'
  | 'pan'
  | 'bank'
  | 'police';

export interface OnboardingStatus {
  approvalStatus: ApprovalStatus;
  steps: Record<WizardStepKey, { done: boolean; required: boolean }>;
  progress: {
    requiredDone: number;
    requiredTotal: number;
    requiredRemaining: WizardStepKey[];
    optionalDone: number;
    optionalTotal: number;
  };
  canSubmit: boolean;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectionFields: string[];
}

export function useOnboardingStatus() {
  return useQuery({
    queryKey: ['pro.onboarding.status'],
    queryFn: () => apiFetch<OnboardingStatus>('/pros/me/onboarding/status'),
    staleTime: 15_000,
  });
}

// ─── Step 1: Personal info ────────────────────────────────────────────
export interface PersonalInfoInput {
  fullName: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dob: string; // YYYY-MM-DD
  languagesSpoken: string[]; // ISO 639-1 codes
  currentAddress: string;
  city?: string;
  area?: string;
}

export function useSavePersonalInfo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PersonalInfoInput) =>
      apiFetch<{ ok: true }>('/pros/me/onboarding/personal', {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Step 2: Profile photo ────────────────────────────────────────────
// Upload uses raw fetch (not apiFetch) because the body is multipart
// FormData — apiFetch always sets Content-Type: application/json.
export async function uploadOnboardingPhoto(
  uri: string,
  mime = 'image/jpeg',
): Promise<{ ok: true; url: string }> {
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  // React Native FormData accepts a {uri, name, type} object — web typings
  // don't know about this. Cast on both sides keeps TS happy.
  form.append('file', { uri, name: 'profile.jpg', type: mime } as unknown as Blob);

  const res = await fetch(`${apiBaseUrl}/api/v1/pros/me/onboarding/photo`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form as unknown as BodyInit_,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: { ok: true; url: string } }
    | { success: false; error: { code: string; message: string } }
    | null;
  if (!json || !json.success) {
    throw new Error(json && 'error' in json ? json.error.message : `Upload failed (${res.status})`);
  }
  return json.data;
}

export function useUploadPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) => uploadOnboardingPhoto(uri, mime),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Categories — list of leaves for the services picker ─────────────
export interface ServiceCategory {
  id: string;
  slug: string;
  parentId: string | null;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl: string | null;
  professionalTitle: string | null;
  description: string | null;
  shortPitch: string | null;
  basePrice: number; // paise
  priceUnit: string;
  isFeatured: boolean;
  minDurationMinutes: number;
}

export function useLeafCategories() {
  return useQuery({
    queryKey: ['categories.leaves'],
    queryFn: () => apiFetch<{ categories: ServiceCategory[]; count: number }>('/categories'),
    staleTime: 5 * 60_000, // categories change rarely
  });
}

// ─── Step 3: Services + pricing ───────────────────────────────────────
export interface ServiceOfferingInput {
  categoryId: string;
  customPrice?: number | null; // paise
  experienceYears: number;
}

export function useSaveServices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (services: ServiceOfferingInput[]) =>
      apiFetch<{ ok: true; count: number }>('/pros/me/onboarding/services', {
        method: 'PATCH',
        body: { services },
      }),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Step 4: Working area ─────────────────────────────────────────────
export interface AreaInput {
  lat: number;
  lng: number;
  radiusKm: number;
}

export function useSaveArea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AreaInput) =>
      apiFetch<{ ok: true }>('/pros/me/onboarding/area', {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Step 5: Schedule ─────────────────────────────────────────────────
export interface ScheduleSlot {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "09:00"
  endTime: string;
  isAvailable: boolean;
}

export function useSaveSchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slots: ScheduleSlot[]) =>
      apiFetch<{ ok: true; availableDays: number }>('/pros/me/onboarding/schedule', {
        method: 'PATCH',
        body: { slots },
      }),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Step: Police verification doc upload ─────────────────────────────
export async function uploadPoliceDoc(
  uri: string,
  mime = 'image/jpeg',
): Promise<{ ok: true; status: string }> {
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  form.append('file', { uri, name: 'police.jpg', type: mime } as unknown as Blob);

  const res = await fetch(`${apiBaseUrl}/api/v1/pros/me/onboarding/police-doc`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form as unknown as BodyInit_,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: { ok: true; status: string } }
    | { success: false; error: { code: string; message: string } }
    | null;
  if (!json || !json.success) {
    throw new Error(json && 'error' in json ? json.error.message : `Upload failed (${res.status})`);
  }
  return json.data;
}

export function useUploadPoliceDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) => uploadPoliceDoc(uri, mime),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Submit ───────────────────────────────────────────────────────────
export function useSubmitForReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: true; submittedAt: string }>('/pros/me/onboarding/submit', {
        method: 'POST',
      }),
    onSuccess: () => invalidateOnboarding(qc),
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────
function invalidateOnboarding(qc: ReturnType<typeof useQueryClient>): void {
  void qc.invalidateQueries({ queryKey: ['pro.onboarding.status'] });
  void qc.invalidateQueries({ queryKey: ['pro.me'] });
}

/**
 * Convenience derived helper for the UI: given a status, return the
 * route for the FIRST incomplete required step. Used by the wizard
 * layout to auto-redirect from /welcome → the right step when a pro
 * re-opens the app mid-flow.
 */
export function nextStepRoute(status: OnboardingStatus): string {
  const ORDER: WizardStepKey[] = [
    'personal',
    'photo',
    'services',
    'area',
    'schedule',
    'aadhaar',
    'pan',
    'bank',
  ];
  for (const step of ORDER) {
    if (status.steps[step] && !status.steps[step].done) {
      return `/(onboarding)/${step}`;
    }
  }
  return '/(onboarding)/review';
}
