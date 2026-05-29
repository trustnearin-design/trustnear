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
  const existing = await prisma.user.findUnique({
    where: { phone: args.phone },
    include: { professional: { select: { id: true } } },
  });
  if (existing) {
    if (!existing.isActive) {
      throw new AuthError(ErrorCode.SL_109_ACCOUNT_DISABLED, 'Account disabled');
    }

    // Block role-downgrade and admin-impersonation: customer can become
    // professional (people sign up as customer first then later as pro), but
    // a pro can't downgrade to customer here, and no one can become admin
    // via OTP login.
    if (args.role === 'admin' && existing.role !== 'admin') {
      throw new AuthError(ErrorCode.SL_107_USER_NOT_FOUND, 'No admin account for this number.');
    }
    if (existing.role === 'professional' && args.role === 'customer') {
      throw new AuthError(
        ErrorCode.SL_108_FORBIDDEN,
        'This number is already registered as a professional. Open the Pro app.',
      );
    }
    // Admin numbers must use the admin console — silently issuing a Pro/
    // Customer token for an admin breaks the apps (their middleware checks
    // role, so /pros/* and /me return 403 → infinite loader). Force a
    // clear-error sign-out instead.
    if (existing.role === 'admin' && args.role !== 'admin') {
      throw new AuthError(
        ErrorCode.SL_108_FORBIDDEN,
        'This number is registered as an admin. Use the admin console — or sign up with a different phone for the Customer / Pro app.',
      );
    }

    // Customer logging in via Pro app for the first time → promote to
    // professional + auto-create Professional row so the wizard can start.
    if (existing.role === 'customer' && args.role === 'professional') {
      return prisma.user.update({
        where: { id: existing.id },
        data: existing.professional
          ? { role: 'professional' }
          : { role: 'professional', professional: { create: {} } },
      });
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
