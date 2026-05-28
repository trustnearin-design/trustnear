#!/usr/bin/env node
/* eslint-disable */
/**
 * One-time migration helper — Phase 3g.
 *
 * The new `approvalStatus` column on Professional defaults to "draft", which
 * means existing seeded pros would IMMEDIATELY disappear from /pros/nearby
 * once the approved-only filter goes live. This script grandfather-flips
 * every existing pro (created BEFORE this script runs) to "approved" so
 * the customer app keeps working without missing a beat.
 *
 * Safe to re-run: only updates pros that are still on the default `draft`
 * status — won't override newly-onboarded pros mid-flight.
 *
 * Usage (from repo root):
 *   node scripts/grandfather-existing-pros.mjs
 *
 * After running, confirm with the admin queue endpoint or a quick DB query.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ─── Load DATABASE_URL from .env.local manually ──────────────────────
// We do NOT import @sevalink/db here because plain `node` can't resolve
// pnpm workspace packages from outside an app dir. Loading @prisma/client
// directly from root node_modules sidesteps that whole class.
const envPath = path.join(REPO_ROOT, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error(`[grandfather] .env.local not found at ${envPath}`);
  process.exit(1);
}
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
  if (!match) continue;
  const [, key, rawValue] = match;
  // Strip surrounding quotes if present
  const value = rawValue.replace(/^['"]|['"]$/g, '');
  if (!process.env[key]) process.env[key] = value;
}
if (!process.env.DATABASE_URL) {
  console.error('[grandfather] DATABASE_URL not set after loading .env.local');
  process.exit(1);
}

// ─── Use root-resolved @prisma/client (workspace-symlink-free) ───────
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const before = await prisma.professional.groupBy({
    by: ['approvalStatus'],
    _count: { _all: true },
  });
  console.log('[grandfather] before:', JSON.stringify(before, null, 2));

  const result = await prisma.professional.updateMany({
    where: {
      approvalStatus: 'draft',
      // Safety: only pros created before this script run — i.e. seed data
      createdAt: { lt: new Date() },
    },
    data: {
      approvalStatus: 'approved',
      approvedAt: new Date(),
      // approvedByUserId left null — this is a system action, not a human admin
    },
  });

  console.log(`[grandfather] flipped ${result.count} pros draft → approved`);

  const after = await prisma.professional.groupBy({
    by: ['approvalStatus'],
    _count: { _all: true },
  });
  console.log('[grandfather] after:', JSON.stringify(after, null, 2));
}

main()
  .catch((e) => {
    console.error('[grandfather] failed:', e.message);
    if (e.stack) console.error(e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
