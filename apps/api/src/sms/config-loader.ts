import { prisma } from '@sevalink/db';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { SmsConfigSchema, type SmsConfig } from '../features/admin/sms-config-schemas.js';

/**
 * Build an SmsConfig from the env vars currently loaded at boot. Used as
 * a fallback when the `sms_config` row in `app_config` is missing — so a
 * fresh local dev environment keeps working without first seeding the DB.
 */
function configFromEnv(): SmsConfig {
  return {
    provider: env.SMS_PROVIDER,
    smartping: {
      username: env.SMARTPING_USERNAME ?? '',
      password: env.SMARTPING_PASSWORD ?? '',
      sender: env.SMARTPING_SENDER ?? '',
      dltContentId: env.SMARTPING_DLT_CONTENT_ID ?? '',
      dltPrincipalEntityId: env.SMARTPING_DLT_PRINCIPAL_ENTITY_ID ?? '',
      template: env.SMARTPING_TEMPLATE ?? '',
    },
    twofactor: {
      apiKey: env.TWOFACTOR_API_KEY ?? '',
      templateName: env.TWOFACTOR_TEMPLATE_NAME ?? '',
    },
    msg91: {
      authKey: env.MSG91_AUTH_KEY ?? '',
      templateId: env.MSG91_TEMPLATE_ID ?? '',
      senderId: env.MSG91_SENDER_ID,
    },
  };
}

/**
 * Read sms_config from app_config. If missing or malformed, falls back
 * to env-derived config. Never throws — auth must keep working even if
 * the DB row is bad.
 */
export async function loadSmsConfig(): Promise<SmsConfig> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { key: 'sms_config' } });
    if (!row) return configFromEnv();
    const parsed = SmsConfigSchema.safeParse(row.value);
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues },
        'sms_config row failed validation — using env fallback',
      );
      return configFromEnv();
    }
    return parsed.data;
  } catch (err) {
    logger.error({ err }, 'sms_config load failed — using env fallback');
    return configFromEnv();
  }
}

export { configFromEnv as smsConfigFromEnv };
