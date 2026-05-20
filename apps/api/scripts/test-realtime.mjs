/**
 * E2E test for Phase 1.3 realtime — runs an actual customer + pro pair
 * against the live server. NOT a unit test, run manually post-boot:
 *   pnpm --filter @sevalink/api exec node scripts/test-realtime.mjs
 */
import { io as ioClient } from 'socket.io-client';
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'http://localhost:3000';
const LOG = process.env.LOG_PATH;

// Per-run unique customer phone to avoid OTP collisions with prior runs.
// Format: +91 7XXXXNNNNN where NNNNN is last 5 digits of epoch seconds.
const epochTail = String(Math.floor(Date.now() / 1000)).slice(-5);
const CUSTOMER_PHONE = `+9170000${epochTail}`;
const PRO_PHONE = '+918001000003'; // Amit Kumar (electrical, C-Scheme) — seeded

const events = [];
function record(label, payload) {
  const ts = new Date().toISOString().slice(11, 23);
  events.push({ ts, label, payload });
  console.log(`[${ts}] ${label}`, payload ? JSON.stringify(payload).slice(0, 200) : '');
}

async function rest(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`${method} ${path}: ${json.error?.code} ${json.error?.message}`);
  }
  return json.data;
}

async function authLogin(phone, role, name) {
  const tStart = Date.now();
  await rest('POST', '/api/v1/auth/send-otp', { phone, role });
  // Poll the log for up to 5s — pino-pretty flushes asynchronously on Windows
  let otp = null;
  for (let attempt = 0; attempt < 25 && !otp; attempt++) {
    await sleep(200);
    otp = LOG ? extractLatestOtpForPhone(LOG, phone, tStart) : null;
  }
  if (!otp) throw new Error(`No OTP found for ${phone}`);
  return rest('POST', '/api/v1/auth/verify-otp', { phone, otp, role, fullName: name });
}

function extractLatestOtpForPhone(path, phone, sinceMs) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  // Walk backwards through "OTP: 123456" matches, taking the latest one
  // that occurs after a banner mentioning the phone
  const banner = `OTP for ${phone}`;
  const idx = text.lastIndexOf(banner);
  if (idx === -1) return null;
  const after = text.slice(idx);
  const m = after.match(/OTP:\s*(\d{6})/);
  return m ? m[1] : null;
  void sinceMs;
}

