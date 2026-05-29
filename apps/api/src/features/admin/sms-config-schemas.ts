import { z } from 'zod';

export const SmsProviderName = z.enum(['mock', 'smartping', 'twofactor', 'msg91']);

export const SmartPingFieldsSchema = z.object({
  username: z.string().trim().default(''),
  password: z.string().default(''),
  sender: z.string().trim().default(''),
  dltContentId: z.string().trim().default(''),
  dltPrincipalEntityId: z.string().trim().default(''),
  template: z
    .string()
    .trim()
    .refine((t) => t === '' || t.includes('{OTP}'), {
      message: 'template must include the literal {OTP} placeholder',
    })
    .default(''),
});

export const TwoFactorFieldsSchema = z.object({
  apiKey: z.string().default(''),
  templateName: z.string().trim().default(''),
});

export const Msg91FieldsSchema = z.object({
  authKey: z.string().default(''),
  templateId: z.string().trim().default(''),
  senderId: z.string().trim().default(''),
});

export const SmsConfigSchema = z.object({
  provider: SmsProviderName,
  smartping: SmartPingFieldsSchema,
  twofactor: TwoFactorFieldsSchema,
  msg91: Msg91FieldsSchema,
});

export type SmsConfig = z.infer<typeof SmsConfigSchema>;

export const TestSmsInputSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{10,15}$/, 'phone must be 10–15 digits (optional + prefix)'),
  draftConfig: SmsConfigSchema.optional(),
});

export type TestSmsInput = z.infer<typeof TestSmsInputSchema>;

const MASK = '••••••';

/** Mask credential-like fields before returning config to admin UI. */
export function maskSmsConfig(c: SmsConfig): SmsConfig {
  return {
    provider: c.provider,
    smartping: {
      ...c.smartping,
      password: c.smartping.password ? MASK : '',
    },
    twofactor: {
      ...c.twofactor,
      apiKey: c.twofactor.apiKey ? MASK : '',
    },
    msg91: {
      ...c.msg91,
      authKey: c.msg91.authKey ? MASK : '',
    },
  };
}

/**
 * Merge an incoming (possibly partially-masked) edit on top of the saved
 * config: any field equal to the mask sentinel keeps the existing value.
 * This way admins can edit the template without re-typing the password.
 */
export function mergeMaskedEdit(saved: SmsConfig, incoming: SmsConfig): SmsConfig {
  return {
    provider: incoming.provider,
    smartping: {
      ...incoming.smartping,
      password:
        incoming.smartping.password === MASK
          ? saved.smartping.password
          : incoming.smartping.password,
    },
    twofactor: {
      ...incoming.twofactor,
      apiKey:
        incoming.twofactor.apiKey === MASK ? saved.twofactor.apiKey : incoming.twofactor.apiKey,
    },
    msg91: {
      ...incoming.msg91,
      authKey: incoming.msg91.authKey === MASK ? saved.msg91.authKey : incoming.msg91.authKey,
    },
  };
}

export { MASK as SMS_CONFIG_MASK };
