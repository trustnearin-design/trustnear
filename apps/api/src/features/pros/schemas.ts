import { z } from 'zod';
import { LatitudeSchema, LongitudeSchema, UuidSchema } from '@sevalink/types';

export const NearbyQuerySchema = z.object({
  lat: z.coerce.number().pipe(LatitudeSchema),
  lng: z.coerce.number().pipe(LongitudeSchema),
  category: z.string().trim().min(1).max(100),
  radiusKm: z.coerce.number().min(0.5).max(50).default(5),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const ProIdParamSchema = z.object({
  id: UuidSchema,
});
