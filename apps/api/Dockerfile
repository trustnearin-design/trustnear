# ─────────────────────────────────────────────────────────────────────
# SEVALINK / TrustNear API — production Dockerfile
# Single-stage build for a pnpm + turbo monorepo with Prisma 6.
#
# Build context MUST be the repo root (where pnpm-workspace.yaml lives),
# NOT the apps/api directory. AWS CodeBuild / App Runner / GitHub Actions
# all build from repo root with `-f apps/api/Dockerfile .`.
#
# Why no separate "build" stage compiling to dist/:
# Workspace packages (@sevalink/utils, types, db) export from `src/index.ts`
# in their package.json. Node can't load .ts at runtime, so a vanilla
# `node dist/server.js` would fail to resolve the workspace imports.
# Instead we run the API directly via tsx, which resolves TypeScript at
# import time. Boot is fast, image stays simple, no build-output sync.
# ─────────────────────────────────────────────────────────────────────

# Pull from Amazon ECR Public Gallery mirror, not Docker Hub.
# CodeBuild's egress IPs share Docker Hub anonymous rate limits with many
# other AWS customers — first builds frequently hit 429 Too Many Requests.
# public.ecr.aws/docker/library/* mirrors the official images with no
# anonymous pull limit.
FROM public.ecr.aws/docker/library/node:22-alpine
RUN apk add --no-cache libc6-compat openssl tini
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate

WORKDIR /repo

# ── Step 1: copy manifests so pnpm can resolve workspace graph ──────
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc* ./
COPY turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/db/package.json packages/db/
COPY packages/types/package.json packages/types/
COPY packages/utils/package.json packages/utils/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/tsconfig/package.json packages/tsconfig/

# ── Step 2: install deps for API + its workspace deps only ──────────
# `--filter @sevalink/api...` keeps the install scoped to api + its
# transitive workspace dependencies (db, types, utils, tsconfig).
# Customer / pro / admin app deps are skipped — saves ~1.5 GB and
# avoids busting build-runner disk on first deploy.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@sevalink/api..."

# ── Step 3: copy source for the API + its workspace dependencies ────
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/tsconfig ./packages/tsconfig

# ── Step 4: generate Prisma client (hermetic — no DB connection) ────
RUN pnpm --filter @sevalink/db exec prisma generate

# ── Runtime config ──────────────────────────────────────────────────
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# tini = PID 1 → clean SIGTERM forwarding for graceful App Runner /
# ECS Express deploys + rolling restarts.
ENTRYPOINT ["/sbin/tini", "--"]

WORKDIR /repo/apps/api
CMD ["pnpm", "exec", "tsx", "src/server.ts"]
