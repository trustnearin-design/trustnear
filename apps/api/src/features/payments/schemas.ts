import { z } from 'zod';
import { UuidSchema } from '@sevalink/types';

export const CreatePaymentInputSchema = z.object({
  bookingId: UuidSchema,
  customerEmail: z.string().email().optional(),
});

export const VerifyPaymentInputSchema = z.object({
  bookingId: UuidSchema,
});

export const WalletQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
