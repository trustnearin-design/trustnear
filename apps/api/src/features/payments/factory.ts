import { prisma } from '@sevalink/db';
import { env } from '../../env.js';
import { logger } from '../../logger.js';
import { CashfreePaymentProvider } from './cashfree.js';
import type { PaymentProvider } from './provider.js';

/**
 * Provider resolution order:
 *   1. app_config.payment_provider (admin can switch live)
 *   2. env.PAYMENT_PROVIDER          (operator override / boot default)
 *   3. 'cashfree'                    (built-in default)
 *
 * Resolved once at boot. To change provider live without restart, an
 * admin endpoint will call refreshPaymentProvider() (Phase 1.6+).
 *
 * Credentials always come from env (security — never persist in DB).
 */

let cached: PaymentProvider | null = null;

async function readActiveProviderName(): Promise<'cashfree' | 'razorpay' | 'stripe' | 'mock'> {
  try {
    const row = await prisma.appConfig.findUnique({
      where: { key: 'payment_provider' },
      select: { value: true },
    });
    if (row && typeof row.value === 'string') {
      const v = row.value as 'cashfree' | 'razorpay' | 'stripe' | 'mock';
      if (['cashfree', 'razorpay', 'stripe', 'mock'].includes(v)) return v;
    }
  } catch (err) {
    logger.warn({ err }, 'payments: app_config lookup failed, falling back to env');
  }
  return env.PAYMENT_PROVIDER;
}

function buildProvider(name: string): PaymentProvider {
  switch (name) {
    case 'cashfree': {
      if (!env.CASHFREE_APP_ID || !env.CASHFREE_SECRET_KEY) {
        throw new Error('Cashfree selected but CASHFREE_APP_ID / CASHFREE_SECRET_KEY not set');
      }
      return new CashfreePaymentProvider({
        environment: env.CASHFREE_ENV,
        appId: env.CASHFREE_APP_ID,
        secretKey: env.CASHFREE_SECRET_KEY,
        ...(env.CASHFREE_WEBHOOK_SECRET ? { webhookSecret: env.CASHFREE_WEBHOOK_SECRET } : {}),
      });
    }
    case 'razorpay':
      throw new Error('Razorpay provider not implemented yet — switch payment_provider config');
    case 'stripe':
      throw new Error('Stripe provider not implemented yet — switch payment_provider config');
    case 'mock':
      throw new Error('Mock provider not implemented — for tests we use the real Cashfree sandbox');
    default:
      throw new Error(`Unknown payment provider: ${name}`);
  }
}

export async function getPaymentProvider(): Promise<PaymentProvider> {
  if (cached) return cached;
  const name = await readActiveProviderName();
  cached = buildProvider(name);
  logger.info({ provider: cached.name, env: env.CASHFREE_ENV }, 'payments: provider initialised');
  return cached;
}

/**
 * Drop the cache so the next request rebuilds the provider — call from the
 * admin endpoint after updating app_config.payment_provider.
 */
export function refreshPaymentProvider(): void {
  cached = null;
  logger.info('payments: provider cache invalidated');
}
