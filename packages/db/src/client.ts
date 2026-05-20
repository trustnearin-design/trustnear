import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __sevalinkPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'production'
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ],
    errorFormat: process.env['NODE_ENV'] === 'production' ? 'minimal' : 'pretty',
  });
}

// Singleton — prevents multiple instances during HMR in dev.
// In serverless prod (single invocation), the singleton just becomes a one-shot.
export const prisma: PrismaClient = globalThis.__sevalinkPrisma ?? createClient();

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__sevalinkPrisma = prisma;
}
