import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * Proxies to the SEVALINK API's /auth/send-otp. Keeps API URLs server-side
 * (the browser never learns where the API lives, which simplifies CORS and
 * lets us swap backends without a client release).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/api/v1/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SL_904_API_UNREACHABLE',
          message: `Cannot reach API at ${env.apiBaseUrl}. Is the API server running on port 3000?`,
          details: { reason: err instanceof Error ? err.message : String(err) },
        },
      },
      { status: 502 },
    );
  }
  const raw = await res.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SL_904_BAD_RESPONSE',
          message: `API returned non-JSON (status ${res.status}).`,
          details: { snippet: raw.slice(0, 200) },
        },
      },
      { status: 502 },
    );
  }
  return NextResponse.json(data, { status: res.status });
}
