import { z } from 'zod';

export const StartDigilockerInputSchema = z.object({
  /** Optional override of the deep-link the Pro app intercepts. Default is
   * 'trustnearpro://kyc/digilocker/callback' set in the service. */
  redirectUrl: z.string().url().optional(),
});

export const CompleteDigilockerInputSchema = z.object({
  requestId: z.string().min(8, 'requestId is required'),
});

export const VerifyPanInputSchema = z.object({
  pan: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{5}\d{4}[A-Za-z]$/, 'Invalid PAN — expected ABCDE1234F format'),
});

export const VerifyBankInputSchema = z.object({
  accountNumber: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Account number must be 9 to 18 digits'),
  ifsc: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/, 'Invalid IFSC — expected ABCD0123456 format'),
});
