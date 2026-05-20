import { generateOtp, sha256, timingSafeEqual } from '@sevalink/utils';
import { redis } from '../../redis.js';
import { logger } from '../../logger.js';

const OTP_TTL_SECONDS = 10 * 60; // 10 min
const MAX_VERIFY_ATTEMPTS = 5;

function otpKey(phone: string): string {
  return `otp:${phone}`;
}
function attemptsKey(phone: string): string {
  return `otp:attempts:${phone}`;
}

export interface CreateOtpResult {
  otp: string;
  expiresInSeconds: number;
}

/**
 * Create a fresh OTP, store its hash in Redis with TTL, and return the plain
 * OTP so the SMS provider can deliver it. The plain value is NEVER persisted.
 */
export async function createOtp(phone: string): Promise<CreateOtpResult> {
  const otp = generateOtp();
  const hash = sha256(otp);
  await redis
    .multi()
    .set(otpKey(phone), hash, 'EX', OTP_TTL_SECONDS)
    .del(attemptsKey(phone))
    .exec();
  logger.debug({ phone }, 'otp issued');
  return { otp, expiresInSeconds: OTP_TTL_SECONDS };
}

export type VerifyOtpResult =
  | { status: 'ok' }
  | { status: 'invalid'; remainingAttempts: number }
  | { status: 'expired' }
  | { status: 'too_many_attempts' };

/**
 * Verify a submitted OTP using timing-safe comparison.
 * Increments attempt counter on failure; after MAX_VERIFY_ATTEMPTS the OTP is
 * burned (deleted) and the caller is locked out until they request a new one.
 */
export async function verifyOtp(phone: string, submitted: string): Promise<VerifyOtpResult> {
  const stored = await redis.get(otpKey(phone));
  if (!stored) {
    return { status: 'expired' };
  }

  const attempts = await redis.incr(attemptsKey(phone));
  if (attempts === 1) {
    // First failure — set TTL so counter doesn't live forever
    await redis.expire(attemptsKey(phone), OTP_TTL_SECONDS);
  }
  if (attempts > MAX_VERIFY_ATTEMPTS) {
    await redis.del(otpKey(phone));
    return { status: 'too_many_attempts' };
  }

  if (!timingSafeEqual(stored, sha256(submitted))) {
    return { status: 'invalid', remainingAttempts: MAX_VERIFY_ATTEMPTS - attempts };
  }

  // Success — burn the OTP so it can't be replayed
  await redis.multi().del(otpKey(phone)).del(attemptsKey(phone)).exec();
  return { status: 'ok' };
}
