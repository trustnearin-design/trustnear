import type { ErrorHandler } from 'hono';
import { ZodError } from 'zod';
import { DomainError, ErrorCode } from '@sevalink/types';
import { logger } from '../logger.js';
import { env } from '../env.js';

/**
 * Centralized error → API response mapping.
 *   • DomainError → its statusCode + SL_xxx code
 *   • ZodError → 422 SL_900_VALIDATION_ERROR with field details
 *   • Anything else → 500 SL_904_INTERNAL_ERROR (don't leak stack in prod)
 */
export const errorHandler: ErrorHandler<{ Variables: { requestId: string } }> = (err, c) => {
  const requestId = c.get('requestId');
  const baseMeta = { requestId, timestamp: new Date().toISOString() };

  if (err instanceof DomainError) {
    logger.warn(
      { requestId, code: err.code, statusCode: err.statusCode, details: err.details },
      err.message,
    );
    return c.json(
      {
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
        meta: baseMeta,
      },
      err.statusCode as 400,
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    logger.warn({ requestId, fieldErrors }, 'validation error');
    return c.json(
      {
        success: false,
        error: {
          code: ErrorCode.SL_900_VALIDATION_ERROR,
          message: 'Validation failed',
          details: { fields: fieldErrors },
        },
        meta: baseMeta,
      },
      422,
    );
  }

  // Truly unexpected — log full, redact in response
  logger.error({ requestId, err }, 'unhandled error');
  return c.json(
    {
      success: false,
      error: {
        code: ErrorCode.SL_904_INTERNAL_ERROR,
        message:
          env.NODE_ENV === 'production' ? 'Something went wrong. Please try again.' : err.message,
      },
      meta: baseMeta,
    },
    500,
  );
};
