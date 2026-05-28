import { env } from '../env.js';
import { logger } from '../logger.js';
import { MockSmsProvider } from './mock.js';
import { SmartPingSmsProvider } from './smartping.js';
import { TwoFactorSmsProvider } from './twofactor.js';
import type { SmsProvider } from './provider.js';

/**
 * Factory: pick the SMS provider based on env.SMS_PROVIDER.
 *
 *   mock      → console + .last-otp.txt (dev/test only)
 *   twofactor → 2Factor.in REST API (beta + production — no full DLT needed)
 *   msg91     → MSG91 (post-DLT approval — not yet implemented)
 *
 * Production safety net: if provider is `mock` AND NODE_ENV is production,
 * we crash on boot rather than silently fail to deliver OTPs.
 */
function selectProvider(): SmsProvider {
  switch (env.SMS_PROVIDER) {
    case 'smartping': {
      const missing: string[] = [];
      if (!env.SMARTPING_USERNAME) missing.push('SMARTPING_USERNAME');
      if (!env.SMARTPING_PASSWORD) missing.push('SMARTPING_PASSWORD');
      if (!env.SMARTPING_SENDER) missing.push('SMARTPING_SENDER');
      if (!env.SMARTPING_DLT_CONTENT_ID) missing.push('SMARTPING_DLT_CONTENT_ID');
      if (!env.SMARTPING_DLT_PRINCIPAL_ENTITY_ID) missing.push('SMARTPING_DLT_PRINCIPAL_ENTITY_ID');
      if (!env.SMARTPING_TEMPLATE) missing.push('SMARTPING_TEMPLATE');
      if (missing.length > 0) {
        throw new Error(`SMS_PROVIDER=smartping missing env: ${missing.join(', ')}`);
      }
      logger.info(
        { provider: 'smartping', sender: env.SMARTPING_SENDER },
        'sms: using SmartPing.ai provider',
      );
      return new SmartPingSmsProvider({
        username: env.SMARTPING_USERNAME!,
        password: env.SMARTPING_PASSWORD!,
        sender: env.SMARTPING_SENDER!,
        dltContentId: env.SMARTPING_DLT_CONTENT_ID!,
        dltPrincipalEntityId: env.SMARTPING_DLT_PRINCIPAL_ENTITY_ID!,
        template: env.SMARTPING_TEMPLATE!,
      });
    }

    case 'twofactor': {
      if (!env.TWOFACTOR_API_KEY) {
        throw new Error('SMS_PROVIDER=twofactor but TWOFACTOR_API_KEY is unset');
      }
      logger.info(
        { provider: '2factor', template: env.TWOFACTOR_TEMPLATE_NAME ?? '(default)' },
        'sms: using 2Factor.in provider',
      );
      return new TwoFactorSmsProvider({
        apiKey: env.TWOFACTOR_API_KEY,
        templateName: env.TWOFACTOR_TEMPLATE_NAME ?? null,
      });
    }

    case 'msg91': {
      // TODO(post-DLT): wire Msg91Provider once DLT is approved
      throw new Error('SMS_PROVIDER=msg91 selected but Msg91Provider not yet implemented');
    }

    case 'mock':
    default: {
      if (env.NODE_ENV === 'production') {
        throw new Error(
          'No production SMS provider configured. Set SMS_PROVIDER=twofactor + TWOFACTOR_API_KEY, or SMS_PROVIDER=msg91 with DLT keys.',
        );
      }
      logger.warn(
        { env: env.NODE_ENV },
        '⚠️  Using MOCK SMS provider — OTPs will be logged, not sent. Set SMS_PROVIDER=twofactor for real SMS.',
      );
      return new MockSmsProvider();
    }
  }
}

export const smsProvider: SmsProvider = selectProvider();
export type { SmsProvider } from './provider.js';
