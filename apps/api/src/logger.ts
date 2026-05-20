import pino from 'pino';
import { env } from './env.js';

/**
 * Structured logger. JSON in prod, pretty in dev.
 * Always log via this — never console.log in production code.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
            singleLine: false,
          },
        },
      }
    : {}),
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.token',
      '*.secret',
      '*.otp',
      '*.aadhaarNumber',
      '*.accountNumber',
    ],
    censor: '[REDACTED]',
  },
  base: {
    service: 'sevalink-api',
    env: env.NODE_ENV,
  },
});

export type Logger = typeof logger;
