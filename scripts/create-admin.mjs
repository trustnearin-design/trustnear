#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Promote a phone number to admin role (or create the user if missing).
 *
 * Usage:
 *   node scripts/create-admin.mjs +919876543210 "Vikas Jain"
 *
 * The login flow is unchanged — the admin signs in with the same OTP flow
 * the customer + pro apps use, but the admin app's /api/auth/verify-otp
 * route gates on role === 'admin'.
 *
 * This is idempotent: running it again with the same phone updates the
 * name if you pass one but won't duplicate the user.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Hand-roll .env.local loading — keeps the script zero-dep so a one-off
// `node scripts/create-admin.mjs` works without pnpm dlx or extra packages.
const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, '..', '.env.local');
try {
  const raw = readFileSync(envPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (!process.env[key]) process.env[key] = value;
  }
} catch (e) {
  console.warn(`(skipping .env.local: ${e.message})`);
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const phone = process.argv[2];
const fullName = process.argv[3] ?? 'TrustNear Admin';

if (!phone || !/^\+?\d{10,15}$/.test(phone)) {
  console.error('Usage: node scripts/create-admin.mjs <+phone> [full name]');
  process.exit(1);
}

// referralCode is unique + required on User. Derive deterministically from the
// phone so repeat runs hit the same row.
const referralCode = `ADM-${phone.slice(-6)}`;

const user = await prisma.user.upsert({
  where: { phone },
  update: {
    role: 'admin',
    fullName,
  },
  create: {
    phone,
    role: 'admin',
    fullName,
    referralCode,
    isVerified: true,
  },
  select: { id: true, phone: true, fullName: true, role: true, createdAt: true },
});

console.log('✓ Admin ready:');
console.log(JSON.stringify(user, null, 2));
await prisma.$disconnect();
