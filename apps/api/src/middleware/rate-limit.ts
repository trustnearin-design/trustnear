import type { Context, Next } from 'hono';
import { redis } from '../redis.js';
import { logger } from '../logger.js';

export interface RateLimitOptions {
  /** Window length in milliseconds (fixed-window bucket). */
  windowMs: number;
  /** Max requests allowed per identifier per window. */
  max: number;
  /** Redis key namespace — separates buckets across different limiters. */
  keyPrefix: string;
  /**
   * Identifier extractor. Defaults to client IP from X-Forwarded-For chain
   * (App Runner / ALB sets this) → X-Real-IP → 'anon'.
   * Override for auth-aware limits, e.g. `(c) => c.get('userId') ?? ip(c)`.
   */
  getKey?: (c: Context) => string;
  /** Optional skip predicate — returns true to bypass the limit for this request. */
  skip?: (c: Context) => boolean;
}

function defaultClientId(c: Context): string {
  const fwd = c.req.header('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return c.req.header('x-real-ip') ?? 'anon';
}

/**
 * Fixed-window rate limit middleware backed by Redis.
 *
 * Fails OPEN — if Redis is down, requests pass through (logged as a warning).
 * Better to let a few extra requests through than 503 the whole API during
 * an Upstash blip. The downstream services have their own protections.
 *
 * Standard `X-RateLimit-*` headers are set on every response so clients can
 * back off voluntarily. `Retry-After` is set on 429s.
 */
export function rateLimit(options: RateLimitOptions) {
  const { windowMs, max, keyPrefix, getKey, skip } = options;
  const getIdentifier = getKey ?? defaultClientId;

  return async (c: Context, next: Next): Promise<Response | void> => {
    if (skip?.(c)) {
      return next();
    }

    const identifier = getIdentifier(c);
    const windowBucket = Math.floor(Date.now() / windowMs);
    const key = `rl:${keyPrefix}:${identifier}:${String(windowBucket)}`;

    let count: number;
    try {
      count = await redis.incr(key);
      if (count === 1) {
        await redis.pexpire(key, windowMs + 1000);
      }
    } catch (err) {
      logger.warn({ err, keyPrefix, identifier }, 'rate-limit: redis error, failing open');
      return next();
    }

    const remaining = Math.max(0, max - count);
    const resetMs = (windowBucket + 1) * windowMs;
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(Math.ceil(resetMs / 1000)));

    if (count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
      c.header('Retry-After', String(retryAfterSec));
      logger.warn({ identifier, keyPrefix, count, max, path: c.req.path }, 'rate limit exceeded');
      return c.json(
        {
          success: false,
          error: {
            code: 'SL_429_RATE_LIMITED',
            message: 'Too many requests. Please slow down and try again shortly.',
          },
          meta: {
            requestId: c.get('requestId') ?? '',
            timestamp: new Date().toISOString(),
            retryAfter: retryAfterSec,
          },
        },
        429,
      );
    }

    return next();
  };
}
