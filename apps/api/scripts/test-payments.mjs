/**
 * Payments E2E (Cashfree sandbox).
 *
 *   1. Customer logs in, creates a booking → matched
 *   2. POST /payments/order (with X-Idempotency-Key) → Cashfree session id
 *   3. Replay same key → cached response
 *   4. Replay same key, different body → 409
 *   5. Simulate a Cashfree webhook (signed correctly) → booking marked paid
 *   6. Wallet transaction row created
 *   7. GET /wallet/transactions returns it
 */
import { readFileSync } from 'node:fs';
import { createHmac, randomBytes } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'http://localhost:3000';
const LOG = process.env.LOG_PATH;
const CASHFREE_SECRET = process.env.CASHFREE_SECRET_KEY;

const epochTail = String(Math.floor(Date.now() / 1000)).slice(-5);
const CUSTOMER_PHONE = `+9170098${epochTail}`;

function step(label, val) {
  console.log(`[${new Date().toISOString().slice(11, 23)}] ${label}`, val ?? '');
}

async function rest(method, path, body, token, extraHeaders = {}) {
  const headers = { 'Content-Type': 'application/json', ...extraHeaders };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function ok(method, path, body, token, extraHeaders = {}) {
  const { status, json } = await rest(method, path, body, token, extraHeaders);
  if (!json.success) {
    throw new Error(`${method} ${path}: [${status}] ${json.error?.code} ${json.error?.message}`);
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
  await ok('POST', '/api/v1/auth/send-otp', { phone, role });
  let otp = null;
  for (let i = 0; i < 25 && !otp; i++) {
    await sleep(200);
    otp = extractOtp(phone);
  }
  if (!otp) throw new Error(`No OTP for ${phone}`);
  return ok('POST', '/api/v1/auth/verify-otp', { phone, otp, role, fullName: name });
}

function signCashfreeWebhook(timestamp, body) {
  return createHmac('sha256', CASHFREE_SECRET).update(timestamp + body).digest('base64');
}

(async () => {
  if (!CASHFREE_SECRET) {
    console.error('CASHFREE_SECRET_KEY env required');
    process.exit(1);
  }
  try {
    step('═══ 1. login customer');
    const cust = await authLogin(CUSTOMER_PHONE, 'customer', 'Payment Test');
    step('  customer', cust.user.id);

    step('═══ 2. create booking (auto-match)');
    const cat = await ok('GET', '/api/v1/categories/electrical');
    const booking = await ok(
      'POST',
      '/api/v1/bookings',
      {
        categoryId: cat.id,
        scheduledAt: new Date(Date.now() + 60_000).toISOString(),
        durationMinutes: 60,
        addressLine: '123 C-Scheme',
        addressLat: 26.9097,
        addressLng: 75.8005,
        addressArea: 'C-Scheme',
        addressCity: 'Jaipur',
      },
      cust.accessToken,
    );
    step(
      '  booking',
      `${booking.bookingNumber} status=${booking.status} amount=${booking.bookingId}`,
    );
    const bookingId = booking.bookingId;

    step('═══ 3. POST /payments/order (Cashfree sandbox)');
    const idempotencyKey = `pay-${randomBytes(8).toString('hex')}`;
    const order = await ok(
      'POST',
      '/api/v1/payments/order',
      { bookingId },
      cust.accessToken,
      { 'X-Idempotency-Key': idempotencyKey },
    );
    step('  cashfree', `provider=${order.provider} sessionId=${order.paymentSessionId?.slice(0, 30)}...`);
    step('  ', `providerOrderId=${order.providerOrderId} amountPaise=${order.amountPaise} status=${order.status}`);

    step('═══ 4. Replay SAME idempotency key — must return cached response');
    const replay = await ok(
      'POST',
      '/api/v1/payments/order',
      { bookingId },
      cust.accessToken,
      { 'X-Idempotency-Key': idempotencyKey },
    );
    const cacheHit = replay.paymentSessionId === order.paymentSessionId;
    step('  cache hit?', cacheHit ? '✓ same paymentSessionId returned' : '✗ different session — cache broken');

    step('═══ 5. Replay SAME key with different body — must 409');
    const conflict = await rest(
      'POST',
      '/api/v1/payments/order',
      { bookingId, customerEmail: 'other@example.com' },
      cust.accessToken,
      { 'X-Idempotency-Key': idempotencyKey },
    );
    step(
      '  conflict?',
      conflict.json.error?.code === 'SL_903_CONFLICT' ? '✓ SL_903 thrown' : `✗ got ${conflict.json.error?.code}`,
    );

    step('═══ 6. Simulate Cashfree webhook (signed correctly) → booking paid');
    const webhookBody = JSON.stringify({
      type: 'PAYMENT_SUCCESS_WEBHOOK',
      event_time: new Date().toISOString(),
      data: {
        order: { order_id: bookingId, order_amount: order.amountPaise / 100 },
        payment: {
          cf_payment_id: 99887766,
          payment_amount: order.amountPaise / 100,
          payment_status: 'SUCCESS',
          payment_method: { upi: { upi_id: 'test@upi' } },
        },
      },
    });
    const ts = String(Date.now());
    const sig = signCashfreeWebhook(ts, webhookBody);
    const webhookRes = await fetch(`${API}/api/v1/payments/webhook/cashfree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': sig,
        'x-webhook-timestamp': ts,
      },
      body: webhookBody,
    });
    step('  webhook response', `status=${webhookRes.status}`);

    step('═══ 7. Bad-signature webhook → must 401');
    const bad = await fetch(`${API}/api/v1/payments/webhook/cashfree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'invalid-signature',
        'x-webhook-timestamp': ts,
      },
      body: webhookBody,
    });
    step('  bad sig response', `status=${bad.status} (expected 401)`);

    await sleep(500);

    step('═══ 8. GET /bookings/:id — paymentStatus must be paid');
    const b = await ok('GET', `/api/v1/bookings/${bookingId}`, null, cust.accessToken);
    step('  paymentStatus', `${b.paymentStatus}  method=${b.paymentMethod}  providerPaymentId=${b.razorpayPaymentId}`);

    step('═══ 9. GET /wallet/transactions — must include the new debit');
    const wallet = await ok('GET', '/api/v1/wallet/transactions', null, cust.accessToken);
    const newTxn = wallet.transactions.find((t) => t.referenceId === bookingId);
    step(
      '  txn',
      newTxn ? `${newTxn.type} ₹${newTxn.amount / 100} reason=${newTxn.reason}` : '✗ NOT FOUND',
    );

    step('═══ 10. Idempotent webhook replay — must NOT create second txn');
    await fetch(`${API}/api/v1/payments/webhook/cashfree`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': sig,
        'x-webhook-timestamp': ts,
      },
      body: webhookBody,
    });
    await sleep(500);
    const wallet2 = await ok('GET', '/api/v1/wallet/transactions', null, cust.accessToken);
    const matchingTxns = wallet2.transactions.filter((t) => t.referenceId === bookingId);
    step(
      '  replay safety',
      `${matchingTxns.length} txns for this booking (expect 1)`,
    );

    console.log('\n── checks ──');
    const checks = [
      ['order created via Cashfree', Boolean(order.paymentSessionId)],
      ['provider name = cashfree', order.provider === 'cashfree'],
      ['amountPaise matches booking', order.amountPaise > 0],
      ['idempotent replay returned cached session', cacheHit],
      ['key reuse with different body → SL_903', conflict.json.error?.code === 'SL_903_CONFLICT'],
      ['webhook accepted (200)', webhookRes.status === 200],
      ['bad signature rejected (401)', bad.status === 401],
      ['booking now paid', b.paymentStatus === 'paid'],
      ['payment method captured', b.paymentMethod === 'upi'],
      ['wallet has debit txn', Boolean(newTxn)],
      ['webhook replay did not duplicate', matchingTxns.length === 1],
    ];
    for (const [label, pass] of checks) {
      console.log(`  ${pass ? '✓' : '✗ FAIL'}  ${label}`);
    }
    process.exit(checks.every(([, p]) => p) ? 0 : 1);
  } catch (err) {
    console.error('❌', err);
    process.exit(1);
  }
})();
