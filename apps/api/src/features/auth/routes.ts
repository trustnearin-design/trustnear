import { Hono } from 'hono';
import { validator } from '../../shared/validator.js';
import { RateLimitError, ErrorCode, AuthError } from '@sevalink/types';
import { rateLimit } from '../../shared/rate-limit.js';
import { success } from '../../shared/responses.js';
import { smsProvider } from '../../sms/index.js';
import { logger } from '../../logger.js';
import {
  SendOtpInputSchema,
  VerifyOtpInputSchema,
  RefreshTokenInputSchema,
  LogoutInputSchema,
} from './schemas.js';
import { createOtp, isTestOtpPhone, verifyOtp } from './otp.js';
import {
  findOrCreateUser,
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
} from './service.js';

const auth = new Hono();

/**
 * POST /auth/send-otp
 * Rate limited: 3 requests per phone per hour.
 */
auth.post('/send-otp', validator('json', SendOtpInputSchema), async (c) => {
  const { phone } = c.req.valid('json');

  // TEST-whitelisted phones bypass the rate limit entirely — no SMS is
  // dispatched for them (the tester knows TEST_OTP_CODE out-of-band) so
  // there's no abuse vector to prevent. Real-SMS phones keep the 3/hour
  // limit to protect the SMS bill + the user from spam.
  const testPhone = isTestOtpPhone(phone);
  if (!testPhone) {
    const limit = await rateLimit({
      key: `otp:send:${phone}`,
      limit: 3,
      windowSeconds: 3600,
    });
    c.header('X-RateLimit-Limit', String(limit.limit));
    c.header('X-RateLimit-Remaining', String(limit.remaining));
    c.header('X-RateLimit-Reset', String(limit.resetAt));

    if (!limit.allowed) {
      throw new RateLimitError('Too many OTP requests. Try again later.', {
        resetAt: limit.resetAt,
      });
    }
  }

  const { otp, expiresInSeconds } = await createOtp(phone);

  if (testPhone) {
    logger.warn({ phone }, 'otp: TEST phone — skipping rate limit AND SMS provider');
  } else {
    await smsProvider.sendOtp({ phone, otp });
    logger.info({ phone, provider: smsProvider.name }, 'otp sent');
  }

  return success(c, { phone, expiresInSeconds });
});

/**
 * POST /auth/verify-otp
 * Verifies OTP, creates user if first time, issues access + refresh tokens.
 */
auth.post('/verify-otp', validator('json', VerifyOtpInputSchema), async (c) => {
  const input = c.req.valid('json');

  const result = await verifyOtp(input.phone, input.otp);
  switch (result.status) {
    case 'expired':
      throw new AuthError(ErrorCode.SL_102_OTP_EXPIRED, 'OTP expired or not found');
    case 'too_many_attempts':
      throw new AuthError(
        ErrorCode.SL_103_OTP_RATE_LIMITED,
        'Too many failed attempts. Request a new OTP.',
      );
    case 'invalid':
      throw new AuthError(ErrorCode.SL_101_INVALID_OTP, 'Incorrect OTP', {
        remainingAttempts: result.remainingAttempts,
      });
    case 'ok':
      break;
  }

  const user = await findOrCreateUser({
    phone: input.phone,
    role: input.role,
    ...(input.fullName ? { fullName: input.fullName } : {}),
    ...(input.referralCode ? { referredByCode: input.referralCode } : {}),
  });

  const tokens = await issueTokenPair(user);
  logger.info({ userId: user.id, role: user.role }, 'auth: tokens issued');
  return success(c, tokens);
});

/**
 * POST /auth/refresh
 * Rotates the refresh token (old one is revoked, new pair issued).
 */
auth.post('/refresh', validator('json', RefreshTokenInputSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  const tokens = await rotateRefreshToken(refreshToken);
  return success(c, tokens);
});

/**
 * POST /auth/logout
 * Revokes the refresh token. Idempotent.
 */
auth.post('/logout', validator('json', LogoutInputSchema), async (c) => {
  const { refreshToken } = c.req.valid('json');
  await revokeRefreshToken(refreshToken);
  return success(c, { loggedOut: true });
});

export default auth;
