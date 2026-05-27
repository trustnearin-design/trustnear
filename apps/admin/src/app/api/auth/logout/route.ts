import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { clearSession, readSession } from '@/lib/session';

/**
 * Clears the local session cookie + revokes the refresh token on the API.
 * Idempotent — clears cookie even if API revoke fails.
 */
export async function POST() {
  const session = await readSession();
  if (session?.refreshToken) {
    await fetch(`${env.apiBaseUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    }).catch(() => null);
  }
  await clearSession();
  return NextResponse.json({ success: true });
}
