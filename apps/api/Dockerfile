# ─────────────────────────────────────────────────────────────────────
# SEVALINK API — production Dockerfile
# Multi-stage build for a pnpm + turbo monorepo with Prisma 6 client.
#
# Build context MUST be the repo root (where pnpm-workspace.yaml lives),
# NOT the apps/api directory. AWS App Runner / GitHub Actions both
# build from repo root with `-f apps/api/Dockerfile`.
# ─────────────────────────────────────────────────────────────────────

# ───── Stage 1: install all deps (dev + prod) ─────
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
# pnpm via corepack — pinned to the version in root package.json
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /repo

# Copy lockfile + workspace manifests first for cache efficiency.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY turbo.json ./
COPY tsconfig.base.json ./

# Copy package.jsons for all workspace packages the API needs.
# (Cheaper to copy a few extra than to rebuild deps on every code change.)
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig/package.json packages/tsconfig/

RUN pnpm install --frozen-lockfile --ignore-scripts

# ───── Stage 2: build (compile TS, generate Prisma client) ─────
FROM deps AS build
WORKDIR /repo

# Now copy all source for the api + its workspace dependencies.
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/eslint-config ./packages/eslint-config
COPY packages/tsconfig ./packages/tsconfig

# Generate Prisma client (uses DATABASE_URL placeholder at build; real URL
# comes from runtime env). prisma generate is hermetic — no DB connection.
RUN pnpm --filter @sevalink/db exec prisma generate

# Build types → utils → db → api (turbo respects dependency order).
RUN pnpm --filter @sevalink/api build

# ───── Stage 3: runtime (slim production image) ─────
FROM node:22-alpine AS runtime
RUN apk add --no-cache libc6-compat openssl tini
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copy production-only files. We re-install with --prod to drop dev deps
# but keep the structure of the monorepo so workspace links still resolve.
COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json /repo/.npmrc* ./
COPY --from=build /repo/apps/api/package.json apps/api/
COPY --from=build /repo/packages/db/package.json packages/db/
COPY --from=build /repo/packages/types/package.json packages/types/
COPY --from=build /repo/packages/utils/package.json packages/utils/

RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copy built artifacts.
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/packages/db/dist packages/db/dist
COPY --from=build /repo/packages/db/prisma packages/db/prisma
COPY --from=build /repo/packages/db/node_modules/.prisma packages/db/node_modules/.prisma
COPY --from=build /repo/packages/db/node_modules/@prisma packages/db/node_modules/@prisma
COPY --from=build /repo/packages/types/dist packages/types/dist
COPY --from=build /repo/packages/utils/dist packages/utils/dist

EXPOSE 8080

# tini is PID 1 → graceful SIGTERM handling for AWS App Runner deploys.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/server.js"]
