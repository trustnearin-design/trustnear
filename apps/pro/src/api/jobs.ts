import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';
import type { JobStatus } from './me';

/**
 * Pro-side job detail + action mutations. Hits the shared `/bookings/:id`
 * endpoints which the backend already authorizes by role — a pro sees only
 * the bookings they're assigned to, with the customer info attached.
 */

export interface JobDetail {
  id: string;
  bookingNumber: string;
  status: JobStatus | 'pending_match';
  scheduledAt: string;
  completedAt: string | null;
  startedAt: string | null;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  addressCity: string;
  addressLat: string | number;
  addressLng: string | number;
  notes: string | null;
  basePrice: number;
  totalAmount: number;
  proPayout: number;
  commission: number;
  paymentStatus: string;
  cancellationReason: string | null;
  createdAt: string;
  category: {
    id: string;
    slug: string;
    name: string;
    iconUrl: string | null;
    basePrice: number;
    priceUnit: string;
  };
  customer: {
    id: string;
    fullName: string;
    phone: string;
    profilePhoto: string | null;
  };
}

const TERMINAL: JobDetail['status'][] = [
  'completed',
  'cancelled_customer',
  'cancelled_pro',
  'disputed',
];

export function isJobTerminal(status: JobDetail['status']): boolean {
  return TERMINAL.includes(status);
}

/**
 * Whichever action the pro can trigger from the current status. The button
 * label + the next-step mutation are derived from this. Returns null when
 * the pro is waiting (e.g. status === 'matched' before they tap Accept on
 * the Jobs tab, or terminal).
 */
export type ProAction = 'accept' | 'start_trip' | 'arrived' | 'complete' | null;

export function nextProAction(status: JobDetail['status']): ProAction {
  switch (status) {
    case 'matched':
      return 'accept';
    case 'confirmed':
      return 'start_trip';
    case 'pro_en_route':
      return 'arrived';
    case 'in_progress':
    case 'otp_verified':
      return 'complete';
    default:
      return null;
  }
}

export function useJobDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['pro.job', id],
    queryFn: () => apiFetch<JobDetail>(`/bookings/${id}`),
    enabled: !!id,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 5000;
      return isJobTerminal(data.status) ? false : 5000;
    },
  });
}

function invalidateJobAndLists(qc: ReturnType<typeof useQueryClient>, id: string) {
  void qc.invalidateQueries({ queryKey: ['pro.job', id] });
  void qc.invalidateQueries({ queryKey: ['pro.me.jobs'] });
  void qc.invalidateQueries({ queryKey: ['pro.me.today'] });
  void qc.invalidateQueries({ queryKey: ['pro.me'] });
}

export function useAcceptJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ id: string; status: JobStatus }>(`/bookings/${id}/accept`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateJobAndLists(qc, id),
  });
}

export function useStartTrip(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ id: string; status: JobStatus }>(`/bookings/${id}/start-trip`, {
        method: 'POST',
      }),
    onSuccess: () => invalidateJobAndLists(qc, id),
  });
}

/**
 * Pro tapped "I'm at the location" — pings the backend so the customer gets
 * a "share your OTP" push. Best-effort: a failure here must not block the pro
 * from opening the OTP sheet, so callers fire-and-forget.
 */
export function useMarkArrived(id: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ notified: boolean }>(`/bookings/${id}/arrived`, {
        method: 'POST',
      }),
  });
}

export function useVerifyJobOtp(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (otp: string) =>
      apiFetch<{ id: string; status: JobStatus }>(`/bookings/${id}/verify-otp`, {
        method: 'POST',
        body: { otp },
      }),
    onSuccess: () => invalidateJobAndLists(qc, id),
  });
}

export function useCompleteJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ id: string; status: JobStatus }>(`/bookings/${id}/complete`, {
        method: 'POST',
      }),
    onSuccess: () => {
      invalidateJobAndLists(qc, id);
      // Completion settles the payout → refresh earnings (balance + transactions).
      void qc.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useCancelJob(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string) =>
      apiFetch<{ id: string; status: JobStatus }>(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: () => invalidateJobAndLists(qc, id),
  });
}
