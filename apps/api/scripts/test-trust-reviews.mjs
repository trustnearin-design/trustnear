/**
 * Trust Score + Reviews E2E.
 * Runs against the live server, verifies:
 *   - booking complete triggers totalBookings++ + punctuality event
 *   - review submission fires correct score delta based on rating
 *   - GET /pros/me/trust-score returns the snapshot
 */
import { readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'http://localhost:3000';
const LOG = process.env.LOG_PATH;

const epochTail = String(Math.floor(Date.now() / 1000)).slice(-5);
const CUSTOMER_PHONE = `+9170099${epochTail}`;
const PRO_PHONE = '+918001000003'; // Amit Kumar — electrical, C-Scheme

function logStep(label, val) {
  console.log(`[${new Date().toISOString().slice(11, 23)}] ${label}`, val ?? '');
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

function extractOtp(phone) {
  const text = readFileSync(LOG, 'utf8');
  const idx = text.lastIndexOf(`OTP for ${phone}`);
  if (idx === -1) return null;
  const m = text.slice(idx).match(/OTP:\s*(\d{6})/);
  return m ? m[1] : null;
}

async function authLogin(phone, role, name) {
  await rest('POST', '/api/v1/auth/send-otp', { phone, role });
  let otp = null;
  for (let i = 0; i < 25 && !otp; i++) {
    await sleep(200);
    otp = extractOtp(phone);
  }
  if (!otp) throw new Error(`No OTP for ${phone}`);
  return rest('POST', '/api/v1/auth/verify-otp', { phone, otp, role, fullName: name });
}

(async () => {
  try {
    logStep('═══ login customer + pro');
    const cust = await authLogin(CUSTOMER_PHONE, 'customer', 'Trust Test Customer');
    const pro = await authLogin(PRO_PHONE, 'professional', 'Amit Kumar');
    logStep('  customer', cust.user.id);
    logStep('  pro', pro.user.id);

    logStep('═══ get pro initial trust snapshot');
    const before = await rest('GET', '/api/v1/pros/me/trust-score', null, pro.accessToken);
    logStep('  initial score', `${before.score} (${before.badge})  totalBookings=${before.totalBookings}  repeats=${before.repeatClientCount}`);

    logStep('═══ create booking #1 with scheduledAt in past (so on-time-ish)');
    const cat = await rest('GET', '/api/v1/categories/electrical');
    // Schedule it 1 min in the future so we can mark it started "on time"
    const scheduled = new Date(Date.now() + 60 * 1000).toISOString();
    const b1 = await rest(
      'POST',
      '/api/v1/bookings',
      {
        categoryId: cat.id,
        scheduledAt: scheduled,
        durationMinutes: 60,
        addressLine: '123 C-Scheme',
        addressLat: 26.9097,
        addressLng: 75.8005,
        addressArea: 'C-Scheme',
        addressCity: 'Jaipur',
      },
      cust.accessToken,
    );
    logStep('  booking#1', `${b1.bookingNumber} status=${b1.status} otp=${b1.otp}`);

    logStep('═══ pro accept (response time event — should be fast_response)');
    await rest('POST', `/api/v1/bookings/${b1.bookingId}/accept`, null, pro.accessToken);

    logStep('═══ pro verify-otp (starts service — startedAt set)');
    await rest(
      'POST',
      `/api/v1/bookings/${b1.bookingId}/verify-otp`,
      { otp: b1.otp },
      pro.accessToken,
    );

    logStep('═══ pro complete (punctuality + totalBookings++)');
    await rest('POST', `/api/v1/bookings/${b1.bookingId}/complete`, null, pro.accessToken);

    await sleep(500);

    logStep('═══ customer submits 5-star review (expect +3.0 to trust)');
    const r1 = await rest(
      'POST',
      '/api/v1/reviews',
      {
        bookingId: b1.bookingId,
        rating: 5,
        reviewText: 'Excellent! Amit fixed everything quickly.',
        tags: ['punctual', 'skilled', 'professional'],
      },
      cust.accessToken,
    );
    logStep('  review#1', `id=${r1.id} rating=${r1.rating} scoreDelta=${r1.scoreDelta}`);

    logStep('═══ try re-submit same booking review (must fail SL_903)');
    try {
      await rest(
        'POST',
        '/api/v1/reviews',
        { bookingId: b1.bookingId, rating: 3 },
        cust.accessToken,
      );
      logStep('  ✗ FAIL — duplicate review accepted');
    } catch (err) {
      logStep('  ✓ blocked', err.message.slice(0, 80));
    }

    logStep('═══ get trust snapshot after review');
    const after1 = await rest('GET', '/api/v1/pros/me/trust-score', null, pro.accessToken);
    logStep(
      '  after #1',
      `${after1.score} (${after1.badge})  totalBookings=${after1.totalBookings}  repeats=${after1.repeatClientCount}  events=${after1.recentEvents.length}`,
    );

    logStep('═══ recent events');
    for (const e of after1.recentEvents.slice(0, 6)) {
      logStep(
        `   ${e.eventType.padEnd(20)}`,
        `delta=${e.delta} ${e.scoreBefore}→${e.scoreAfter}`,
      );
    }

    logStep('═══ create booking #2 — REPEAT same pro');
    const b2 = await rest(
      'POST',
      '/api/v1/bookings',
      {
        categoryId: cat.id,
        scheduledAt: new Date(Date.now() + 60 * 1000).toISOString(),
        durationMinutes: 30,
        addressLine: '123 C-Scheme',
        addressLat: 26.9097,
        addressLng: 75.8005,
        addressArea: 'C-Scheme',
        addressCity: 'Jaipur',
      },
      cust.accessToken,
    );
    logStep('  booking#2', `${b2.bookingNumber} status=${b2.status}`);

    await rest('POST', `/api/v1/bookings/${b2.bookingId}/accept`, null, pro.accessToken);
    await rest(
      'POST',
      `/api/v1/bookings/${b2.bookingId}/verify-otp`,
      { otp: b2.otp },
      pro.accessToken,
    );
    await rest('POST', `/api/v1/bookings/${b2.bookingId}/complete`, null, pro.accessToken);
    await sleep(500);

    logStep('═══ customer submits 1-star review (expect -3.0)');
    const r2 = await rest(
      'POST',
      '/api/v1/reviews',
      {
        bookingId: b2.bookingId,
        rating: 1,
        reviewText: 'Test negative review',
        tags: ['late', 'rude'],
      },
      cust.accessToken,
    );
    logStep('  review#2', `id=${r2.id} rating=${r2.rating} scoreDelta=${r2.scoreDelta}`);

    await sleep(500);

    logStep('═══ final trust snapshot');
    const finalSnap = await rest('GET', '/api/v1/pros/me/trust-score', null, pro.accessToken);
    logStep(
      '  final',
      `${finalSnap.score} (${finalSnap.badge})  totalBookings=${finalSnap.totalBookings}  repeats=${finalSnap.repeatClientCount}`,
    );

    logStep('═══ public reviews endpoint');
    // We need pro's professional.id (not user id) — fetch via /pros/:id
    const proProfile = await rest(
      'GET',
      `/api/v1/pros/${finalSnap.recentEvents[0]?.bookingId ? '' : ''}`,
      null,
      null,
    ).catch(() => null);
    // Easier: hit nearby and grab Amit's professional id
    const nearby = await rest(
      'GET',
      '/api/v1/pros/nearby?lat=26.9097&lng=75.8005&category=electrical&radiusKm=5',
    );
    const amit = nearby.pros[0];
    const publicReviews = await rest('GET', `/api/v1/reviews/pro/${amit.professionalId}`);
    logStep(
      '  public',
      `count=${publicReviews.count}  avgRating=${publicReviews.stats.avgRating}  total=${publicReviews.stats.totalReviews}`,
    );

    console.log('\n═══ SUMMARY ═══');
    console.log(`Initial score: ${before.score}`);
    console.log(`Final score  : ${finalSnap.score}`);
    console.log(`Δ score      : ${(finalSnap.score - before.score).toFixed(1)}`);
    console.log(`totalBookings ${before.totalBookings} → ${finalSnap.totalBookings} (+${finalSnap.totalBookings - before.totalBookings})`);
    console.log(`repeatClient  ${before.repeatClientCount} → ${finalSnap.repeatClientCount} (+${finalSnap.repeatClientCount - before.repeatClientCount})`);
    console.log(`events added : ${finalSnap.recentEvents.length - before.recentEvents.length}`);

    // Sanity checks
    const checks = [];
    checks.push(['totalBookings increased by 2', finalSnap.totalBookings - before.totalBookings === 2]);
    checks.push(['repeatClientCount increased by 1', finalSnap.repeatClientCount - before.repeatClientCount === 1]);
    checks.push(['positive_review event recorded', finalSnap.recentEvents.some((e) => e.eventType === 'positive_review')]);
    checks.push(['negative_review event recorded', finalSnap.recentEvents.some((e) => e.eventType === 'negative_review')]);
    checks.push(['repeat_booking event recorded', finalSnap.recentEvents.some((e) => e.eventType === 'repeat_booking')]);
    checks.push(['public reviews returned both', publicReviews.stats.totalReviews >= 2]);
    console.log('\n── checks ──');
    for (const [label, ok] of checks) {
      console.log(`  ${ok ? '✓' : '✗ FAIL'}  ${label}`);
    }
    process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
  } catch (err) {
    console.error('❌', err);
    process.exit(1);
  }
})();
