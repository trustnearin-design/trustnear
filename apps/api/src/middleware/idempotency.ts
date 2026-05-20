import { createMiddleware } from 'hono/factory';
import { prisma, Prisma } from '@sevalink/db';
import { sha256 } from '@sevalink/utils';
import { ConflictError } from '@sevalink/types';
import { logger } from '../logger.js';
import type { AuthContext } from './authenticate.js';

const IDEMPOTENCY_TTL_HOURS = 24;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Replay-safe POST handler. Client sends `X-Idempotency-Key: <unique>` —
 * if we've handled that key before:
 *   • same user + same endpoint + same body hash → replay cached response
 *   • anything different → 409 (the key was reused for a different intent)
 *   • not seen before → run handler + cache the response
 *
 * If the header is absent, the request passes through (idempotency is opt-in
 * from the client side, on by default in our mobile apps for payment POSTs).
 *
 * Must run AFTER authenticate.
 */
export const idempotency = createMiddleware<AuthContext>(async (c, next) => {
  const key = c.req.header('x-idempotency-key');
  if (!key) {
    await next();
    return;
  }
  if (!KEY_PATTERN.test(key)) {
    throw new ConflictError('Idempotency key must be 8-128 chars [A-Za-z0-9_-]');
  }

  const user = c.get('user');
  const endpoint = `${c.req.method} ${c.req.routePath}`;

  // Hash request body without consuming Hono's internal cache.
  // c.req.raw.clone() gives us a fresh Request we can drain freely.
  const cloned = c.req.raw.clone();
  const rawBody = await cloned.text();
  const requestHash = sha256(rawBody || '__empty__');

  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

  if (existing) {
    if (existing.expiresAt.getTime() < Date.now()) {
      // Expired — purge and treat as new request
      await prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined);
    } else {
      if (existing.userId !== user.sub || existing.endpoint !== endpoint) {
        throw new ConflictError('Idempotency key reused with different user or endpoint');
      }
      if (existing.requestHash !== requestHash) {
        throw new ConflictError('Idempotency key reused with different request body');
      }
      logger.info({ key, endpoint, userId: user.sub }, 'idempotency: replaying cached response');
      const status = (existing.responseStatus ?? 200) as 200;
      const body =
        existing.responseBody !== null && typeof existing.responseBody === 'object'
          ? (existing.responseBody as Record<string, unknown>)
          : {};
      c.res = c.json(body, status);
      return;
    }
  }

  await next();

  // Persist response so retries replay it. Failures here are non-fatal —
  // worst case the client gets a fresh response on retry (still safe because
  // the underlying handler is itself idempotent via order_id reuse).
  const status = c.res.status;
  let responseBody: Prisma.InputJsonValue | typeof Prisma.JsonNull = Prisma.JsonNull;
  try {
    const parsed: unknown = await c.res.clone().json();
    if (parsed !== null && typeof parsed === 'object') {
      responseBody = parsed as Prisma.InputJsonValue;
    }
  } catch {
    /* non-JSON response — leave as JsonNull */
  }
  await prisma.idempotencyKey
    .create({
      data: {
        key,
        userId: user.sub,
        endpoint,
        requestHash,
        responseStatus: status,
        responseBody,
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1000),
      },
    })
    .catch((err: unknown) => {
      logger.warn({ err, key }, 'idempotency: response cache write failed (race with retry?)');
    });
});
