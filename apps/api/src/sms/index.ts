import { env } from '../env.js';
import { logger } from '../logger.js';
import { MockSmsProvider } from './mock.js';
import type { SmsProvider } from './provider.js';

/**
 * Factory: pick the right SMS provider based on env.
 *
 * Selection rules:
 *   • If MSG91_AUTH_KEY + MSG91_TEMPLATE_ID set → use MSG91 (TODO when DLT clears)
 *   • Else in development/test → MockSmsProvider
 *   • Else in production → CRASH (we never want to "accidentally" not send SMS)
 */
function selectProvider(): SmsProvider {
  // TODO(post-DLT): if (env.MSG91_AUTH_KEY && env.MSG91_TEMPLATE_ID) return new Msg91Provider(...);

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'No production SMS provider configured. Set MSG91_AUTH_KEY + MSG91_TEMPLATE_ID after DLT approval.',
    );
  }

  logger.warn(
    { env: env.NODE_ENV },
    '⚠️  Using MOCK SMS provider — OTPs will be logged, not sent. Approved DLT + MSG91 keys required for prod.',
  );
  return new MockSmsProvider();
}

export const smsProvider: SmsProvider = selectProvider();
export type { SmsProvider } from './provider.js';
