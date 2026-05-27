import { prisma } from '@sevalink/db';
import type { User, UserRole } from '@sevalink/db';
import { AuthError, ErrorCode } from '@sevalink/types';
import { generateReferralCode, randomToken } from '@sevalink/utils';
import { redis } from '../../redis.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type AccessTokenPayload,
} from './jwt.js';

const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — must match JWT_REFRESH_EXPIRY

function refreshKey(userId: string, jti: string): string {
  return `refresh:${userId}:${jti}`;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  user: Pick<User, 'id' | 'phone' | 'role' | 'fullName' | 'isVerified'>;
}

/**
 * Find user by phone, or create a new one with a unique referral code.
 * Returns the user record.
 */
export async function findOrCreateUser(args: {
  phone: string;
  role: UserRole;
  fullName?: string;
  referredByCode?: string;
}): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { phone: args.phone } });
  if (existing) {
    if (!existing.isActive) {
      throw new AuthError(ErrorCode.SL_109_ACCOUNT_DISABLED, 'Account disabled');
    }
    return existing;
  }

  // Admin accounts are NEVER auto-provisioned — they must be seeded via
  // scripts/create-admin.mjs. This prevents random phone numbers from
  // logging into the admin console even with a valid OTP.
  if (args.role === 'admin') {
    throw new AuthError(ErrorCode.SL_107_USER_NOT_FOUND, 'No admin account for this number.');
  }

  // First-time login → create user
  let referredById: string | null = null;
  if (args.referredByCode) {
    const referrer = await prisma.user.findUnique({
      where: { referralCode: args.referredByCode },
      select: { id: true },
    });
    referredById = referrer?.id ?? null;
  }

  // Generate a unique referral code (retry on extremely-rare collision)
  let referralCode = generateReferralCode();
  for (let i = 0; i < 3; i++) {
    const clash = await prisma.user.findUnique({
      where: { referralCode },
      select: { id: true },
    });
    if (!clash) break;
    referralCode = generateReferralCode();
  }

  const user = await prisma.user.create({
    data: {
      phone: args.phone,
      role: args.role,
      fullName: args.fullName ?? 'New User',
      referralCode,
      ...(referredById ? { referredById } : {}),
    },
  });

  // Pros need a Professional row before /pros/me, /verify/*, and the
  // matcher will work — create one with empty defaults so the Pro app's
  // KYC flow starts cleanly on first login. All KYC flags default to
  // false in the schema, so the Pro will see "0 of 4 verified" until
  // they walk through the Setu flow.
  if (args.role === 'professional') {
    await prisma.professional.create({
      data: { userId: user.id },
    });
  }

  return user;
}

/**
 * Issue a fresh access + refresh token pair for a user.
 * Refresh token's jti is stored in Redis with TTL (allow-list strategy).
 */
export async function issueTokenPair(user: User): Promise<TokenPair> {
  const payload: AccessTokenPayload = {
    sub: user.id,
    role: user.role,
    phone: user.phone,
  };

  const jti = randomToken(16);
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken({ sub: user.id, jti }),
  ]);

  await redis.set(refreshKey(user.id, jti), '1', 'EX', REFRESH_TTL_SECONDS);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      fullName: user.fullName,
      isVerified: user.isVerified,
    },
  };
}

/**
 * Rotate: verify the incoming refresh token, ensure it's still allow-listed,
 * revoke it, and issue a new pair. Anti-replay: if the same jti is presented
 * twice, the second use fails (it's already deleted from Redis).
 */
export async function rotateRefreshToken(token: string): Promise<TokenPair> {
  const payload = await verifyRefreshToken(token);

  // Atomic check-and-delete prevents race-condition replay
  const wasAllowed = await redis.del(refreshKey(payload.sub, payload.jti));
  if (wasAllowed !== 1) {
    throw new AuthError(ErrorCode.SL_104_INVALID_TOKEN, 'Refresh token revoked or unknown');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AuthError(ErrorCode.SL_107_USER_NOT_FOUND, 'User not found');
  }
  if (!user.isActive) {
    throw new AuthError(ErrorCode.SL_109_ACCOUNT_DISABLED, 'Account disabled');
  }

  return issueTokenPair(user);
}

/**
 * Revoke a refresh token (logout). Idempotent — silent if already revoked.
 */
export async function revokeRefreshToken(token: string): Promise<void> {
  try {
    const payload = await verifyRefreshToken(token);
    await redis.del(refreshKey(payload.sub, payload.jti));
  } catch {
    // Expired / malformed tokens are already "logged out" — silent success
  }
}
