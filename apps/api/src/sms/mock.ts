import { logger } from '../logger.js';
import type { SendOtpParams, SmsProvider } from './provider.js';

/**
 * MockSmsProvider — for dev/test only. Logs the OTP to console with a
 * prominent banner so devs can see it without breaking the flow.
 * NEVER deploy this to staging/prod; the prod factory enforces this.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  // eslint-disable-next-line @typescript-eslint/require-await
  async sendOtp({ phone, otp }: SendOtpParams): Promise<{ providerMessageId: string | null }> {
    logger.warn(
      { provider: this.name, phone, otp },
      `┌───────────────────────────────────────────┐
│  📱 MOCK SMS — OTP for ${phone}
│  OTP: ${otp}
│  (Provider is mock; swap to MSG91 in prod)
└───────────────────────────────────────────┘`,
    );
    return { providerMessageId: `mock-${Date.now().toString(36)}` };
  }
}
