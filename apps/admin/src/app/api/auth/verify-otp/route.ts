import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { writeSession } from '@/lib/session';

/**
 * Verifies OTP against the API. On success we ALSO call /users/me to confirm
 * the user has role=admin — otherwise the API would happily issue tokens for
 * a customer phone and that customer would land in the admin shell. Then we
 * stash the tokens in the httpOnly session cookie.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  let verifyRes: Response;
  try {
    verifyRes = await fetch(`${env.apiBaseUrl}/api/v1/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, role: 'admin' }),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SL_904_API_UNREACHABLE',
          message: `Cannot reach API at ${env.apiBaseUrl}.`,
          details: { reason: err instanceof Error ? err.message : String(err) },
        },
      },
      { status: 502 },
    );
  }
  const verifyRaw = await verifyRes.text();
  const verifyData = verifyRaw ? JSON.parse(verifyRaw) : {};
  if (!verifyRes.ok || !verifyData?.success) {
    return NextResponse.json(verifyData, { status: verifyRes.status });
  }

  const accessToken = verifyData.data?.accessToken as string | undefined;
  const refreshToken = verifyData.data?.refreshToken as string | undefined;
  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { success: false, error: { code: 'SL_904', message: 'No tokens returned' } },
      { status: 500 },
    );
  }

  const meRes = await fetch(`${env.apiBaseUrl}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meData = await meRes.json();
  if (!meRes.ok || !meData?.success) {
    return NextResponse.json(meData, { status: meRes.status });
  }
  if (meData.data?.role !== 'admin') {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'SL_201_FORBIDDEN', message: 'This number is not an admin account.' },
      },
      { status: 403 },
    );
  }

  // adminRole is read from /users/me. Defaults to 'super' if missing so
  // admins seeded before Phase F still work.
  const adminRole =
    (meData.data?.adminRole as 'super' | 'ops' | 'finance' | 'support' | null) ?? 'super';

  await writeSession({
    userId: meData.data.id,
    fullName: meData.data.fullName ?? null,
    phone: meData.data.phone,
    adminRole,
    accessToken,
    refreshToken,
  });

  return NextResponse.json({ success: true, data: { redirectTo: '/dashboard' } });
}
