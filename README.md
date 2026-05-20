# SEVALINK

> Verified Professionals. Real-Time Trust.

Multi-app platform connecting customers with verified home-service professionals across India. Premium experience inspired by UrbanCompany, Uber, and Zomato — engineered to scale from 1K to 1M+ users.

- **Launch:** Jaipur · May 2026
- **Status:** Phase 0 — Foundation
- **Confidential** — internal use only.

---

## Workspace layout

```
sevalink/
├── apps/
│   ├── api/          Hono backend (Node 22 + Prisma 6 + Postgres + Redis + Socket.io)
│   ├── customer/     Customer mobile app (Expo SDK 54 + React Native)
│   ├── pro/          SevaExpert mobile app (Expo SDK 54 + React Native)
│   └── admin/        SEVALINK Command — admin web (Next.js 15)
├── packages/
│   ├── tsconfig/         Shared TypeScript configs
│   ├── eslint-config/    Shared ESLint flat configs
│   ├── db/               Prisma schema + client (shared by api & admin)
│   ├── types/            Shared types & Zod schemas
│   └── utils/            Shared utilities
└── .github/workflows/    CI pipelines
```

## Quick start

```sh
# 1. Install dependencies (Node 22+, pnpm 11+ required)
pnpm install

# 2. Start everything in dev mode
pnpm dev

# Or per-app:
pnpm --filter @sevalink/api dev
pnpm --filter customer start
```

## Root scripts

| Script           | What it does                                     |
| ---------------- | ------------------------------------------------ |
| `pnpm dev`       | Run every app/package in dev mode (Turborepo)    |
| `pnpm build`     | Build every app                                  |
| `pnpm lint`      | ESLint across the monorepo                       |
| `pnpm typecheck` | TypeScript --noEmit across the monorepo          |
| `pnpm test`      | Run all test suites                              |
| `pnpm format`    | Prettier write all files                         |
| `pnpm clean`     | Remove build outputs (`dist`, `.next`, `.turbo`) |

## Requirements

- **Node.js** >= 22 (LTS recommended; Node 24 works too)
- **pnpm** >= 10
- A modern editor — VSCode recommended. Open `sevalink.code-workspace` for multi-root layout.

## Tech stack

| Layer         | Choice                                                            |
| ------------- | ----------------------------------------------------------------- |
| Monorepo      | Turborepo + pnpm workspaces                                       |
| Backend       | Hono · Prisma 6 · PostgreSQL (Neon) · Redis (Upstash) · Socket.io |
| Mobile        | Expo SDK 54+ · React Native 0.76 · TypeScript                     |
| Admin         | Next.js 15 (App Router) · React 19 · Tailwind · shadcn/ui         |
| Payments      | Razorpay (UPI + Route splits)                                     |
| Maps          | Google Maps Platform                                              |
| Cloud         | AWS Mumbai (ap-south-1) + S3 + CloudFront                         |
| Observability | Sentry + Pino + OpenTelemetry                                     |

## Commit conventions

[Conventional Commits](https://www.conventionalcommits.org/) — enforced by commitlint pre-commit hook:

```
feat(api): add Razorpay webhook endpoint
fix(customer): handle missing GPS permissions on Android 14
chore(repo): bump turbo to 2.5.0
```

Allowed scopes: `api`, `customer`, `pro`, `admin`, `db`, `shared`, `ci`, `deps`, `repo`.

---

© 2026 SEVALINK · All rights reserved.
