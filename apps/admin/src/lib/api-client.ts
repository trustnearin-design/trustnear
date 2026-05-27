'use client';

/**
 * Client-side API helper. Hits the Next route proxies under /api/admin/*,
 * which forward to the SEVALINK API with the admin's bearer token from
 * the httpOnly cookie. Browser never sees the token.
 *
 * Use this from Client Components + TanStack Query. Server Components
 * should keep using `apiFetch` from ./api which talks to the API directly.
 */

type ApiOk<T> = { success: true; data: T };
type ApiErr = { success: false; error: { code: string; message: string } };

export class ClientApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ClientApiError';
  }
}

export async function clientFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(path, {
    ...init,
    headers,
    cache: 'no-store',
    credentials: 'include',
  });
  const body = (await res.json().catch(() => ({}))) as ApiOk<T> | ApiErr;

  if (res.status === 401) {
    // Session expired — surface to caller so they can redirect to /login.
    // We don't auto-redirect here because mutations may want to retry first.
    throw new ClientApiError('SL_104_INVALID_TOKEN', 'Session expired', 401);
  }

  if (res.ok && 'success' in body && body.success) {
    return body.data;
  }

  const err = 'error' in body ? body.error : { code: 'UNKNOWN', message: res.statusText };
  throw new ClientApiError(err.code, err.message, res.status);
}

/** Build a query string from a record, skipping null/undefined/empty values. */
export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
