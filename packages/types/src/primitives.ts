import { z } from 'zod';

/**
 * Indian phone number — E.164 format with optional +91 prefix.
 * Accepted: +919876543210, 919876543210, 9876543210
 * Normalized output: +919876543210
 */
export const IndianPhoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\+?91)?[6-9]\d{9}$/, 'Invalid Indian mobile number')
      .transform((s) => (s.startsWith('+91') ? s : s.startsWith('91') ? `+${s}` : `+91${s}`)),
  );

export const UuidSchema = z.string().uuid();

export const EmailSchema = z.string().email().toLowerCase().trim();

export const OtpSchema = z.string().regex(/^\d{6}$/, 'OTP must be 6 digits');

/**
 * Money — always stored and validated as paise (integer).
 * Use formatRupees() from @sevalink/utils for display.
 */
export const PaiseSchema = z.number().int().nonnegative();

export const LatitudeSchema = z.number().min(-90).max(90);
export const LongitudeSchema = z.number().min(-180).max(180);

export const GeoPointSchema = z.object({
  latitude: LatitudeSchema,
  longitude: LongitudeSchema,
});

export type GeoPoint = z.infer<typeof GeoPointSchema>;

/**
 * Pincode — Indian 6-digit postal code.
 */
export const IndianPincodeSchema = z.string().regex(/^[1-9]\d{5}$/, 'Invalid Indian pincode');

/**
 * Time of day — HH:MM (24-hour). Stored as string for schedule entries.
 */
export const TimeOfDaySchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:MM (24-hour)');
