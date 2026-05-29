import { DomainError, ErrorCode } from '@sevalink/types';
import { loadSmsConfig } from '../../sms/config-loader.js';
import { buildProviderFromConfig, invalidateSmsProviderCache } from '../../sms/index.js';
import { recordAudit } from './audit-service.js';
import { upsertConfig } from './config-service.js';
import { mergeMaskedEdit, maskSmsConfig, type SmsConfig } from './sms-config-schemas.js';

const SMS_CONFIG_KEY = 'sms_config';

export async function getMaskedSmsConfig(): Promise<SmsConfig> {
  const saved = await loadSmsConfig();
  return maskSmsConfig(saved);
}

export async function saveSmsConfig(input: {
  incoming: SmsConfig;
  actorId: string;
  actorRole: 'admin';
  ip: string | null;
  userAgent: string | null;
}): Promise<SmsConfig> {
  const saved = await loadSmsConfig();
  const merged = mergeMaskedEdit(saved, input.incoming);

  // Sanity: building the provider with the merged config must NOT throw
  // when provider != mock — we don't want to save a config that can't be
  // used. Mock is always buildable.
  if (merged.provider !== 'mock') {
    try {
      buildProviderFromConfig(merged);
    } catch (err) {
      throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, (err as Error).message);
    }
  }

  await upsertConfig({
    key: SMS_CONFIG_KEY,
    value: merged as unknown,
    actorId: input.actorId,
  });

  await recordAudit({
    actorId: input.actorId,
    actorRole: input.actorRole,
    action: 'config_change',
    entity: SMS_CONFIG_KEY,
    entityId: SMS_CONFIG_KEY,
    before: maskSmsConfig(saved),
    after: maskSmsConfig(merged),
    ipAddress: input.ip,
    userAgent: input.userAgent,
  });

  invalidateSmsProviderCache();

  return maskSmsConfig(merged);
}

/**
 * Send a test OTP to a phone using either the currently-saved config OR
 * a draft (un-saved) form payload. Admin-only — bypasses rate limit.
 */
export async function sendTestSms(input: {
  phone: string;
  draftConfig?: SmsConfig;
}): Promise<{ provider: string; providerMessageId: string | null }> {
  let config: SmsConfig;
  if (input.draftConfig) {
    // Merge draft onto saved so the mask sentinel keeps the saved cred.
    const saved = await loadSmsConfig();
    config = mergeMaskedEdit(saved, input.draftConfig);
  } else {
    config = await loadSmsConfig();
  }

  let provider;
  try {
    provider = buildProviderFromConfig(config);
  } catch (err) {
    throw new DomainError(ErrorCode.SL_900_VALIDATION_ERROR, (err as Error).message);
  }

  const TEST_OTP = '123456';
  const result = await provider.sendOtp({ phone: input.phone, otp: TEST_OTP });
  return { provider: provider.name, providerMessageId: result.providerMessageId };
}
