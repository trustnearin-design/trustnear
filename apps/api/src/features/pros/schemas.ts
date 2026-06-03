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

export const AvailabilityInputSchema = z.object({
  status: z.enum(['online', 'offline', 'busy']),
});

export const MyJobsQuerySchema = z.object({
  segment: z.enum(['pending', 'active', 'history']).default('active'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/**
 * Self-edit of presentation fields an approved pro can change any time
 * without re-review (title/bio/experience). KYC, services, area + schedule
 * have their own endpoints; this one is purely the "about me" surface.
 * All fields optional → partial PATCH; at least one must be present.
 */
export const ProfileDetailsSchema = z
  .object({
    professionalTitle: z.string().trim().min(2).max(80).optional(),
    bio: z.string().trim().max(600).optional(),
    yearsExperience: z.number().int().min(0).max(60).optional(),
    languagesSpoken: z.array(z.string().length(2)).min(1).max(8).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
