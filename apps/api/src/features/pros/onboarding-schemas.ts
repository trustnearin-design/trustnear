import { z } from 'zod';
import { LatitudeSchema, LongitudeSchema, UuidSchema } from '@sevalink/types';

/**
 * Phase 3g — Pro onboarding wizard input schemas.
 *
 * One schema per wizard step. Each step's PATCH endpoint validates with
 * its own schema so partial saves are cheap and incremental. The
 * "Submit for Review" endpoint takes no input — server re-validates
 * every saved field at submit time so a stale wizard can't smuggle in
 * incomplete data.
 */

// ─── Step 1: Personal info ────────────────────────────────────────────
export const PersonalInfoSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  // DOB as ISO date string; coerce to Date in the service. Must be ≥18 years old.
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'DOB must be in YYYY-MM-DD format')
    .refine((d) => {
      const date = new Date(d);
      if (Number.isNaN(date.getTime())) return false;
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      return date <= eighteenYearsAgo;
    }, 'Must be at least 18 years old'),
  // hi, en, mr, etc. — ISO-639-1 codes (we accept any 2-letter lowercase).
  languagesSpoken: z.array(z.string().length(2)).min(1).max(8),
  currentAddress: z.string().trim().min(10).max(500),
  // City + area updated on the User row (denormalized for fast lookup).
  city: z.string().trim().min(2).max(50).optional(),
  area: z.string().trim().min(2).max(100).optional(),
});

// ─── Step 2: Profile photo ────────────────────────────────────────────
// Photo upload uses multipart/form-data → handled by the route, not zod.
// This schema is the JSON wrapper after the file is uploaded to S3.
export const PhotoConfirmSchema = z.object({
  url: z.string().url(),
});

// ─── Step 3: Services & pricing ───────────────────────────────────────
export const ServiceOfferingInputSchema = z.object({
  categoryId: UuidSchema,
  // Custom price in paise. Optional — null means "use category default".
  customPrice: z.number().int().min(0).max(10_000_00).nullable().optional(),
  experienceYears: z.number().int().min(0).max(60).default(0),
});

export const ServicesInputSchema = z.object({
  // 1-8 categories per pro — keeps quality tight + UI fits comfortably.
  services: z.array(ServiceOfferingInputSchema).min(1).max(8),
});

// ─── Step 4: Working area ─────────────────────────────────────────────
export const AreaInputSchema = z.object({
  lat: LatitudeSchema,
  lng: LongitudeSchema,
  radiusKm: z.number().int().min(2).max(25),
});

// ─── Step 5: Schedule ─────────────────────────────────────────────────
export const ScheduleSlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6), // 0=Sun..6=Sat
    startTime: z.string().regex(/^\d{2}:\d{2}$/), // "09:00"
    endTime: z.string().regex(/^\d{2}:\d{2}$/), // "20:00"
    isAvailable: z.boolean().default(true),
  })
  .refine((s) => s.startTime < s.endTime, {
    message: 'startTime must be before endTime',
  });

export const ScheduleInputSchema = z.object({
  // Exactly 7 entries — one per day. Use isAvailable=false for off-days.
  slots: z.array(ScheduleSlotSchema).length(7),
});

// ─── Step 9 (admin): Approve / Reject ─────────────────────────────────
export const ApproveInputSchema = z.object({
  note: z.string().trim().max(500).optional(),
});

export const RejectInputSchema = z.object({
  reason: z.string().trim().min(10).max(500),
  // Which steps to send the pro back to fix. Subset of:
  // ['personal','photo','services','area','schedule','aadhaar','pan','bank','police']
  fields: z.array(z.string()).min(1).max(9),
});

export const PendingApprovalsQuerySchema = z.object({
  status: z
    .enum(['submitted_for_review', 'rejected', 'approved', 'all'])
    .default('submitted_for_review'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
