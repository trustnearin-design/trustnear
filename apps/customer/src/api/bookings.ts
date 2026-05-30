import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

export type BookingStatus =
  | 'pending_match'
  | 'matched'
  | 'confirmed'
  | 'pro_en_route'
  | 'otp_verified'
  | 'in_progress'
  | 'completed'
  | 'cancelled_customer'
  | 'cancelled_pro'
  | 'disputed';

export const TERMINAL_STATUSES: BookingStatus[] = [
  'completed',
  'cancelled_customer',
  'cancelled_pro',
  'disputed',
];

export function isTerminalStatus(s: BookingStatus): boolean {
  return TERMINAL_STATUSES.includes(s);
}

/**
 * Customer can cancel only before the booking enters in_progress.
 * (Backend enforces this via the state machine — mirror it client-side
 * so we don't show the cancel button when it'll always fail.)
 */
export function customerCanCancel(s: BookingStatus): boolean {
  return ['pending_match', 'matched', 'confirmed', 'pro_en_route'].includes(s);
}

export interface BookingListItem {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  scheduledAt: string;
  completedAt: string | null;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  category: { slug: string; name: string; iconUrl: string | null };
  professional: {
    id: string;
    professionalTitle: string | null;
    trustScore: string;
    user: { fullName: string; profilePhoto: string | null; phone: string };
  } | null;
  customer: { id: string; fullName: string; phone: string };
}

export interface BookingDetail {
  id: string;
  bookingNumber: string;
  status: BookingStatus;
  scheduledAt: string;
  completedAt: string | null;
  durationMinutes: number;
  addressLine: string;
  addressArea: string | null;
  addressCity: string;
  addressLat: string | number;
  addressLng: string | number;
  notes: string | null;
  basePrice: number;
  promoDiscount: number;
  totalAmount: number;
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
  customer: { id: string; fullName: string; phone: string; profilePhoto: string | null };
  professional: {
    id: string;
    professionalTitle: string | null;
    trustScore: string;
    trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
    user: { id: string; fullName: string; profilePhoto: string | null; phone: string };
  } | null;
}

export interface CreateBookingInput {
  categoryId: string;
  scheduledAt: string; // ISO 8601 with offset
  durationMinutes: number;
  addressLine: string;
  addressLat: number;
  addressLng: number;
  addressArea?: string;
  addressCity?: string;
  notes?: string;
  preferredProId?: string;
  promoCode?: string;
}

export interface ValidatePromoResult {
  valid: boolean;
  code: string;
  /** Set when valid === false — the reason to show inline. */
  message?: string;
  basePrice: number;
  platformFee: number;
  discountPaise: number;
  /** base + fee − discount, in paise. */
  totalPaise: number;
}

export interface CreateBookingResult {
  bookingId: string;
  bookingNumber: string;
  status: BookingStatus;
  /** Plain 6-digit OTP — shown to customer once, lost from API after this response. */
  otp: string;
}

export function useMyBookings(status?: BookingStatus) {
  return useQuery({
    queryKey: ['bookings.mine', { status }],
    queryFn: () => {
      const qs = status ? `?status=${status}` : '';
      return apiFetch<{ bookings: BookingListItem[]; count: number }>(`/bookings${qs}`);
    },
    staleTime: 15_000,
    refetchOnMount: 'always',
  });
}

export function useBookingDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['booking', id],
    queryFn: () => apiFetch<BookingDetail>(`/bookings/${id}`),
    enabled: !!id,
    refetchInterval: (q) => {
      const data = q.state.data;
      if (!data) return 5000;
      return isTerminalStatus(data.status) ? false : 5000;
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) =>
      apiFetch<CreateBookingResult>('/bookings', { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['bookings.mine'] });
    },
  });
}

/**
 * Preview a promo code against a prospective booking. Returns the discount +
 * new total so the book screen can show "applied" state before confirming.
 * `valid: false` (with a `message`) is a normal outcome, not an error.
 */
export function useValidatePromo() {
  return useMutation({
    mutationFn: (input: { code: string; categoryId: string; durationMinutes: number }) =>
      apiFetch<ValidatePromoResult>('/bookings/promo/validate', {
        method: 'POST',
        body: input,
      }),
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiFetch<BookingDetail>(`/bookings/${id}/cancel`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ['booking', id] });
      void qc.invalidateQueries({ queryKey: ['bookings.mine'] });
    },
  });
}
