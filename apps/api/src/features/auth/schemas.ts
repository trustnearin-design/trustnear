import { z } from 'zod';
import { IndianPhoneSchema, OtpSchema } from '@sevalink/types';

export const SendOtpInputSchema = z.object({
  phone: IndianPhoneSchema,
  role: z.enum(['customer', 'professional', 'admin']).default('customer'),
});

export const VerifyOtpInputSchema = z.object({
  phone: IndianPhoneSchema,
  otp: OtpSchema,
  role: z.enum(['customer', 'professional', 'admin']).default('customer'),
  fullName: z.string().trim().min(2).max(100).optional(),
  referralCode: z.string().trim().min(4).max(20).optional(),
});

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().min(20),
});

export const LogoutInputSchema = z.object({
  refreshToken: z.string().min(20),
});
