#!/usr/bin/env node
/* eslint-disable */
/**
 * Test helper — Phase 3g admin UI testing.
 *
 * Picks a grandfathered pro, fills the Phase 3g personal-info fields
 * (which seed data never populated), and flips approval_status to
 * `submitted_for_review`. Result: the admin's /approvals queue now has
 * a row to review.
 *
 * Defaults:
 *   - Target pro: +919876500020 (Renu Singh)
 *   - Re-runnable: if pro is already submitted_for_review, just refreshes
 *     the submittedForReviewAt timestamp.
 *
 * To revert: run `scripts/grandfather-existing-pros.mjs` (it re-approves
 * any draft pros — but this script leaves status as submitted_for_review,
 * so you'd flip them back manually or via admin UI approve action).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const envPath = path.join(REPO_ROOT, '.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i);
  if (!match) continue;
  if (!process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const targetPhone = process.argv[2] ?? '+919876500020';

async function main() {
  const user = await prisma.user.findUnique({
    where: { phone: targetPhone },
    include: { professional: true },
  });
  if (!user) {
    console.error(`[fake-pending] User not found: ${targetPhone}`);
    process.exit(1);
  }
  if (!user.professional) {
    console.error(`[fake-pending] User ${targetPhone} is not a professional`);
    process.exit(1);
  }

  console.log(`[fake-pending] Found ${user.fullName} (${targetPhone})`);
  console.log(`  current approvalStatus: ${user.professional.approvalStatus}`);

  const updated = await prisma.professional.update({
    where: { id: user.professional.id },
    data: {
      approvalStatus: 'submitted_for_review',
      submittedForReviewAt: new Date(),
      approvedAt: null,
      approvedByUserId: null,
      rejectionReason: null,
      rejectionFields: [],
      // Fill Phase 3g personal-info fields (seed never set these)
      gender: user.professional.gender ?? 'female',
      dob: user.professional.dob ?? new Date('1990-08-15'),
      languagesSpoken:
        user.professional.languagesSpoken.length > 0
          ? user.professional.languagesSpoken
          : ['hi', 'en'],
      currentAddress:
        user.professional.currentAddress ??
        'Plot 42, Gokul Marg, Malviya Nagar, Jaipur 302017',
      serviceRadiusKm: user.professional.serviceRadiusKm > 0 ? user.professional.serviceRadiusKm : 7,
    },
  });

  console.log(`[fake-pending] Updated:`);
  console.log(`  approvalStatus: ${updated.approvalStatus}`);
  console.log(`  submittedForReviewAt: ${updated.submittedForReviewAt}`);
  console.log(`  gender: ${updated.gender}`);
  console.log(`  dob: ${updated.dob?.toISOString().slice(0, 10)}`);
  console.log(`  languagesSpoken: ${updated.languagesSpoken.join(', ')}`);
  console.log(`  currentAddress: ${updated.currentAddress}`);
  console.log('');
  console.log(`✓ Go to http://localhost:3001/approvals — ${user.fullName} should appear in "Pending review" tab`);
}

main()
  .catch((e) => {
    console.error('[fake-pending] failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
