import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { readSession, writeSession, clearSession } from '@/lib/session';

/**
 * GET /api/auth/refresh?next=/dashboard
 *
 * Rotates the API refresh token + persists the new pair to the session
 * cookie. Cookies CAN be modified here (route handler context, unlike
 * server components). On success → 302 to `next`. On failure → /login.
 *
 * Called by apiFetch when it sees a 401 from an authed request.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') ?? '/dashboard';
  // Safety: only allow same-origin paths (prevent open-redirect).
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  const session = await readSession();
  if (!session?.refreshToken) {
    await clearSession();
    return NextResponse.redirect(new URL('/login?expired=1', req.url));
  }

  const apiRes = await fetch(`${env.apiBaseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    cache: 'no-store',
  }).catch(() => null);

  if (!apiRes || !apiRes.ok) {
    await clearSession();
    return NextResponse.redirect(new URL('/login?expired=1', req.url));
  }

  const data = (await apiRes.json().catch(() => null)) as {
    success: true;
    data: { accessToken: string; refreshToken: string };
  } | null;

  if (!data?.success || !data.data?.accessToken || !data.data?.refreshToken) {
    await clearSession();
    return NextResponse.redirect(new URL('/login?expired=1', req.url));
  }

  await writeSession({
    ...session,
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
  });

  return NextResponse.redirect(new URL(safeNext, req.url));
}
