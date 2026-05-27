import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@sevalink/types', '@sevalink/db', '@sevalink/utils'],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
