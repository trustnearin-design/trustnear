import { createMiddleware } from 'hono/factory';
import { logger } from '../logger.js';

/**
 * Request logger — emits structured log per request with timing and request_id.
 */
export const loggerMiddleware = createMiddleware<{
  Variables: { requestId: string };
}>(async (c, next) => {
  const start = Date.now();
  const { method } = c.req;
  const path = c.req.path;
  const requestId = c.get('requestId');

  await next();

  const durationMs = Date.now() - start;
  const status = c.res.status;
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';

  logger[level](
    {
      requestId,
      method,
      path,
      status,
      durationMs,
      userAgent: c.req.header('user-agent'),
      ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'),
    },
    `${method} ${path} ${String(status)} ${String(durationMs)}ms`,
  );
});
