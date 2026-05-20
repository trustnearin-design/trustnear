import { z } from 'zod';
import { UuidSchema } from '@sevalink/types';

const REVIEW_TAGS = [
  'punctual',
  'late',
  'clean',
  'messy',
  'skilled',
  'friendly',
  'rude',
  'professional',
  'quick',
  'thorough',
  'value_for_money',
  'expensive',
] as const;

export const SubmitReviewInputSchema = z.object({
  bookingId: UuidSchema,
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().trim().max(2000).optional(),
  tags: z.array(z.enum(REVIEW_TAGS)).max(5).optional(),
  isPublic: z.boolean().default(true),
});

export const ProIdParamSchema = z.object({
  id: UuidSchema,
});

export const ReviewsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minRating: z.coerce.number().int().min(1).max(5).optional(),
});
