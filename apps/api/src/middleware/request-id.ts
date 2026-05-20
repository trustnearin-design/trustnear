import { createMiddleware } from 'hono/factory';
import { generateRequestId } from '@sevalink/utils';

/**
 * Attach a request ID to every request. Honors X-Request-Id header from upstream
 * (load balancer, gateway), otherwise generates a new one.
 * Echoed back as X-Request-Id response header for client-side correlation.
 */
export const requestIdMiddleware = createMiddleware<{
  Variables: { requestId: string };
}>(async (c, next) => {
  const incoming = c.req.header('x-request-id');
  const requestId =
    incoming && /^[a-z0-9-]{6,64}$/i.test(incoming) ? incoming : generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
});
