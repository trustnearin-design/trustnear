import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { env } from './env';
import { readSession } from './session';

type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; error: { code: string; message: string } };

/**
 * Server-side fetch wrapper for the SEVALINK API. Always attaches the
 * admin's bearer token from the session cookie when present.
 *
 * Auto-refresh: server components CANNOT modify cookies (Next 15 rule).
 * So when we see a 401 we redirect to the /api/auth/refresh route handler,
 * which CAN write cookies. That handler refreshes + redirects back to the
 * current URL — from the user's POV, the page just loads with a fresh
 * token, no re-login needed.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit & { skipAuth?: boolean } = {},
): Promise<T> {
  const session = init.skipAuth ? null : await readSession();
  const { res, body } = await callOnce<T>(path, init, session?.accessToken);

  // Happy path
  if (res.ok && (!('success' in body) || body.success !== false)) {
    return (body as ApiOk<T>).data;
  }

  // Token expired or invalid → bounce through refresh route handler
  const errCode = 'error' in body ? body.error.code : '';
  const isAuthError =
    res.status === 401 || errCode === 'SL_104_INVALID_TOKEN' || errCode === 'SL_105_TOKEN_EXPIRED';

  if (isAuthError && session?.refreshToken && !init.skipAuth) {
    const currentPath = await getCurrentPath();
    redirect(`/api/auth/refresh?next=${encodeURIComponent(currentPath)}`);
  }

  // Non-auth error or no refresh token → propagate
  if (isAuthError) {
    // No refresh token available → straight to login
    redirect('/login?expired=1');
  }

  const err = 'error' in body ? body.error : { code: 'UNKNOWN', message: res.statusText };
  throw new ApiError(err.code, err.message, res.status);
}

async function callOnce<T>(
  path: string,
  init: RequestInit,
  accessToken: string | undefined,
): Promise<{ res: Response; body: ApiOk<T> | ApiErr }> {
  const reqHeaders = new Headers(init.headers);
  reqHeaders.set('Content-Type', 'application/json');
  if (accessToken) {
    reqHeaders.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(`${env.apiBaseUrl}${path}`, {
    ...init,
    headers: reqHeaders,
    cache: 'no-store',
  });
  const body = (await res.json().catch(() => ({}))) as ApiOk<T> | ApiErr;
  return { res, body };
}

/**
 * Best-effort reconstruction of the current URL path so we can return
 * here after the refresh handler. Falls back to /dashboard.
 */
async function getCurrentPath(): Promise<string> {
  try {
    const h = await headers();
    // Next sets a few hints — prefer x-invoke-path / referer.
    const invokePath = h.get('x-invoke-path');
    if (invokePath) return invokePath;
    const referer = h.get('referer');
    if (referer) {
      const u = new URL(referer);
      return u.pathname + u.search;
    }
  } catch {
    // headers() unavailable outside server context — fall through
  }
  return '/dashboard';
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
