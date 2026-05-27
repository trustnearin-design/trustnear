#!/usr/bin/env node
/**
 * Brand asset installer for TrustNear.
 *
 * Reads master originals from C:/Users/hp/trustnear-brand/generated/
 * and copies them into the correct per-app paths.
 *
 * Run from monorepo root:
 *   node scripts/install-brand-assets.mjs
 *
 * Re-running is safe — files are overwritten in place. Metro detects the
 * change and reloads automatically (or do `pnpm start --clear`).
 */
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SOURCE = 'C:/Users/hp/trustnear-brand/generated';

const REQUIRED_FILES = [
  'app-icon.png',       // app icon — purple square + coral "tn"
  'splash-bg.png',      // solid purple + white "trust near."
  'splash-loading.png', // dark purple + shield + Loading
  'logo-on-white.png',  // purple "trust near." on white
  'mascot-hero.png',    // hero mascot — 3D character with thumbs up
];
const OPTIONAL_FILES = [
  // Per-variant mascot poses — each fills a specific app context.
  // Missing files fall back to mascot-hero.png in the component.
  'mascot-waving.png',   // greeter — first launch, home header
  'mascot-namaste.png',  // welcome, home footer, success
  'mascot-verified.png', // OTP, KYC, trust strip
  'mascot-doorstep.png', // booking confirmed, "pro arriving"
  'mascot-toolbox.png',  // repair categories, "on the way"
  'mascot-confident.png',// trust banner, Pro app
  'mascot-only.png',     // legacy alias
  'marketing-banner.png',
  'brand-overview.png',
];

const ALL = [...REQUIRED_FILES, ...OPTIONAL_FILES];

// ─── Mapping: source filename → list of destination paths ─────────────
// Each app needs its own copy of the icon files because Expo bundles per app.
// The admin web app (Next.js) takes them from /public/.
const DESTINATIONS = {
  'app-icon.png': [
    'apps/customer/assets/icon.png',
    'apps/customer/assets/adaptive-icon.png',
    'apps/customer/assets/favicon.png',
    'apps/pro/assets/icon.png',
    'apps/pro/assets/adaptive-icon.png',
    'apps/pro/assets/favicon.png',
    'apps/admin/public/icon.png',
    'apps/admin/public/apple-touch-icon.png',
  ],
  'splash-bg.png': [
    'apps/customer/assets/splash-icon.png',
    'apps/pro/assets/splash-icon.png',
  ],
  'splash-loading.png': [
    'apps/customer/assets/splash-loading.png',
    'apps/pro/assets/splash-loading.png',
  ],
  'logo-on-white.png': [
    'apps/customer/assets/logo-on-white.png',
    'apps/pro/assets/logo-on-white.png',
    'apps/admin/public/logo.png',
  ],
  'mascot-hero.png': [
    'apps/customer/assets/mascot-hero.png',
    'apps/pro/assets/mascot-hero.png',
  ],
  'mascot-waving.png': [
    'apps/customer/assets/mascot-waving.png',
    'apps/pro/assets/mascot-waving.png',
  ],
  'mascot-namaste.png': [
    'apps/customer/assets/mascot-namaste.png',
    'apps/pro/assets/mascot-namaste.png',
  ],
  'mascot-verified.png': [
    'apps/customer/assets/mascot-verified.png',
    'apps/pro/assets/mascot-verified.png',
  ],
  'mascot-doorstep.png': [
    'apps/customer/assets/mascot-doorstep.png',
    'apps/pro/assets/mascot-doorstep.png',
  ],
  'mascot-toolbox.png': [
    'apps/customer/assets/mascot-toolbox.png',
    'apps/pro/assets/mascot-toolbox.png',
  ],
  'mascot-confident.png': [
    'apps/customer/assets/mascot-confident.png',
    'apps/pro/assets/mascot-confident.png',
  ],
  'mascot-only.png': [
    'apps/customer/assets/mascot-only.png',
    'apps/pro/assets/mascot-only.png',
  ],
  'marketing-banner.png': [
    'apps/customer/assets/marketing-banner.png',
  ],
  'brand-overview.png': [
    'apps/customer/assets/brand-overview.png',
  ],
};

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

let copied = 0;
let skipped = 0;
let missingRequired = [];

console.log('TrustNear brand asset installer');
console.log('───────────────────────────────────');
console.log(`Source: ${SOURCE}`);
console.log(`Target: ${REPO_ROOT}\n`);

// Per-variant mascot poses fall back to mascot-hero.png if source is missing.
// This guarantees Metro's require() calls in MascotImage.tsx never fail
// bundle — every per-pose slot has a file, even if it's the hero placeholder.
const MASCOT_VARIANT_FILES = [
  'mascot-waving.png',
  'mascot-namaste.png',
  'mascot-verified.png',
  'mascot-doorstep.png',
  'mascot-toolbox.png',
  'mascot-confident.png',
];

const heroSrc = resolve(SOURCE, 'mascot-hero.png');

for (const file of ALL) {
  let src = resolve(SOURCE, file);
  const isRequired = REQUIRED_FILES.includes(file);
  const isMascotVariant = MASCOT_VARIANT_FILES.includes(file);

  if (!existsSync(src)) {
    if (isRequired) {
      missingRequired.push(file);
      console.log(`  ✗ ${file} (REQUIRED — not found)`);
      continue;
    }
    if (isMascotVariant && existsSync(heroSrc)) {
      // Fall back to mascot-hero.png so the per-pose require() in
      // MascotImage.tsx still resolves at bundle time.
      src = heroSrc;
      console.log(`  ↳ ${file} missing — falling back to mascot-hero.png`);
    } else {
      console.log(`  ○ ${file} (optional — skipped)`);
      skipped++;
      continue;
    }
  }

  const sizeKb = Math.round(statSync(src).size / 1024);
  const dests = DESTINATIONS[file] ?? [];
  for (const rel of dests) {
    const target = resolve(REPO_ROOT, rel);
    ensureDir(target);
    copyFileSync(src, target);
    copied++;
  }
  console.log(`  ✓ ${file} (${sizeKb} KB) → ${dests.length} destinations`);
}

console.log('\n───────────────────────────────────');
console.log(`Copied: ${copied} files · Skipped: ${skipped} optional`);

if (missingRequired.length > 0) {
  console.log(`\n⚠ Missing ${missingRequired.length} required file(s):`);
  for (const f of missingRequired) {
    console.log(`  - ${SOURCE}/${f}`);
  }
  console.log('\nSave them and re-run this script.');
  process.exit(1);
}

console.log('\n✓ All required assets installed. Restart Metro to bundle.');
console.log('  cd apps/customer && pnpm start --clear');
