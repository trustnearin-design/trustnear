import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { compress } from 'hono/compress';
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from './env.js';
import { logger } from './logger.js';
import { requestIdMiddleware } from './middleware/request-id.js';
import { loggerMiddleware } from './middleware/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimit } from './middleware/rate-limit.js';
import healthRoutes from './features/health/routes.js';
import authRoutes from './features/auth/routes.js';
import usersRoutes from './features/users/routes.js';
import categoriesRoutes from './features/categories/routes.js';
import prosRoutes from './features/pros/routes.js';
import bookingsRoutes from './features/bookings/routes.js';
import reviewsRoutes from './features/reviews/routes.js';
import paymentsRoutes from './features/payments/routes.js';
import walletRoutes from './features/wallet/routes.js';
import notificationsRoutes from './features/notifications/routes.js';
import verifyRoutes from './features/verify/routes.js';
import adminRoutes from './features/admin/routes.js';
import bannersRoutes from './features/banners/routes.js';
import cmsPublicRoutes from './features/cms/public-routes.js';

/**
 * App factory. Pure construction — boot/listen happens in server.ts.
 * This shape makes the app easy to test without spinning up a real port.
 */
export function createApp(): Hono<{ Variables: { requestId: string } }> {
  const app = new Hono<{ Variables: { requestId: string } }>();

  // Global middleware (order matters)
  app.use('*', requestIdMiddleware);
  app.use('*', loggerMiddleware);

  // CORP override for /uploads/* MUST be registered before secureHeaders
  // so its post-next phase runs AFTER secureHeaders's (outer wins).
  // Otherwise secureHeaders pins CORP back to same-origin and admin
  // (:3001) + customer/pro apps (different origins) can't load images.
  app.use('/uploads/*', async (c, next) => {
    await next();
    c.header('Cross-Origin-Resource-Policy', 'cross-origin');
  });

  app.use('*', secureHeaders());
  app.use('*', compress());

  // CORS — production whitelists explicit origins via CORS_ALLOWED_ORIGINS.
  // Dev/staging reflect any origin so local Expo + admin web on different
  // ports can work without ceremony. Native mobile clients (Expo Go,
  // standalone APK/IPA) don't send Origin headers so CORS is moot for them
  // either way.
  const allowedOrigins = (env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const isProd = env.NODE_ENV === 'production';
  if (isProd && allowedOrigins.length === 0) {
    logger.warn(
      'CORS_ALLOWED_ORIGINS is empty in production — browser clients will be blocked. Set it to a comma-separated whitelist.',
    );
  }
  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return ''; // non-browser client (mobile, server-to-server)
        if (!isProd) return origin; // dev/staging — reflect
        return allowedOrigins.includes(origin) ? origin : '';
      },
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Idempotency-Key'],
      exposeHeaders: [
        'X-Request-Id',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      maxAge: 600,
    }),
  );

  // Static — locally-uploaded admin media (categories, banners, etc).
  // Public read; uploads are admin-only (gated in /api/v1/admin/uploads).
  // When S3 is configured, files go there directly and this never serves them.
  app.use('/uploads/*', serveStatic({ root: './' }));

  // Rate limits — applied BEFORE routes. Health is intentionally exempt so
  // App Runner / monitoring don't get throttled. Auth is strict-ish to
  // protect OTP send/verify (SMS cost + brute force), but generous enough
  // that a single tester on a shared IP can iterate without tripping it
  // (one test = ~3 calls: refresh + send + verify). The deeper protection
  // is the 3/hr per-phone limit on /auth/send-otp itself in routes.ts.
  // Authenticated APIs get a more generous limit; we identify by user when
  // available, falling back to IP for unauthenticated discovery calls.
  app.use('/api/v1/auth/*', rateLimit({ windowMs: 60_000, max: 60, keyPrefix: 'auth' }));
  app.use(
    '/api/v1/*',
    rateLimit({
      windowMs: 60_000,
      max: 240,
      keyPrefix: 'api',
      // The Cashfree webhook is verified by HMAC and can burst on retries —
      // never throttle it on the shared IP bucket.
      skip: (c) => c.req.path.endsWith('/payments/webhook/cashfree'),
      getKey: (c) => {
        // This middleware runs before per-route authenticate, so c.get('user')
        // isn't populated yet. Derive the user id straight from the bearer
        // token's payload for per-user bucketing. The signature is NOT verified
        // here — that's fine because this is only a rate-limit key, not an auth
        // decision (a forged token still gets rejected by authenticate, and an
        // invalid sub just buckets the abuser to themselves).
        const auth = c.req.header('authorization');
        const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
        if (token) {
          try {
            const payloadSeg = token.split('.')[1];
            if (payloadSeg) {
              const payload = JSON.parse(Buffer.from(payloadSeg, 'base64url').toString('utf8')) as {
                sub?: string;
              };
              if (payload.sub) return `u:${payload.sub}`;
            }
          } catch {
            /* malformed token — fall back to IP */
          }
        }
        const fwd = c.req.header('x-forwarded-for');
        const ip = fwd?.split(',')[0]?.trim() ?? c.req.header('x-real-ip') ?? 'anon';
        return `ip:${ip}`;
      },
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
  app.route('/api/v1/payments', paymentsRoutes);
  app.route('/api/v1/wallet', walletRoutes);
  app.route('/api/v1/notifications', notificationsRoutes);
  app.route('/api/v1/verify', verifyRoutes);
  app.route('/api/v1/admin', adminRoutes);
  app.route('/api/v1/banners', bannersRoutes);
  app.route('/api/v1', cmsPublicRoutes);

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
