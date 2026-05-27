import { DomainError, ErrorCode } from '@sevalink/types';
import { env } from '../../env.js';
import { logger } from '../../logger.js';

/**
 * Shared HTTP wrapper for the Setu Bridge KYC APIs. One credential set
 * (client_id + secret + product_instance_id) covers all KYC products on
 * the same Setu account — DigiLocker, PAN, BAV. The same headers go on
 * every call; only the path + body changes per product.
 *
 * Why a thin wrapper instead of the Setu SDK:
 *   - Their JS SDK lags the REST docs and pulls in heavy server-side deps
 *   - The full surface we need is 5 endpoints — direct fetch keeps
 *     dependencies tight and errors traceable through our usual flow
 *
 * Error model: Setu returns JSON like
 *   { error: { code: "...", message: "...", traceId: "..." } }
 * on failure. We rethrow as DomainError with code SL_902 (external
 * dependency) so the route handler maps it to a 502 with a clean shape.
 */

const HEADERS = {
  'x-client-id': env.SETU_CLIENT_ID ?? '',
  'x-client-secret': env.SETU_CLIENT_SECRET ?? '',
  'x-product-instance-id': env.SETU_PRODUCT_INSTANCE_ID ?? '',
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function ensureConfigured(): void {
  if (!env.SETU_CLIENT_ID || !env.SETU_CLIENT_SECRET || !env.SETU_PRODUCT_INSTANCE_ID) {
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      'Setu verification is not configured on this server',
      500,
    );
  }
}

export interface SetuRequestOpts {
  method?: 'GET' | 'POST';
  body?: unknown;
}

export async function setuFetch<T>(path: string, opts: SetuRequestOpts = {}): Promise<T> {
  ensureConfigured();
  const url = `${env.SETU_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers: HEADERS,
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
    const errPayload = (json as { error?: { code?: string; message?: string; traceId?: string } })
      .error;
    logger.warn(
      {
        url,
        status: res.status,
        setuError: errPayload,
      },
      'setu: upstream request failed',
    );
    throw new DomainError(
      ErrorCode.SL_904_INTERNAL_ERROR,
      `Setu request failed: ${errPayload?.message ?? `HTTP ${String(res.status)}`}`,
      502,
    );
  }

  return json as T;
}
