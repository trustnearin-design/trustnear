import { z } from 'zod';
import { LatitudeSchema, LongitudeSchema, OtpSchema, UuidSchema } from '@sevalink/types';

export const CreateBookingInputSchema = z.object({
  categoryId: UuidSchema,
  scheduledAt: z.string().datetime({ offset: true }),
  durationMinutes: z
    .number()
    .int()
    .min(30)
    .max(8 * 60)
    .default(60),
  addressLine: z.string().trim().min(5).max(500),
  addressLat: z.number().pipe(LatitudeSchema),
  addressLng: z.number().pipe(LongitudeSchema),
  addressArea: z.string().trim().max(100).optional(),
  addressCity: z.string().trim().min(2).max(50).default('Jaipur'),
  notes: z.string().trim().max(1000).optional(),
  promoCode: z.string().trim().max(20).optional(),
  preferredProId: UuidSchema.optional(),
});

export const CancelBookingInputSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

export const VerifyBookingOtpInputSchema = z.object({
  otp: OtpSchema,
});

export const BookingIdParamSchema = z.object({
  id: UuidSchema,
});

export const ListBookingsQuerySchema = z.object({
  status: z
    .enum([
      'pending_match',
      'matched',
      'confirmed',
      'pro_en_route',
      'otp_verified',
      'in_progress',
      'completed',
      'cancelled_customer',
      'cancelled_pro',
      'disputed',
    ])
    .optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
});
