import { DomainError, ErrorCode } from '@sevalink/types';
import { logger } from '../logger.js';
import type { SendOtpParams, SmsProvider } from './provider.js';

/**
 * SmartPing (smartping.ai) SMS provider — Indian TRAI-DLT compliant gateway.
 *
 * Used by SankalpBuilders / Hemanaya Group account with pre-registered
 * DLT template + Principal Entity ID. Sender ID and content are bound to
 * the DLT registration — you can NOT improvise the SMS body or it gets
 * rejected by the TRAI scrubber.
 *
 * Setup env (all required when SMS_PROVIDER=smartping):
 *   SMARTPING_USERNAME              — account username (e.g. SANKALPNEW.trans)
 *   SMARTPING_PASSWORD              — account password
 *   SMARTPING_SENDER                — registered sender ID (e.g. SINDEX, TRUSTN)
 *   SMARTPING_DLT_CONTENT_ID        — template content ID from DLT portal
 *   SMARTPING_DLT_PRINCIPAL_ENTITY_ID — principal entity ID (company DLT reg)
 *   SMARTPING_TEMPLATE              — exact registered template, MUST contain {OTP}
 *                                     placeholder (e.g.
 *                                     "Your OTP for Sankalp is {OTP}. Valid 10 mins. Do not share - Sankalp")
 *
 * API endpoint (GET, idempotent enough for OTP):
 *   https://pgapi.smartping.ai/fe/api/v1/send
 *     ?username=...&password=...&unicode=false&from=...&to=10digit
 *     &dltContentId=...&dltPrincipalEntityId=...&text=<urlencoded body>
 *
 * Response: plain text or JSON ack — we treat HTTP 2xx as success unless
 * the body explicitly contains "error"/"fail" keywords.
 */
export interface SmartPingConfig {
  username: string;
  password: string;
  sender: string;
  dltContentId: string;
  dltPrincipalEntityId: string;
  /**
   * Exact DLT-registered template body. MUST include the literal token
   * `{OTP}` which we substitute with the generated OTP. Everything else
   * (including spaces + punctuation) must match what's registered or
   * TRAI's scrubber will reject the message.
   */
  template: string;
}

export class SmartPingSmsProvider implements SmsProvider {
  readonly name = 'smartping';
  private readonly config: SmartPingConfig;

  constructor(config: SmartPingConfig) {
    if (!config.username || !config.password) {
      throw new Error('SmartPingSmsProvider: username + password required');
    }
    if (!config.template.includes('{OTP}')) {
      throw new Error('SmartPingSmsProvider: template must include {OTP} placeholder');
    }
    this.config = config;
  }

  async sendOtp({ phone, otp }: SendOtpParams): Promise<{ providerMessageId: string | null }> {
    // SmartPing wants the recipient WITHOUT +91 prefix (just 10-digit Indian).
    // For non-Indian numbers we'd need a different DLT-exempt path — not
    // supported in this iteration.
    const indianMatch = phone.match(/^\+?91(\d{10})$/);
    if (!indianMatch) {
      throw new DomainError(
        ErrorCode.SL_900_VALIDATION_ERROR,
        `SmartPing supports +91 (Indian) numbers only — got ${phone}`,
      );
    }
    const tenDigit = indianMatch[1]!;
    const text = this.config.template.replaceAll('{OTP}', otp);

    const params = new URLSearchParams({
      username: this.config.username,
      password: this.config.password,
      unicode: 'false',
      from: this.config.sender,
      to: tenDigit,
      dltContentId: this.config.dltContentId,
      dltPrincipalEntityId: this.config.dltPrincipalEntityId,
      text,
    });
    const url = `https://pgapi.smartping.ai/fe/api/v1/send?${params.toString()}`;

    logger.info({ phone, provider: this.name }, 'smartping: sending OTP');

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/plain, application/json' },
      });
    } catch (err: unknown) {
      throw new DomainError(
        ErrorCode.SL_904_INTERNAL_ERROR,
        `smartping network error: ${(err as Error).message}`,
        502,
      );
    }

    const bodyText = await res.text().catch(() => '');

    // SmartPing returns plain text like "OK|msg-id" on success or
    // "ERROR: <reason>" on failure. Be permissive: HTTP 2xx + no obvious
    // failure word counts as success.
    const failKeyword = /\b(error|fail|invalid|reject|denied|insufficient)\b/i;
    if (!res.ok || failKeyword.test(bodyText)) {
      logger.error(
        { phone, status: res.status, body: bodyText.slice(0, 200) },
        'smartping: send failed',
      );
      throw new DomainError(
        ErrorCode.SL_904_INTERNAL_ERROR,
        `smartping send failed (${res.status}): ${bodyText.slice(0, 200)}`,
        502,
      );
    }

    // Try to extract a message id — SmartPing format varies. Best effort.
    const idMatch = bodyText.match(/[a-z0-9]{8,}/i);
    const providerMessageId = idMatch ? idMatch[0] : null;
    logger.info({ phone, providerMessageId }, 'smartping: OTP sent');
    return { providerMessageId };
  }
}
