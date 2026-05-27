import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger } from '../logger.js';
import type { SendOtpParams, SmsProvider } from './provider.js';

/**
 * MockSmsProvider — for dev/test only. Logs the OTP to console with a
 * prominent banner so devs can see it without breaking the flow.
 * NEVER deploy this to staging/prod; the prod factory enforces this.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';

  async sendOtp({ phone, otp }: SendOtpParams): Promise<{ providerMessageId: string | null }> {
    logger.warn(
      { provider: this.name, phone, otp },
      `┌───────────────────────────────────────────┐
│  📱 MOCK SMS — OTP for ${phone}
│  OTP: ${otp}
│  (Provider is mock; swap to MSG91 in prod)
└───────────────────────────────────────────┘`,
    );
    // Dev-only: mirror the OTP to a file so an external tool/agent can read it
    // without needing the API server's stdout. Path is gitignored.
    try {
      await writeFile(
        join(process.cwd(), '.last-otp.txt'),
        `${new Date().toISOString()} ${phone} ${otp}\n`,
        'utf8',
      );
    } catch {
      // best-effort; never block the auth flow on a file-write failure
    }
    return { providerMessageId: `mock-${Date.now().toString(36)}` };
  }
}
