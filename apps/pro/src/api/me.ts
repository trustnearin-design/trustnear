import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiBaseUrl, apiFetch } from './client';
import { useAuthStore } from '../stores/auth';

/**
 * Pro-side "me" endpoints. The Pro app reads almost everything off these —
 * profile, availability, today's snapshot, and the jobs feed.
 */

export type ProAvailability = 'online' | 'offline' | 'busy';
export type TrustBadge = 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';

export interface MyServiceOffering {
  experienceYears: number;
  customPrice: number | null;
  category: {
    id: string;
    slug: string;
    name: string;
    iconUrl: string | null;
    basePrice: number;
    priceUnit: string;
  };
}

export interface MySchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface MyProfile {
  id: string;
  professionalTitle: string | null;
  bio: string | null;
  yearsExperience: number;
  trustScore: string;
  trustBadge: TrustBadge;
  availabilityStatus: ProAvailability;
  approvalStatus: 'draft' | 'submitted_for_review' | 'approved' | 'rejected';
  aadhaarVerified: boolean;
  faceVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeVerified: boolean;
  introVideoUrl: string | null;
  totalBookings: number;
  repeatClientCount: number;
  cancellationCount: number;
  avgResponseTimeSeconds: number;
  isSubscriptionActive: boolean;
  subscriptionPlan: string | null;
  // Personal-info (for onboarding "personal" step prefill on resume). dob is an
  // ISO date string from the API (slice to YYYY-MM-DD before seeding the form).
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  dob: string | null;
  languagesSpoken: string[];
  currentAddress: string | null;
  serviceRadiusKm: number;
  /** Pro-uploaded "recent work" shots shown on the customer expert screen. */
  portfolioUrls: string[];
  user: {
    id: string;
    fullName: string;
    phone: string;
    profilePhoto: string | null;
    city: string | null;
    area: string | null;
    latitude: string | null;
    longitude: string | null;
  };
  serviceOfferings: MyServiceOffering[];
  schedules: MySchedule[];
}

export interface TodaySummary {
  jobsCompleted: number;
  jobsActive: number;
  earnedPaise: number;
  ratingAvg: number | null;
}

export type JobStatus =
  | 'matched'
  | 'confirmed'
  | 'pro_en_route'
  | 'otp_verified'
  | 'in_progress'
  | 'completed'
  | 'cancelled_customer'
  | 'cancelled_pro'
  | 'disputed';

export interface ProJob {
  id: string;
  bookingNumber: string;
  status: JobStatus;
  scheduledAt: string;
  completedAt: string | null;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  totalAmount: number;
  paymentStatus: string;
  category: { id: string; slug: string; name: string };
  customer: { id: string; fullName: string; profilePhoto: string | null };
}

export type JobsSegment = 'pending' | 'active' | 'history';

export function useMyProfile() {
  return useQuery({
    queryKey: ['pro.me'],
    queryFn: () => apiFetch<MyProfile>('/pros/me'),
    staleTime: 60_000,
  });
}

export function useTodaySummary() {
  return useQuery({
    queryKey: ['pro.me.today'],
    queryFn: () => apiFetch<TodaySummary>('/pros/me/today'),
    staleTime: 30_000,
  });
}

export function useMyJobs(segment: JobsSegment) {
  return useQuery({
    queryKey: ['pro.me.jobs', segment],
    queryFn: () =>
      apiFetch<{ jobs: ProJob[]; count: number; segment: JobsSegment }>(
        `/pros/me/jobs?segment=${segment}`,
      ),
    staleTime: 15_000,
  });
}

export interface ProfileDetailsInput {
  professionalTitle?: string;
  bio?: string;
  yearsExperience?: number;
  languagesSpoken?: string[];
}

/**
 * Self-edit title / bio / experience. Approved pros can call this any time
 * — no re-review. Refreshes the cached profile on success.
 */
export function useSaveProfileDetails() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileDetailsInput) =>
      apiFetch<{ ok: true }>('/pros/me/profile', { method: 'PATCH', body: data }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}

// ─── Portfolio gallery ───────────────────────────────────────────────
// "Recent work" shots the pro uploads themselves. Upload uses raw fetch
// (multipart FormData), delete goes through apiFetch (JSON body).

export async function uploadPortfolioPhoto(
  uri: string,
  mime = 'image/jpeg',
): Promise<{ ok: true; portfolioUrls: string[] }> {
  const token = useAuthStore.getState().accessToken;
  const form = new FormData();
  form.append('file', { uri, name: 'work.jpg', type: mime } as unknown as Blob);

  const res = await fetch(`${apiBaseUrl}/api/v1/pros/me/portfolio`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form as unknown as BodyInit_,
  });
  const json = (await res.json().catch(() => null)) as
    | { success: true; data: { ok: true; portfolioUrls: string[] } }
    | { success: false; error: { code: string; message: string } }
    | null;
  if (!json || !json.success) {
    throw new Error(json && 'error' in json ? json.error.message : `Upload failed (${res.status})`);
  }
  return json.data;
}

export function useUploadPortfolioPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uri, mime }: { uri: string; mime?: string }) => uploadPortfolioPhoto(uri, mime),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}

export function useDeletePortfolioPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<{ ok: true; portfolioUrls: string[] }>('/pros/me/portfolio', {
        method: 'DELETE',
        body: { url },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['pro.me'] });
    },
  });
}

export function useSetAvailability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: ProAvailability) =>
      apiFetch<{ availabilityStatus: ProAvailability }>('/pros/me/availability', {
        method: 'PATCH',
        body: { status },
      }),
    onSuccess: (data) => {
      // Optimistically update the cached profile so the Home toggle
      // reflects the new status without waiting for a refetch.
      qc.setQueryData<MyProfile>(['pro.me'], (prev) =>
        prev ? { ...prev, availabilityStatus: data.availabilityStatus } : prev,
      );
    },
  });
}
