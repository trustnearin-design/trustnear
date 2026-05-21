#!/usr/bin/env node
/* eslint-disable */
/**
 * Fake Pro driver — simulates the Pro app for a single booking until the
 * Pro app (Phase 3) actually exists. Walks through the full state machine
 * for a customer-side E2E demo.
 *
 *   matched
 *     → POST /accept           (confirmed)
 *     → POST /start-trip       (pro_en_route)
 *     → emit location every 5s (map + ETA updates land on customer)
 *     → POST /verify-otp       (in_progress) [optional, needs OTP]
 *     → POST /complete         (completed)   [only after verify-otp]
 *
 * Usage:
 *   SEVALINK_PRO_JWT=eyJ... node scripts/fake-pro.mjs <bookingId> [customerOtp]
 *
 * Getting the JWT (seeded pros have predictable phone numbers; OTP shows
 * in the apps/api stdout because the Mock SMS provider just logs):
 *   curl -X POST http://localhost:3000/api/v1/auth/send-otp \
 *     -H "Content-Type: application/json" \
 *     -d '{"phone":"+918000000001","role":"professional"}'
 *   # check apps/api stdout for the 6-digit OTP, then:
 *   curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
 *     -H "Content-Type: application/json" \
 *     -d '{"phone":"+918000000001","otp":"XXXXXX","role":"professional"}'
 *   # copy the accessToken
 *
 * If you pass the customer's OTP (visible on the customer app's booking
 * detail screen during confirmed/pro_en_route), the script will also
 * verify-otp + complete after "arriving."
 */

import { io } from 'socket.io-client';

const API = process.env.SEVALINK_API_URL ?? 'http://localhost:3000';
const TOKEN = process.env.SEVALINK_PRO_JWT;
const BOOKING_ID = process.argv[2];
const CUSTOMER_OTP = process.argv[3];

if (!TOKEN) {
  console.error('Missing SEVALINK_PRO_JWT env var. See instructions in this file.');
  process.exit(1);
}
if (!BOOKING_ID) {
  console.error('Usage: SEVALINK_PRO_JWT=... node scripts/fake-pro.mjs <bookingId> [customerOtp]');
  process.exit(1);
}

async function api(path, opts = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.headers ?? {}),
    },
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

function step(from, to, fraction) {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lng: from.lng + (to.lng - from.lng) * fraction,
  };
}

async function safe(label, p) {
  try {
    const r = await p;
    console.log(`[fake-pro] ✓ ${label}`);
    return r;
  } catch (e) {
    console.log(`[fake-pro] (skipping ${label}) ${e.message}`);
    return null;
  }
}

async function main() {
  let booking = await api(`/bookings/${BOOKING_ID}`);
  console.log(`[fake-pro] booking ${booking.bookingNumber} · current status ${booking.status}`);

  // Walk forward through transitions that haven't happened yet.
  if (booking.status === 'matched') {
    await safe('accept', api(`/bookings/${BOOKING_ID}/accept`, { method: 'POST', body: '{}' }));
  }
  if (booking.status === 'matched' || booking.status === 'confirmed') {
    await safe(
      'start-trip',
      api(`/bookings/${BOOKING_ID}/start-trip`, { method: 'POST', body: '{}' }),
    );
  }
  booking = await api(`/bookings/${BOOKING_ID}`);
  console.log(`[fake-pro] status now ${booking.status}`);

  const dest = { lat: Number(booking.addressLat), lng: Number(booking.addressLng) };
  let current = { lat: dest.lat - 0.027, lng: dest.lng - 0.027 };
  console.log(`[fake-pro] customer at ${dest.lat.toFixed(5)},${dest.lng.toFixed(5)}`);
  console.log(`[fake-pro] starting ~3 km out`);

  const socket = io(API, {
    transports: ['websocket'],
    auth: { token: TOKEN },
    reconnection: true,
  });

  socket.on('connect_error', (err) => console.error('[fake-pro] connect_error:', err.message));

  await new Promise((resolve) => socket.on('connect', resolve));
  console.log('[fake-pro] socket connected');

  await new Promise((resolve, reject) => {
    socket.emit('booking:join', { bookingId: BOOKING_ID }, (resp) => {
      if (resp?.ok) resolve();
      else reject(new Error(`booking:join: ${resp?.error ?? 'unknown'}`));
    });
  });
  console.log('[fake-pro] joined booking room');

  async function tick() {
    current = step(current, dest, 0.08);
    const dLat = dest.lat - current.lat;
    const dLng = dest.lng - current.lng;
    const distM = Math.hypot(dLat * 111_000, dLng * 95_000);

    socket.emit(
      'location:update',
      { latitude: current.lat, longitude: current.lng, heading: 0, speedKmh: 24 },
      (resp) => {
        if (resp?.ok) {
          console.log(`[fake-pro] ↳ ${Math.round(distM)} m away`);
        } else {
          console.error('[fake-pro] location:update rejected:', resp);
        }
      },
    );

    if (distM < 50) {
      console.log('[fake-pro] arrived (within 50 m)');
      if (CUSTOMER_OTP) {
        await safe(
          'verify-otp',
          api(`/bookings/${BOOKING_ID}/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({ otp: CUSTOMER_OTP }),
          }),
        );
        await new Promise((r) => setTimeout(r, 1500));
        await safe(
          'complete',
          api(`/bookings/${BOOKING_ID}/complete`, { method: 'POST', body: '{}' }),
        );
      } else {
        console.log('[fake-pro] no customerOtp passed — leaving at pro_en_route');
      }
      socket.disconnect();
      process.exit(0);
    }
    setTimeout(() => void tick(), 5000);
  }

  void tick();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
