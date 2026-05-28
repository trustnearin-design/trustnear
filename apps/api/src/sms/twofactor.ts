import { DomainError, ErrorCode } from '@sevalink/types';
import { logger } from '../logger.js';
import type { SendOtpParams, SmsProvider } from './provider.js';

/**
 * 2Factor.in SMS provider — Indian OTP-specific service.
 *
 * Why 2Factor over MSG91 for our beta:
 *   • OTP transactional SMS in India does NOT need full DLT registration
 *     when using a generic sender ID — straight signup → API key → send
 *   • Branded sender ID (e.g. "TRUSTNR") approval ~3 days (vs MSG91 DLT 2-3 weeks)
 *   • REST API only — no SDK, no webhooks, no complex auth
 *   • ₹0.15/OTP retail; ₹100 free trial credit on signup
 *
 * Setup:
 *   1. Signup at https://2factor.in/account → grab API key from dashboard
 *   2. Create a template via SMS OTP → OTP Templates → Create New
 *      • Template body: "Your TrustNear verification code is XXXX..."
 *      • XXXX is the literal placeholder 2Factor replaces with the actual OTP
 *      • Sender ID (e.g. "TRUSTN" — 6 chars max, alphanumeric) is registered
 *        WITH the template at creation time
 *      • Approval usually instant for OTP templates (vs 3-day for marketing)
 *   3. Set env:
 *        SMS_PROVIDER=twofactor
 *        TWOFACTOR_API_KEY=<key>
 *        TWOFACTOR_TEMPLATE_NAME=<exact template name from 2Factor dashboard>
 *      (sender ID is bound to the template — no separate env needed)
 *
 * API:
 *   GET https://2factor.in/API/V1/{apiKey}/SMS/{phone}/{otp}/{templateName}
 *   → { Status: "Success", Details: "<sessionId>" }
 *   → { Status: "Error", Details: "<error message>" }
 *
 * Without templateName, 2Factor uses a default template + generic sender.
 *
 * Phone format: 2Factor wants 10-digit national or 91XXXXXXXXXX (no + prefix).
 */
export class TwoFactorSmsProvider implements SmsProvider {
  readonly name = '2factor';
  private readonly apiKey: string;
  private readonly templateName: string | null;

  constructor(args: { apiKey: string; templateName?: string | null }) {
    if (!args.apiKey) {
      throw new Error('TwoFactorSmsProvider: apiKey required');
    }
    this.apiKey = args.apiKey;
    // Template name is OPTIONAL — without it, 2Factor uses its default
    // OTP template + generic sender ID. With it, uses the approved
    // template's text + bound sender ID.
    this.templateName = args.templateName ?? null;
  }

  async sendOtp({ phone, otp }: SendOtpParams): Promise<{ providerMessageId: string | null }> {
    // 2Factor expects the phone WITHOUT leading + (e.g. 919876543210 not +919876543210)
    const trimmed = phone.replace(/^\+/, '');

    // Build path components. Template name comes after otp (positional, not query).
    const pathParts: string[] = [
      'API',
      'V1',
      encodeURIComponent(this.apiKey),
      'SMS',
      encodeURIComponent(trimmed),
      encodeURIComponent(otp),
    ];
    if (this.templateName) {
      pathParts.push(encodeURIComponent(this.templateName));
    }

    const fullUrl = `https://2factor.in/${pathParts.join('/')}`;

    logger.info(
      { phone, provider: this.name, template: this.templateName },
      '2factor: sending OTP',
    );

    const res = await fetch(fullUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    }).catch((err: unknown) => {
      throw new DomainError(
        ErrorCode.SL_904_INTERNAL_ERROR,
        `2factor network error: ${(err as Error).message}`,
        502,
      );
    });

    const body = (await res.json().catch(() => null)) as {
      Status: 'Success' | 'Error';
      Details: string;
    } | null;

    if (!body) {
      throw new DomainError(
        ErrorCode.SL_904_INTERNAL_ERROR,
        `2factor empty response (HTTP ${res.status})`,
        502,
      );
    }
    if (body.Status !== 'Success') {
      logger.error({ phone, details: body.Details }, '2factor: send failed');
      throw new DomainError(
        ErrorCode.SL_904_INTERNAL_ERROR,
        `2factor send failed: ${body.Details}`,
        502,
      );
    }

    logger.info({ phone, sessionId: body.Details }, '2factor: OTP sent');
    return { providerMessageId: body.Details };
  }
}
