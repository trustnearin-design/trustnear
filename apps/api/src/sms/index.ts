import { env } from '../env.js';
import { logger } from '../logger.js';
import { loadSmsConfig } from './config-loader.js';
import { MockSmsProvider } from './mock.js';
import { SmartPingSmsProvider } from './smartping.js';
import { TwoFactorSmsProvider } from './twofactor.js';
import type { SmsProvider } from './provider.js';
import type { SmsConfig } from '../features/admin/sms-config-schemas.js';

/**
 * Build a provider instance from a config blob. Pure — no caching, no IO.
 * Used both by the cached `getSmsProvider()` and by the admin "send test
 * SMS" endpoint when the admin wants to try a DRAFT config before saving.
 */
export function buildProviderFromConfig(config: SmsConfig): SmsProvider {
  switch (config.provider) {
    case 'smartping': {
      const s = config.smartping;
      const missing: string[] = [];
      if (!s.username) missing.push('username');
      if (!s.password) missing.push('password');
      if (!s.sender) missing.push('sender');
      if (!s.dltContentId) missing.push('dltContentId');
      if (!s.dltPrincipalEntityId) missing.push('dltPrincipalEntityId');
      if (!s.template) missing.push('template');
      if (missing.length > 0) {
        throw new Error(`SMS provider=smartping missing fields: ${missing.join(', ')}`);
      }
      return new SmartPingSmsProvider({
        username: s.username,
        password: s.password,
        sender: s.sender,
        dltContentId: s.dltContentId,
        dltPrincipalEntityId: s.dltPrincipalEntityId,
        template: s.template,
      });
    }

    case 'twofactor': {
      const t = config.twofactor;
      if (!t.apiKey) {
        throw new Error('SMS provider=twofactor missing apiKey');
      }
      return new TwoFactorSmsProvider({
        apiKey: t.apiKey,
        templateName: t.templateName || null,
      });
    }

    case 'msg91': {
      // TODO(post-DLT): wire Msg91Provider once DLT is approved
      throw new Error('SMS provider=msg91 selected but Msg91Provider not yet implemented');
    }

    case 'mock':
    default: {
      if (env.NODE_ENV === 'production') {
        throw new Error(
          'No production SMS provider configured. Set provider to smartping/twofactor/msg91 in admin /sms settings.',
        );
      }
      return new MockSmsProvider();
    }
  }
}

const CACHE_TTL_MS = 30_000;
let cache: { provider: SmsProvider; expiresAt: number } | null = null;

/**
 * Get the active SMS provider. Loads config from `app_config.sms_config`
 * (falling back to env), builds the provider, and caches it for 30 sec.
 * Admin saves call `invalidateSmsProviderCache()` so changes take effect
 * within the next OTP without a redeploy.
 */
export async function getSmsProvider(): Promise<SmsProvider> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.provider;

  const config = await loadSmsConfig();
  let provider: SmsProvider;
  try {
    provider = buildProviderFromConfig(config);
  } catch (err) {
    // Bad active config — fall back to mock in dev, crash in prod (same as
    // the old factory behavior). This is intentional: a broken sms_config
    // shouldn't silently send to the wrong place in production.
    if (env.NODE_ENV === 'production') throw err;
    logger.warn({ err }, 'sms: bad config — falling back to mock for dev');
    provider = new MockSmsProvider();
  }

  logger.info(
    { provider: provider.name, source: cache ? 'refresh' : 'first-load' },
    'sms: provider built from config',
  );
  cache = { provider, expiresAt: now + CACHE_TTL_MS };
  return provider;
}

/**
 * Drop the cached provider so the next getSmsProvider() rebuilds from
 * fresh DB state. Called by the admin "save SMS config" endpoint.
 */
export function invalidateSmsProviderCache(): void {
  cache = null;
}

export type { SmsProvider } from './provider.js';
