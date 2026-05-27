import { z } from 'zod';

export const KycQueueQuerySchema = z.object({
  filter: z.enum(['pending', 'partial', 'complete', 'all']).default('partial'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const SetVerificationInputSchema = z.object({
  field: z.enum(['aadhaar', 'pan', 'bank', 'police', 'face']),
  value: z.boolean(),
});

export type KycQueueQuery = z.infer<typeof KycQueueQuerySchema>;
export type SetVerificationInput = z.infer<typeof SetVerificationInputSchema>;
