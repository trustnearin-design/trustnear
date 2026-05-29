import type { NextConfig } from 'next';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sevalink/types', '@sevalink/db', '@sevalink/utils'],
  experimental: {
    typedRoutes: true,
  },
  // Pin Next.js workspace root to the monorepo root. Without this Next
  // detects multiple lockfiles (C:\Users\hp\pnpm-lock.yaml +
  // sevalink\pnpm-lock.yaml) and picks the wrong one, which slows the
  // dev file-watcher and bloats traced output. Pointing at the sevalink
  // root resolves the warning + speeds up cold dev compiles.
  outputFileTracingRoot: join(__dirname, '../..'),
};

export default config;
