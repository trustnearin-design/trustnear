import { serve } from '@hono/node-server';
import * as Sentry from '@sentry/node';
import { prisma } from '@sevalink/db';
import type { Server as HTTPServer } from 'node:http';
import { env } from './env.js';
import { logger } from './logger.js';
import { redis } from './redis.js';
import { createApp } from './app.js';
import { createSocketServer } from './sockets/server.js';
import { seedDefaultTemplates } from './features/cms/templates-service.js';

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

// ─── Seed default notification templates (idempotent) ───────────────
// Best-effort: if Neon is unreachable at boot we just log and continue —
// the dispatcher's hardcoded fallbacks keep notifications working.
seedDefaultTemplates().catch((err) => {
  logger.warn({ err }, 'cms: seedDefaultTemplates failed (continuing)');
});

// ─── Attach Socket.IO to the same HTTP server ────────────────────────
let socketCleanup: (() => Promise<void>) | null = null;
try {
  const { cleanup } = await createSocketServer(server as unknown as HTTPServer);
  socketCleanup = cleanup;
  logger.info('🔌 socket.io attached on the same port');
} catch (err) {
  logger.error({ err }, 'socket.io setup failed — REST API still up');
}

// ─── Graceful shutdown ───────────────────────────────────────────────
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down…');

  // 1. Close socket connections first so clients get a clean disconnect signal
  if (socketCleanup) {
    await socketCleanup().catch((err: unknown) => {
      logger.error({ err }, 'error closing socket.io');
    });
  }

  // 2. Stop accepting new HTTP connections
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }).catch((err: unknown) => {
    logger.error({ err }, 'error closing http server');
  });

  // 3. Drain external connections
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
