import { z } from 'zod';

/**
 * Normalize optional env vars: treat both "missing" (undefined) and "blank" ("")
 * as not-set. Crucial for container deploys where unused optional vars are
 * simply omitted from the task definition (vs .env files where they're "").
 */
const emptyToUndefined = z
  .string()
  .optional()
  .transform((s) => (s == null || s.trim() === '' ? undefined : s));

const optionalUrl = z
  .string()
  .optional()
  .transform((s) => (s == null || s.trim() === '' ? undefined : s))
  .pipe(z.string().url().optional());

/**
 * Env schema — single source of truth for env vars used by apps/api.
 * Boot intentionally fails if anything required is missing/invalid:
 * we'd rather crash early than discover at 3am that JWT_SECRET was unset.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('debug'),

  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Sentry — optional in dev, recommended in prod
  SENTRY_DSN: optionalUrl,

  // Third-party — optional now, validated when the feature using them ships
  MSG91_AUTH_KEY: emptyToUndefined,
  MSG91_TEMPLATE_ID: emptyToUndefined,
  MSG91_SENDER_ID: z.string().default('SEVAOTP'),

  GOOGLE_MAPS_API_KEY: emptyToUndefined,

  // Payment gateway — swappable. Default + override via app_config.payment_provider
  PAYMENT_PROVIDER: z.enum(['cashfree', 'razorpay', 'stripe', 'mock']).default('cashfree'),

  // Cashfree
  CASHFREE_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  CASHFREE_APP_ID: emptyToUndefined,
  CASHFREE_SECRET_KEY: emptyToUndefined,
  CASHFREE_WEBHOOK_SECRET: emptyToUndefined,

  // Razorpay (kept as a future fallback)
  RAZORPAY_KEY_ID: emptyToUndefined,
  RAZORPAY_KEY_SECRET: emptyToUndefined,
  RAZORPAY_WEBHOOK_SECRET: emptyToUndefined,

  // Setu — KYC verification suite (DigiLocker / PAN / BAV Pennyless).
  // One credential set is valid for all KYC products on the same account.
  SETU_ENV: z.enum(['sandbox', 'production']).default('sandbox'),
  SETU_BASE_URL: z.string().url().default('https://dg-sandbox.setu.co'),
  SETU_CLIENT_ID: emptyToUndefined,
  SETU_CLIENT_SECRET: emptyToUndefined,
  SETU_PRODUCT_INSTANCE_ID: emptyToUndefined,

  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: emptyToUndefined,
  AWS_SECRET_ACCESS_KEY: emptyToUndefined,
  S3_BUCKET_MEDIA: emptyToUndefined,
  CLOUDFRONT_DOMAIN: emptyToUndefined,

  // URLs
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  // CORS — comma-separated list of allowed origins for production.
  // Examples: "https://admin.trustnear.in,https://trustnear.in,https://www.trustnear.in"
  // In development/staging the API reflects any origin (browser still requires
  // a value, but native mobile clients don't send Origin headers so this is moot
  // for them anyway). Production hardening requires this to be set explicitly.
  CORS_ALLOWED_ORIGINS: z.string().optional(),
});

function parseEnv(): z.infer<typeof EnvSchema> {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }
  return result.data;
}

export const env = parseEnv();
export type Env = typeof env;