function connectSocket(token, label) {
  return new Promise((resolve, reject) => {
    const socket = ioClient(API, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    socket.on('connect', () => {
      record(`${label}: connected`, { id: socket.id });
      resolve(socket);
    });
    socket.on('connect_error', (err) => {
      reject(new Error(`${label} connect_error: ${err.message}`));
    });
  });
}

function joinBooking(socket, bookingId, label) {
  return new Promise((resolve, reject) => {
    socket.emit('booking:join', { bookingId }, (ack) => {
      if (ack?.ok) {
        record(`${label}: joined room booking:${bookingId.slice(0, 8)}`);
        resolve();
      } else {
        reject(new Error(`${label} join failed: ${ack?.error}`));
      }
    });
  });
}

(async () => {
  try {
    console.log('═══ STEP 1 — login customer + pro ═══');
    const cust = await authLogin(CUSTOMER_PHONE, 'customer', 'Realtime Test');
    record('customer login', { id: cust.user.id });
    const pro = await authLogin(PRO_PHONE, 'professional', 'Amit Kumar');
    record('pro login', { id: pro.user.id, role: pro.user.role });

    console.log('\n═══ STEP 2 — create booking (REST, auto-match) ═══');
    const electricalCat = await rest('GET', '/api/v1/categories/electrical');
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const booking = await rest(
      'POST',
      '/api/v1/bookings',
      {
        categoryId: electricalCat.id,
        scheduledAt: tomorrow,
        durationMinutes: 60,
        addressLine: '123 C-Scheme, near Statue Circle',
        addressLat: 26.9097,
        addressLng: 75.8005,
        addressArea: 'C-Scheme',
        addressCity: 'Jaipur',
      },
      cust.accessToken,
    );
    record('booking created', { id: booking.bookingId, status: booking.status });

    console.log('\n═══ STEP 3 — connect both sockets ═══');
    const custSock = await connectSocket(cust.accessToken, 'customer');
    const proSock = await connectSocket(pro.accessToken, 'pro');

    // Wire listeners on customer side
    custSock.on('pro:location', (p) => record('customer ← pro:location', p));
    custSock.on('booking:status', (p) => record('customer ← booking:status', p));
    custSock.on('chat:message', (p) => record('customer ← chat:message', p));

    // Wire listeners on pro side
    proSock.on('booking:status', (p) => record('pro ← booking:status', p));
    proSock.on('chat:message', (p) => record('pro ← chat:message', p));

    console.log('\n═══ STEP 4 — both join booking room ═══');
    await joinBooking(custSock, booking.bookingId, 'customer');
    await joinBooking(proSock, booking.bookingId, 'pro');

    console.log('\n═══ STEP 5 — REST: pro accepts (broadcasts booking:status) ═══');
    await rest('POST', `/api/v1/bookings/${booking.bookingId}/accept`, null, pro.accessToken);
    await sleep(800);

    console.log('\n═══ STEP 6 — pro emits GPS — customer must receive pro:location ═══');
    await new Promise((resolve, reject) => {
      proSock.emit(
        'location:update',
        { latitude: 26.911, longitude: 75.802, speedKmh: 20 },
        (ack) => {
          if (ack?.ok) {
            record('pro: GPS sent (1st)', ack);
            resolve();
          } else {
            reject(new Error(`GPS failed: ${ack?.error}`));
          }
        },
      );
    });
    await sleep(800);

    console.log('\n═══ STEP 7 — pro emits 2nd GPS within throttle (should be dropped silently) ═══');
    proSock.emit(
      'location:update',
      { latitude: 26.9105, longitude: 75.8015, speedKmh: 22 },
      (ack) => record('pro: GPS sent (2nd, throttled?)', ack),
    );
    await sleep(800);

    console.log('\n═══ STEP 8 — chat round-trip ═══');
    await new Promise((resolve) => {
      custSock.emit(
        'chat:send',
        { bookingId: booking.bookingId, message: 'Bhaiya jaldi aajao!' },
        (ack) => {
          record('customer: chat sent', ack);
          resolve();
        },
      );
    });
    await sleep(500);
    await new Promise((resolve) => {
      proSock.emit(
        'chat:send',
        { bookingId: booking.bookingId, message: 'Bas 5 min me pahunch raha' },
        (ack) => {
          record('pro: chat sent', ack);
          resolve();
        },
      );
    });
    await sleep(800);

    console.log('\n═══ STEP 9 — REST: pro start-trip (broadcasts booking:status) ═══');
    await rest('POST', `/api/v1/bookings/${booking.bookingId}/start-trip`, null, pro.accessToken);
    await sleep(800);

    console.log('\n═══ STEP 10 — wait 2.5s for throttle to clear + new GPS ═══');
    await sleep(2500);
    await new Promise((resolve) => {
      proSock.emit(
        'location:update',
        { latitude: 26.910, longitude: 75.801, speedKmh: 25 },
        (ack) => {
          record('pro: GPS sent (3rd, post-throttle)', ack);
          resolve();
        },
      );
    });
    await sleep(800);

    console.log('\n═══ STEP 11 — SOS trigger (no admin connected, so no visible event) ═══');
    await new Promise((resolve) => {
      custSock.emit(
        'sos:trigger',
        {
          bookingId: booking.bookingId,
          latitude: 26.91,
          longitude: 75.80,
          reason: 'Test only',
        },
        (ack) => {
          record('customer: SOS sent', ack);
          resolve();
        },
      );
    });
    await sleep(500);

    console.log('\n═══ STEP 12 — disconnect both ═══');
    custSock.disconnect();
    proSock.disconnect();
    await sleep(300);

    console.log('\n═══ SUMMARY ═══');
    const counts = events.reduce((acc, e) => {
      acc[e.label] = (acc[e.label] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify(counts, null, 2));

    const proLocCount = counts['customer ← pro:location'] || 0;
    const statusCount = counts['customer ← booking:status'] || 0;
    const chatBothSeen =
      (counts['customer ← chat:message'] || 0) >= 2 &&
      (counts['pro ← chat:message'] || 0) >= 2;
    console.log('\n── checks ──');
    console.log(`  pro:location received by customer       : ${proLocCount} ${proLocCount >= 2 ? '✓' : '✗ FAIL'}`);
    console.log(`  booking:status received by customer     : ${statusCount} ${statusCount >= 2 ? '✓' : '✗ FAIL'}`);
    console.log(`  chat round-trip seen by both sides      : ${chatBothSeen ? '✓' : '✗ FAIL'}`);
    process.exit(0);
  } catch (err) {
    console.error('❌', err);
    process.exit(1);
  }
})();
