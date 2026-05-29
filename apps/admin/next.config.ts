import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sevalink/types', '@sevalink/db', '@sevalink/utils'],
  // Was experimental.typedRoutes before Next 15.3 — moved to top-level.
  typedRoutes: true,
  // Pin Next.js workspace root to the monorepo root. Without this Next
  // detects multiple lockfiles (C:\Users\hp\pnpm-lock.yaml +
  // sevalink\pnpm-lock.yaml) and picks the wrong one, which slows the
  // dev file-watcher and bloats traced output. Pointing at the sevalink
  // root resolves the warning + speeds up cold dev compiles.
  outputFileTracingRoot: join(__dirname, '../..'),
  // Bake server-side env vars into the build so they're available at
  // runtime in the SSR Lambda. AWS Amplify Hosting only exposes
  // NEXT_PUBLIC_* env vars to runtime by default — anything that's
  // consumed only on the server (proxy routes, server components)
  // needs this lift to survive into the deployed bundle.
  env: {
    API_BASE_URL: process.env['API_BASE_URL'] ?? '',
    SESSION_COOKIE_NAME: process.env['SESSION_COOKIE_NAME'] ?? '',
  },
};

export default config;
