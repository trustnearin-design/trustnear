import type { Context } from 'hono';
import type { ApiSuccess, ErrorCode } from '@sevalink/types';

/**
 * Build the standard success envelope.
 */
export function success<T>(
  c: Context,
  data: T,
  meta?: ApiSuccess<T>['meta'],
  statusCode = 200,
): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    meta: {
      requestId: c.get('requestId') ?? '',
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
  return c.json(body, statusCode as 200);
}

/**
 * Build the standard error envelope. Prefer throwing DomainError instead —
 * the error middleware will format it. Use this only for early returns.
 */
export function failure(
  c: Context,
  code: ErrorCode,
  message: string,
  statusCode = 400,
  details?: Record<string, unknown>,
): Response {
  return c.json(
    {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      meta: {
        requestId: c.get('requestId') ?? '',
        timestamp: new Date().toISOString(),
      },
    },
    statusCode as 400,
  );
}
