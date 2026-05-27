import { z } from 'zod';

// ─── Notification templates ──────────────────────────────────────────

export const TemplateUpsertInput = z.object({
  channel: z.enum(['push', 'email', 'sms']).default('push'),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  variables: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  description: z.string().trim().max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

// ─── Announcements ───────────────────────────────────────────────────

export const AnnouncementInput = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(2000),
  audience: z.enum(['all', 'customers', 'professionals']).default('all'),
  scheduledAt: z
    .union([z.string().datetime(), z.literal(''), z.null()])
    .optional()
    .transform((v) => (v && typeof v === 'string' ? new Date(v) : null)),
  deepLink: z.string().trim().max(200).optional().nullable(),
});

export const AnnouncementListQuery = z.object({
  status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ─── Promo codes ─────────────────────────────────────────────────────

export const PromoCodeInput = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9_-]+$/i, 'Use letters, digits, hyphen or underscore only'),
  description: z.string().trim().max(500).optional().nullable(),
  discountType: z.enum(['percent', 'flat']),
  value: z.number().int().min(1).max(10_000_000),
  maxDiscount: z.number().int().min(0).optional().nullable(),
  minOrderAmount: z.number().int().min(0).default(0),
  usageLimit: z.number().int().min(0).optional().nullable(),
  perUserLimit: z.number().int().min(0).default(1),
  isActive: z.boolean().default(true),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
});

export const PromoCodeUpdateInput = PromoCodeInput.partial().extend({
  code: z.string().trim().min(3).max(20).optional(),
});

export const PromoCodeListQuery = z.object({
  active: z.enum(['true', 'false']).optional(),
  search: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// ─── FAQs ────────────────────────────────────────────────────────────

export const FaqInput = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'lowercase, digits, hyphens only'),
  category: z.string().trim().min(1).max(50),
  question: z.string().trim().min(3).max(300),
  body: z.string().trim().min(1),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(true),
});

export const FaqUpdateInput = FaqInput.partial();

// ─── Legal pages ─────────────────────────────────────────────────────

export const LegalPageInput = z.object({
  slug: z.string().trim().min(2).max(50),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1),
  effectiveAt: z.string().datetime().optional(),
  isPublished: z.boolean().default(false),
});
