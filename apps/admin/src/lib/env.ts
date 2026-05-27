/**
 * Server-side env loader. Validates required env vars at import time so
 * misconfiguration surfaces during dev startup, not on the first request.
 */
const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/+$/, '');
if (!apiBaseUrl) {
  throw new Error('API_BASE_URL is required (e.g. http://localhost:3000)');
}

export const env = {
  apiBaseUrl,
  sessionCookieName: process.env.SESSION_COOKIE_NAME ?? 'trustnear_admin_session',
} as const;
