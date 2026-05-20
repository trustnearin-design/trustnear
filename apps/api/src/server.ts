import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';
import { prisma } from '@sevalink/db';
import { env } from './env.js';
import { logger } from './logger.js';
import { redis } from './redis.js';
import { createApp } from './app.js';

// ─── Sentry — initialize before anything else if DSN configured ──────
if (env.SENTRY_DSN) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
  logger.info('sentry: initialized');
}

const app = createApp();

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    logger.info(
      { port: info.port, env: env.NODE_ENV, node: process.version },
      `🚀 sevalink-api listening on http://localhost:${String(info.port)}`,
    );
  },
);

// ─── Graceful shutdown ───────────────────────────────────────────────
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down…');

  // Stop accepting new connections
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }).catch((err: unknown) => {
    logger.error({ err }, 'error closing http server');
  });

  // Drain external connections
  await Promise.allSettled([
    prisma.$disconnect().catch((err: unknown) => {
      logger.error({ err }, 'error disconnecting prisma');
    }),
    redis.quit().catch((err: unknown) => {
      logger.error({ err }, 'error disconnecting redis');
    }),
    env.SENTRY_DSN
      ? Sentry.close(2000).catch((err: unknown) => {
          logger.error({ err }, 'error flushing sentry');
        })
      : Promise.resolve(),
  ]);

  logger.info('shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException — shutting down');
  void shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandledRejection — shutting down');
  void shutdown('unhandledRejection');
});
