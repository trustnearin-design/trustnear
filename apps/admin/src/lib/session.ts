import { cookies } from 'next/headers';
import { env } from './env';

/**
 * Session shape stored in the httpOnly cookie. We keep access + refresh tokens
 * together so server-side fetches can swap them transparently. The cookie is
 * encrypted by Next at the transport layer (httpOnly + secure in prod) and
 * never exposed to client JS.
 */
export type AdminSubRole = 'super' | 'ops' | 'finance' | 'support';

export type AdminSession = {
  userId: string;
  fullName: string | null;
  phone: string;
  adminRole: AdminSubRole;
  accessToken: string;
  refreshToken: string;
};

const MAX_AGE_DAYS = 30;

export async function readSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const raw = store.get(env.sessionCookieName)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    if (!parsed.userId || !parsed.accessToken || !parsed.refreshToken) return null;
    // Backfill adminRole for sessions written before Phase F — every
    // existing admin gets treated as super until they re-login. Their
    // next verify-otp call writes the real value to the cookie.
    const adminRole: AdminSubRole =
      parsed.adminRole === 'ops' || parsed.adminRole === 'finance' || parsed.adminRole === 'support'
        ? parsed.adminRole
        : 'super';
    return {
      userId: parsed.userId,
      fullName: parsed.fullName ?? null,
      phone: parsed.phone ?? '',
      adminRole,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    };
  } catch {
    return null;
  }
}

export async function writeSession(session: AdminSession): Promise<void> {
  const store = await cookies();
  store.set({
    name: env.sessionCookieName,
    value: JSON.stringify(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(env.sessionCookieName);
}
