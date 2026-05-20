/**
 * SMS provider abstraction — every implementation must satisfy this contract.
 * Swap providers (MSG91, Twilio, mock) by changing one wiring in sms/index.ts;
 * no caller code changes.
 */
export interface SendOtpParams {
  phone: string; // E.164 format, e.g. +919876543210
  otp: string;
  templateId?: string;
}

export interface SmsProvider {
  /** Provider name for logs/metrics. */
  readonly name: string;
  /** Send an OTP. Throws on send failure. Returns provider-specific message id when available. */
  sendOtp(params: SendOtpParams): Promise<{ providerMessageId: string | null }>;
}
