import { NextResponse } from 'next/server';
import { env } from './env';
import { readSession, writeSession, clearSession } from './session';

/**
 * Shared helper for Next route handlers that proxy to the SEVALINK API
 * with the admin's bearer token. Handles auto-refresh on 401 — if the
 * API rejects the access token, we hit /auth/refresh once with the
 * stored refresh token, persist the new pair to the cookie, and retry
 * the original request transparently.
 *
 * This is the mutation counterpart to apiFetch's auto-refresh (which
 * works for server-component reads). Both follow the same protocol;
 * route handlers can write cookies directly, so we don't need the
 * redirect-bounce trick here.
 *
 * Usage in a route handler:
 *
 *   export const POST = (req) => proxyJson(req, '/api/v1/admin/foo');
 *   export const PATCH = (req, { params }) =>
 *     proxyJson(req, `/api/v1/admin/foo/${(await params).id}`, 'PATCH');
 */
export async function proxyJson(
  req: Request,
  apiPath: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE' = 'POST',
): Promise<Response> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'SL_104_INVALID_TOKEN', message: 'Not authenticated' } },
      { status: 401 },
    );
  }

  // For GET, forward the incoming query string onto the upstream API
  // (unless apiPath already encodes one). Lets client filters/cursors
  // pass through transparently — caller stays a one-liner.
  let fullPath = apiPath;
  if (method === 'GET' && !apiPath.includes('?')) {
    const search = new URL(req.url).search;
    if (search) fullPath = `${apiPath}${search}`;
  }

  // Read the body once — we may need to replay it on retry. JSON only;
  // for multipart use proxyMultipart instead.
  const bodyText =
    method === 'GET' || method === 'DELETE' ? null : await req.text().catch(() => '');

  const first = await callApi(fullPath, method, session.accessToken, bodyText);
  if (first.status !== 401) return passthrough(first);

  // 401 → try refresh + retry once
  const refreshed = await rotateRefresh(session.refreshToken);
  if (!refreshed) {
    await clearSession();
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SL_104_INVALID_TOKEN', message: 'Session expired. Please sign in again.' },
      },
      { status: 401 },
    );
  }
  await writeSession({
    ...session,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  });

  const retry = await callApi(fullPath, method, refreshed.accessToken, bodyText);
  return passthrough(retry);
}

/**
 * Multipart variant — used by the uploads route. Streams raw bytes +
 * preserves Content-Type (boundary). Same 401 retry logic.
 */
export async function proxyMultipart(req: Request, apiPath: string): Promise<Response> {
  const session = await readSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: 'SL_104_INVALID_TOKEN', message: 'Not authenticated' } },
      { status: 401 },
    );
  }
  const contentType = req.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { success: false, error: { code: 'SL_906', message: 'Expected multipart/form-data' } },
      { status: 400 },
    );
  }
  const buffer = await req.arrayBuffer();

  const send = (token: string) =>
    fetch(`${env.apiBaseUrl}${apiPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: `Bearer ${token}`,
      },
      body: buffer,
    });

  const first = await send(session.accessToken);
  if (first.status !== 401) return passthrough(first);

  const refreshed = await rotateRefresh(session.refreshToken);
  if (!refreshed) {
    await clearSession();
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SL_104_INVALID_TOKEN', message: 'Session expired. Please sign in again.' },
      },
      { status: 401 },
    );
  }
  await writeSession({
    ...session,
    accessToken: refreshed.accessToken,
    refreshToken: refreshed.refreshToken,
  });
  const retry = await send(refreshed.accessToken);
  return passthrough(retry);
}

async function callApi(
  path: string,
  method: string,
  accessToken: string,
  bodyText: string | null,
): Promise<Response> {
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  };
  if (bodyText !== null) init.body = bodyText;
  return fetch(`${env.apiBaseUrl}${path}`, init);
}

async function rotateRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const res = await fetch(`${env.apiBaseUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    success: true;
    data: { accessToken: string; refreshToken: string };
  } | null;
  if (!data?.success || !data.data?.accessToken || !data.data?.refreshToken) return null;
  return { accessToken: data.data.accessToken, refreshToken: data.data.refreshToken };
}

async function passthrough(res: Response): Promise<Response> {
  const text = await res.text();
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { success: false, error: { code: 'SL_904', message: 'Non-JSON API response' } };
    }
  }
  return NextResponse.json(body, { status: res.status });
}
