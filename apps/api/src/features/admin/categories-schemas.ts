import { z } from 'zod';

const Url = z.string().url().max(500);

/**
 * Categories input schema. Used for both create + update (via partial).
 * Slug rule: kebab-case, 2-60 chars — matches what the customer/pro apps
 * use in URLs.
 */
export const CategoryInputSchema = z.object({
  parentId: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case (e.g. home-cleaning)'),
  iconUrl: Url.nullable(),
  bannerUrl: Url.nullable(),
  heroImageUrl: Url.nullable(),
  professionalTitle: z.string().trim().min(2).max(100).nullable(),
  description: z.string().trim().max(2000).nullable(),
  shortPitch: z.string().trim().max(160).nullable(),
  basePrice: z.number().int().min(0).max(10_00_00_00), // 10 lakh rupees in paise
  priceUnit: z.enum(['per_hour', 'per_visit']),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  phase: z.number().int().min(1).max(10),
  sortOrder: z.number().int().min(0).max(999),
  commissionRate: z.number().min(0).max(50),
  minDurationMinutes: z.number().int().min(15).max(480),
  searchKeywords: z.array(z.string().trim().min(1).max(50)).max(20),
});

export const CategoryUpdateSchema = CategoryInputSchema.partial();

export const ReorderInputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0).max(999),
      }),
    )
    .min(1)
    .max(50),
});

export type CategoryInputDto = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateDto = z.infer<typeof CategoryUpdateSchema>;
export type ReorderInputDto = z.infer<typeof ReorderInputSchema>;
