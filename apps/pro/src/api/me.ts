import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

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
