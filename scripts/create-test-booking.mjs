#!/usr/bin/env node
/* eslint-disable */
/**
 * Create a test booking targeting a specific seeded Pro — for Phase 3e
 * Pro app E2E testing. Mirrors what a customer would do in the customer
 * app, but in one script so testers can iterate quickly.
 *
 * Flow:
 *   1. Send OTP for a hardcoded test customer phone
 *   2. Poll apps/api/.last-otp.txt for the OTP that the Mock SMS provider
 *      mirrored there
 *   3. Verify OTP → get JWT
 *   4. Look up the target Pro by their phone (also picks up the location)
 *   5. POST /bookings with preferredProId so the matcher auto-assigns
 *   6. Print bookingId + customer-visible OTP for the Pro to enter
 *
 * Usage:
 *   node scripts/create-test-booking.mjs <proPhone> [categorySlug]
 *
 * Example:
 *   node scripts/create-test-booking.mjs +919876500020 salon-women
 *
 * Defaults:
 *   - Customer phone: +918888100001 (created on first run)
 *   - Category: matches one of the pro's serviceOfferings
 *   - Schedule: 30 min from now
 *   - Duration: 60 min
 *   - Address: pro's own area (so distance check passes)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OTP_FILE = path.join(REPO_ROOT, 'apps/api/.last-otp.txt');

// Use 127.0.0.1 (not "localhost") — Node 18+ fetch resolves "localhost" to ::1
// first; if the API only binds to IPv4 (the dev default), fetch fails with the
// uninformative "fetch failed" message. Force IPv4 to avoid that whole class.
const API = process.env.SEVALINK_API_URL ?? 'http://127.0.0.1:3000';
const CUSTOMER_PHONE = '+918888100001';

const proPhoneRaw = process.argv[2];
const overrideCategory = process.argv[3];
if (!proPhoneRaw) {
  console.error(
    'Usage: node scripts/create-test-booking.mjs <proPhone> [categorySlug]\n' +
      '  example: node scripts/create-test-booking.mjs +919876500020 salon-women',
  );
  process.exit(1);
}

// /pros/nearby doesn't expose phone (privacy). Map of the 6 most likely
// test pros → {fullName, locality, defaultCategory} so we can resolve
// the professionalId via /pros/nearby filtered to that locality + category
// and matched by fullName. Add more entries as needed.
const KNOWN_PROS = {
  '+919876500001': { fullName: 'Rohit Sharma', lat: 26.913, lng: 75.737, defaultCategory: 'home-cleaning' },
  '+919876500002': { fullName: 'Priya Sharma', lat: 26.913, lng: 75.737, defaultCategory: 'salon-women' },
  '+919876500013': { fullName: 'Manish Choudhary', lat: 26.851, lng: 75.821, defaultCategory: 'plumbing' },
  '+919876500019': { fullName: 'Sandeep Rathore', lat: 26.917, lng: 75.799, defaultCategory: 'electrical' },
  '+919876500020': { fullName: 'Renu Singh', lat: 26.917, lng: 75.799, defaultCategory: 'salon-women' },
  '+919876500022': { fullName: 'Asha Maheshwari', lat: 26.917, lng: 75.799, defaultCategory: 'yoga' },
};

const proInfo = KNOWN_PROS[proPhoneRaw];
if (!proInfo) {
  console.error(
    `Unknown pro phone ${proPhoneRaw}. Add it to KNOWN_PROS in this script, or use one of: ${Object.keys(KNOWN_PROS).join(', ')}`,
  );
  process.exit(1);
}

async function api(path, opts = {}, token) {
  const res = await fetch(`${API}/api/v1${path}`, {
    method: opts.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || (json && json.success === false)) {
    throw new Error(`${opts.method ?? 'GET'} ${path} → ${res.status}: ${text}`);
  }
  return json.data;
}

async function waitForOtp(beforeTs, timeoutMs = 8000) {
  // Mock SMS provider rewrites .last-otp.txt with the latest OTP; we wait
  // until the file's mtime advances past `beforeTs`.
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const stat = fs.statSync(OTP_FILE);
      if (stat.mtimeMs > beforeTs) {
        const content = fs.readFileSync(OTP_FILE, 'utf8').trim();
        // File may have multiple lines (one per OTP); take the last
        const lines = content.split(/\r?\n/).filter(Boolean);
        const last = lines.at(-1) ?? '';
        // Line format: "<isoTs> <+91phone> <6-digit-otp>" — take last field.
        const parts = last.trim().split(/\s+/);
        const candidate = parts.at(-1) ?? '';
        if (/^\d{6}$/.test(candidate)) return candidate;
      }
    } catch {
      // File doesn't exist yet — keep waiting
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for OTP in ${OTP_FILE}`);
}

async function authCustomer() {
  const beforeTs = (() => {
    try {
      return fs.statSync(OTP_FILE).mtimeMs;
    } catch {
      return 0;
    }
  })();

  console.log(`[booking] sending OTP to ${CUSTOMER_PHONE}…`);
  await api('/auth/send-otp', {
    method: 'POST',
    body: { phone: CUSTOMER_PHONE, role: 'customer' },
  });

  const otp = await waitForOtp(beforeTs);
  console.log(`[booking] got OTP ${otp}`);

  const res = await api('/auth/verify-otp', {
    method: 'POST',
    body: { phone: CUSTOMER_PHONE, otp, role: 'customer' },
  });
  return res.accessToken;
}

async function findPro(token, info, categorySlug) {
  // Use /pros/nearby at the pro's seeded locality + their default category,
  // match by fullName (phone isn't returned by the public endpoint).
  const res = await api(
    `/pros/nearby?lat=${info.lat}&lng=${info.lng}&category=${categorySlug}&radiusKm=20&limit=50`,
    {},
    token,
  );
  const match = res.pros?.find((p) => p.fullName === info.fullName);
  if (!match) {
    throw new Error(
      `Could not locate ${info.fullName} via /pros/nearby for ${categorySlug} — is the API running and DB seeded?`,
    );
  }
  return {
    professionalId: match.professionalId,
    professionalName: match.fullName,
    categorySlug,
    lat: info.lat,
    lng: info.lng,
  };
}

async function getCategoryId(token, slug) {
  const res = await api(`/categories/${slug}`, {}, token);
  return res.id;
}

async function main() {
  const token = await authCustomer();
  console.log(`[booking] customer authed, JWT acquired`);

  const categorySlug = overrideCategory ?? proInfo.defaultCategory;
  console.log(`[booking] looking up ${proInfo.fullName} (${proPhoneRaw}) for ${categorySlug}…`);
  const pro = await findPro(token, proInfo, categorySlug);
  console.log(`[booking] found ${pro.professionalName} · pro id ${pro.professionalId}`);

  const categoryId = await getCategoryId(token, categorySlug);

  // Schedule 30 min from now, address = pro's coords + 50m offset
  const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const addressLat = pro.lat + 0.0005;
  const addressLng = pro.lng + 0.0005;

  console.log(
    `[booking] creating booking for category ${categorySlug} at ${addressLat.toFixed(5)}, ${addressLng.toFixed(5)}…`,
  );
  const booking = await api(
    '/bookings',
    {
      method: 'POST',
      body: {
        categoryId,
        scheduledAt,
        durationMinutes: 60,
        addressLine: 'Test address · Phase 3e E2E',
        addressLat,
        addressLng,
        addressArea: 'Test area',
        addressCity: 'Jaipur',
        notes: 'Phase 3e Pro app smoke test',
        preferredProId: pro.professionalId,
      },
    },
    token,
  );

  console.log('\n========================================');
  console.log(`✓ Booking created`);
  console.log(`  bookingId      : ${booking.bookingId}`);
  console.log(`  bookingNumber  : ${booking.bookingNumber}`);
  console.log(`  status         : ${booking.status}`);
  console.log(`  OTP for Pro    : ${booking.otp}   ← enter this in Pro app's "Arrived" sheet`);
  console.log('========================================\n');
  console.log(`Now in Pro app: Jobs tab → "New" segment → tap the new card → Accept → walk the flow.`);
}

main().catch((e) => {
  console.error('[booking] failed:', e.message);
  process.exit(1);
});
