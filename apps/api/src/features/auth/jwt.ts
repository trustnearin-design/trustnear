import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../env.js';
import { AuthError, ErrorCode } from '@sevalink/types';

const ACCESS_SECRET = new TextEncoder().encode(env.JWT_SECRET);
const REFRESH_SECRET = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

const ISSUER = 'sevalink-api';
const AUDIENCE = 'sevalink-apps';

export interface AccessTokenPayload {
  sub: string; // user id
  role: 'customer' | 'professional' | 'admin';
  phone: string;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string; // unique id — used as Redis allow-list key
}

/** Expiry strings (env-configurable). jose accepts "15m", "30d" etc. */
const ACCESS_EXPIRY = env.JWT_ACCESS_EXPIRY;
const REFRESH_EXPIRY = env.JWT_REFRESH_EXPIRY;

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ role: payload.role, phone: payload.phone })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_EXPIRY)
    .sign(ACCESS_SECRET);
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ jti: payload.jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(payload.sub)
    .setJti(payload.jti)
    .setIssuedAt()
    .setExpirationTime(REFRESH_EXPIRY)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (
      !payload.sub ||
      typeof payload['role'] !== 'string' ||
      typeof payload['phone'] !== 'string'
    ) {
      throw new AuthError(ErrorCode.SL_104_INVALID_TOKEN, 'Malformed access token');
    }
    return {
      sub: payload.sub,
      role: payload['role'] as AccessTokenPayload['role'],
      phone: payload['phone'],
    };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    // jose throws JWTExpired with code 'ERR_JWT_EXPIRED'
    const code =
      (err as { code?: string }).code === 'ERR_JWT_EXPIRED'
        ? ErrorCode.SL_105_TOKEN_EXPIRED
        : ErrorCode.SL_104_INVALID_TOKEN;
    throw new AuthError(code, 'Invalid or expired access token');
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub || typeof payload.jti !== 'string') {
      throw new AuthError(ErrorCode.SL_104_INVALID_TOKEN, 'Malformed refresh token');
    }
    return { sub: payload.sub, jti: payload.jti };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const code =
      (err as { code?: string }).code === 'ERR_JWT_EXPIRED'
        ? ErrorCode.SL_105_TOKEN_EXPIRED
        : ErrorCode.SL_104_INVALID_TOKEN;
    throw new AuthError(code, 'Invalid or expired refresh token');
  }
}
