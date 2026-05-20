import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { requestIdMiddleware } from './middleware/request-id.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import healthRoutes from './features/health/routes.js';
import authRoutes from './features/auth/routes.js';
import usersRoutes from './features/users/routes.js';
import categoriesRoutes from './features/categories/routes.js';
import prosRoutes from './features/pros/routes.js';
import bookingsRoutes from './features/bookings/routes.js';
import reviewsRoutes from './features/reviews/routes.js';

/**
 * App factory. Pure construction — boot/listen happens in server.ts.
 * This shape makes the app easy to test without spinning up a real port.
 */
export function createApp(): Hono<{ Variables: { requestId: string } }> {
  const app = new Hono<{ Variables: { requestId: string } }>();

  // Global middleware (order matters)
  app.use('*', requestIdMiddleware);
  app.use('*', loggerMiddleware);
  app.use('*', secureHeaders());
  app.use('*', compress());
  app.use(
    '*',
    cors({
      origin: (origin) => origin ?? '*',
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
      exposeHeaders: ['X-Request-Id'],
      maxAge: 600,
    }),
  );

  // Routes
  app.route('/health', healthRoutes);
  app.route('/api/v1/auth', authRoutes);
  app.route('/api/v1/users', usersRoutes);
  app.route('/api/v1/categories', categoriesRoutes);
  app.route('/api/v1/pros', prosRoutes);
  app.route('/api/v1/bookings', bookingsRoutes);
  app.route('/api/v1/reviews', reviewsRoutes);

  // Root
  app.get('/', (c) =>
    c.json({
      service: 'sevalink-api',
      version: '0.0.1',
      docs: '/docs',
    }),
  );

  // Centralized error handling
  app.onError(errorHandler);

  // 404
  app.notFound((c) =>
    c.json(
      {
        success: false,
        error: {
          code: 'SL_902_NOT_FOUND',
          message: `Route ${c.req.method} ${c.req.path} not found`,
        },
        meta: {
          requestId: c.get('requestId') ?? '',
          timestamp: new Date().toISOString(),
        },
      },
      404,
    ),
  );

  return app;
}
