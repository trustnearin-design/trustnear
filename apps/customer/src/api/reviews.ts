import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

/**
 * Review submission — customer rates a completed booking.
 *
 * Backend contract (POST /api/v1/reviews):
 *   - Auth required; only the booking's own customer may submit.
 *   - Booking must be `completed` and not already reviewed (one per booking).
 *   - Fires a trust-score event sized by rating (5★ +3.0 … 1★ −3.0).
 */

/** Tag enum mirrors the API's REVIEW_TAGS (max 5 selectable). */
export const REVIEW_TAGS = [
  { key: 'punctual', label: 'Punctual', positive: true },
  { key: 'professional', label: 'Professional', positive: true },
  { key: 'skilled', label: 'Skilled', positive: true },
  { key: 'friendly', label: 'Friendly', positive: true },
  { key: 'clean', label: 'Clean work', positive: true },
  { key: 'quick', label: 'Quick', positive: true },
  { key: 'thorough', label: 'Thorough', positive: true },
  { key: 'value_for_money', label: 'Value for money', positive: true },
  { key: 'late', label: 'Late', positive: false },
  { key: 'messy', label: 'Messy', positive: false },
  { key: 'rude', label: 'Rude', positive: false },
  { key: 'expensive', label: 'Expensive', positive: false },
] as const;

export type ReviewTag = (typeof REVIEW_TAGS)[number]['key'];

export interface SubmitReviewInput {
  bookingId: string;
  rating: number; // 1..5
  reviewText?: string;
  tags?: ReviewTag[];
  isPublic?: boolean;
}

export interface SubmitReviewResult {
  id: string;
  rating: number;
  scoreDelta: number;
}

export function useSubmitReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitReviewInput) =>
      apiFetch<SubmitReviewResult>('/reviews', {
        method: 'POST',
        body: {
          bookingId: input.bookingId,
          rating: input.rating,
          ...(input.reviewText?.trim() ? { reviewText: input.reviewText.trim() } : {}),
          ...(input.tags?.length ? { tags: input.tags } : {}),
          isPublic: input.isPublic ?? true,
        },
      }),
    onSuccess: (_res, vars) => {
      // Refresh the booking detail (flips review: null -> {...}) and the list.
      void qc.invalidateQueries({ queryKey: ['booking', vars.bookingId] });
      void qc.invalidateQueries({ queryKey: ['bookings.mine'] });
    },
  });
}
