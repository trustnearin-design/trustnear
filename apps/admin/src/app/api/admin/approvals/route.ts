import { proxyJson } from '@/lib/proxy';

/**
 * Proxy for /api/v1/admin/pros/pending — the onboarding approval queue.
 * Query params (status, limit, offset) pass through transparently.
 */
export const GET = (req: Request) => proxyJson(req, '/api/v1/admin/pros/pending', 'GET');
