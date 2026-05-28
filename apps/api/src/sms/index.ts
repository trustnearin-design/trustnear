import { env } from '../env.js';
import { logger } from '../logger.js';
import { MockSmsProvider } from './mock.js';
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
