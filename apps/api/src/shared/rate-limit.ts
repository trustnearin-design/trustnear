import { redis } from '../redis.js';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // unix seconds
}

/**
 * Fixed-window rate limit. Cheap (INCR + EXPIRE), accurate to ±window.
 *
 * For most use cases (OTP, login attempts, API limits) this is plenty.
 * If you need stricter smoothing, swap to sliding-log via ZADD/ZREMRANGEBYSCORE.
 */
export async function rateLimit(args: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds } = args;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const redisKey = `rl:${key}:${String(windowStart)}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  return {
    allowed: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt: windowStart + windowSeconds,
  };
}
