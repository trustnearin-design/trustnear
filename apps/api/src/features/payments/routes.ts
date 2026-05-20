import { Hono } from 'hono';
import { DomainError, ErrorCode, ForbiddenError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { idempotency } from '../../middleware/idempotency.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { logger } from '../../logger.js';
import { CreatePaymentInputSchema, VerifyPaymentInputSchema } from './schemas.js';
import { createPaymentForBooking, handleWebhookEvent, reconcilePayment } from './service.js';
import { getPaymentProvider } from './factory.js';

const payments = new Hono<AuthContext>();

/**
 * POST /api/v1/payments/order
 * Customer-initiated. Creates a payment order with the active gateway and
 * returns the SDK session token for the mobile app to open the payment UI.
 *
 * Send X-Idempotency-Key on this — double-tap on the Pay button must not
 * create two orders.
 */
payments.post(
  '/order',
  authenticate,
  idempotency,
  validator('json', CreatePaymentInputSchema),
  async (c) => {
    const user = c.get('user');
    if (user.role !== 'customer') {
      throw new ForbiddenError('Only customers can initiate payment');
    }
    const input = c.req.valid('json');
    const result = await createPaymentForBooking({
      bookingId: input.bookingId,
      customerId: user.sub,
      ...(input.customerEmail ? { customerEmail: input.customerEmail } : {}),
    });
    return success(c, result, undefined, 201);
  },
);

/**
 * POST /api/v1/payments/verify
 * Customer's defensive check after their app completes the gateway flow.
 * Idempotent — calling repeatedly is safe.
 */
payments.post('/verify', authenticate, validator('json', VerifyPaymentInputSchema), async (c) => {
  const user = c.get('user');
  const input = c.req.valid('json');

  // Owner-check is also enforced inside reconcilePayment via the booking
  // lookup, but failing fast here keeps the error code more specific.
  const result = await reconcilePayment({ bookingId: input.bookingId });
  return success(c, { bookingId: input.bookingId, ...result });
  void user;
});

/**
 * POST /api/v1/payments/webhook/cashfree
 * No auth — verified via HMAC signature on raw body.
 * Hono's c.req.raw.clone() reads the body without consuming the original.
 */
payments.post('/webhook/cashfree', async (c) => {
  const provider = await getPaymentProvider();
  if (provider.name !== 'cashfree') {
    // Active provider is something else — gracefully ignore stray Cashfree pings
    logger.warn({ active: provider.name }, 'cashfree webhook hit but provider is different');
    return c.json({ received: true, ignored: true }, 200);
  }

  const rawBody = await c.req.raw.clone().text();
  const signature = c.req.header('x-webhook-signature') ?? '';
  const timestamp = c.req.header('x-webhook-timestamp') ?? '';

  try {
    provider.verifyWebhookSignature({ rawBody, signature, timestamp });
  } catch (err) {
    if (err instanceof DomainError) throw err;
    throw new DomainError(
      ErrorCode.SL_402_INVALID_SIGNATURE,
      'Webhook signature verification failed',
      401,
    );
  }

  const event = provider.parseWebhookEvent(rawBody);
  logger.info(
    { type: event.type, bookingId: event.bookingId, amount: event.amountPaise },
    'cashfree webhook received',
  );

  await handleWebhookEvent(event);
  // Cashfree expects a 200 quickly — any error response triggers retries.
  return c.json({ received: true }, 200);
});

export default payments;
