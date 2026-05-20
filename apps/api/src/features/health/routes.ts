import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { redis } from '../../redis.js';
import { logger } from '../../logger.js';
import { success } from '../../shared/responses.js';

const health = new Hono();

/**
 * Liveness probe — cheap, no external deps. ECS/k8s uses this to decide
 * whether to restart the container.
 */
health.get('/live', (c) =>
  success(c, { status: 'ok', uptime: process.uptime(), pid: process.pid }),
);

/**
 * Readiness probe — verifies all critical downstreams. Load balancer uses this
 * to decide whether to send traffic. Returns 503 if any check fails.
 */
health.get('/ready', async (c) => {
  const checks = await Promise.allSettled([checkDatabase(), checkRedis()]);

  const db = checks[0];
  const redisCheck = checks[1];

  const allHealthy = db.status === 'fulfilled' && redisCheck.status === 'fulfilled';

  const result = {
    status: allHealthy ? 'ready' : 'unhealthy',
    checks: {
      database: db.status === 'fulfilled' ? db.value : { healthy: false, error: String(db.reason) },
      redis:
        redisCheck.status === 'fulfilled'
          ? redisCheck.value
          : { healthy: false, error: String(redisCheck.reason) },
    },
    timestamp: new Date().toISOString(),
  };

  if (!allHealthy) {
    logger.warn(result, 'readiness check failed');
  }

  return c.json({ success: allHealthy, data: result }, allHealthy ? 200 : 503);
});

async function checkDatabase(): Promise<{ healthy: true; latencyMs: number }> {
  const t = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  return { healthy: true, latencyMs: Date.now() - t };
}

async function checkRedis(): Promise<{ healthy: true; latencyMs: number }> {
  const t = Date.now();
  const reply = await redis.ping();
  if (reply !== 'PONG') {
    throw new Error(`Unexpected redis ping reply: ${reply}`);
  }
  return { healthy: true, latencyMs: Date.now() - t };
}

export default health;
