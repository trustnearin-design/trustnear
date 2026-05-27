import { z } from 'zod';

const Url = z.string().url().max(500);

const PLACEMENT = z.enum(['home_hero', 'home_strip', 'category_top', 'booking_complete']);
const LINK_KIND = z.enum(['none', 'category', 'external', 'promo']);

// Schedule timestamps come in as ISO strings — coerce.
const OptDate = z
  .union([z.string().datetime(), z.literal('')])
  .nullable()
  .transform((v) => (v === null || v === '' ? null : new Date(v)));

export const BannerInputSchema = z.object({
  title: z.string().trim().min(2).max(100),
  subtitle: z.string().trim().max(160).nullable(),
  imageUrl: Url,
  placement: PLACEMENT,
  ctaText: z.string().trim().max(40).nullable(),
  linkKind: LINK_KIND,
  linkTarget: z.string().trim().max(500).nullable(),
  startsAt: OptDate,
  endsAt: OptDate,
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const BannerUpdateSchema = BannerInputSchema.partial();

export type BannerInputDto = z.infer<typeof BannerInputSchema>;
export type BannerUpdateDto = z.infer<typeof BannerUpdateSchema>;
