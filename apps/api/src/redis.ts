import { Redis } from 'ioredis';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Redis singleton — used for sessions, rate limiting, cache, BullMQ queues,
 * and (later) the Socket.io pub/sub adapter.
 *
 * Upstash requires TLS (rediss://) — ioredis picks this up automatically.
 */
function createRedis(): Redis {
  const client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
    // Upstash has higher latency than colocated Redis — be patient
    connectTimeout: 10_000,
    commandTimeout: 5_000,
  });

  client.on('connect', () => {
    logger.info('redis: connecting…');
  });
  client.on('ready', () => {
    logger.info('redis: ready');
  });
  client.on('error', (err: Error) => {
    logger.error({ err }, 'redis error');
  });
  client.on('close', () => {
    logger.warn('redis: connection closed');
  });

  return client;
}

export const redis: Redis = createRedis();
