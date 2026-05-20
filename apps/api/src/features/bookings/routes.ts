import { Hono } from 'hono';
import { ForbiddenError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import {
  BookingIdParamSchema,
  CancelBookingInputSchema,
  CreateBookingInputSchema,
  ListBookingsQuerySchema,
  VerifyBookingOtpInputSchema,
} from './schemas.js';
import {
  createBooking,
  getBookingDetail,
  listBookings,
  transitionBooking,
  verifyBookingOtp,
} from './service.js';

const bookings = new Hono<AuthContext>();

bookings.use('*', authenticate);

/**
 * POST /api/v1/bookings — create a booking (customer only).
 * Synchronously attempts to match a pro; returns `status: matched` if found,
 * otherwise `status: pending_match` and matching continues async (Phase 2).
 */
bookings.post('/', validator('json', CreateBookingInputSchema), async (c) => {
  const user = c.get('user');
  if (user.role !== 'customer') {
    throw new ForbiddenError('Only customers can create bookings');
  }
  const input = c.req.valid('json');

  const result = await createBooking({
    customerId: user.sub,
    categoryId: input.categoryId,
    scheduledAt: new Date(input.scheduledAt),
    durationMinutes: input.durationMinutes,
    addressLine: input.addressLine,
    addressLat: input.addressLat,
    addressLng: input.addressLng,
    ...(input.addressArea ? { addressArea: input.addressArea } : {}),
    addressCity: input.addressCity,
    ...(input.notes ? { notes: input.notes } : {}),
    ...(input.promoCode ? { promoCode: input.promoCode } : {}),
    ...(input.preferredProId ? { preferredProId: input.preferredProId } : {}),
  });

  return success(c, result, undefined, 201);
});

/**
 * GET /api/v1/bookings — list my bookings (customer or pro view).
 */
bookings.get('/', validator('query', ListBookingsQuerySchema), async (c) => {
  const user = c.get('user');
  const q = c.req.valid('query');
  const result = await listBookings({
    userId: user.sub,
    role: user.role,
    limit: q.limit,
    ...(q.status ? { status: q.status } : {}),
    ...(q.cursor ? { cursor: q.cursor } : {}),
  });
  return success(
    c,
    { bookings: result.items, count: result.items.length },
    {
      requestId: c.get('requestId'),
      timestamp: new Date().toISOString(),
      ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
    },
  );
});

/**
 * GET /api/v1/bookings/:id — detail (customer, pro, or admin only).
 */
bookings.get('/:id', validator('param', BookingIdParamSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const booking = await getBookingDetail({
    bookingId: id,
    userId: user.sub,
    role: user.role,
  });
  return success(c, booking);
});

/**
 * POST /api/v1/bookings/:id/accept — pro accepts a matched booking.
 * Transition: matched → confirmed.
 */
bookings.post('/:id/accept', validator('param', BookingIdParamSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const result = await transitionBooking({
    bookingId: id,
    actorUserId: user.sub,
    actorRole: user.role,
    nextStatus: 'confirmed',
  });
  return success(c, result);
});

/**
 * POST /api/v1/bookings/:id/start-trip — pro begins navigation to customer.
 * Transition: confirmed → pro_en_route.
 */
bookings.post('/:id/start-trip', validator('param', BookingIdParamSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const result = await transitionBooking({
    bookingId: id,
    actorUserId: user.sub,
    actorRole: user.role,
    nextStatus: 'pro_en_route',
  });
  return success(c, result);
});

/**
 * POST /api/v1/bookings/:id/verify-otp — pro enters OTP customer shared.
 * Transition: matched/confirmed/pro_en_route → otp_verified → in_progress (instant).
 */
bookings.post(
  '/:id/verify-otp',
  validator('param', BookingIdParamSchema),
  validator('json', VerifyBookingOtpInputSchema),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const { otp } = c.req.valid('json');
    const result = await verifyBookingOtp({
      bookingId: id,
      actorUserId: user.sub,
      submittedOtp: otp,
    });
    return success(c, result);
  },
);

/**
 * POST /api/v1/bookings/:id/complete — pro marks job done.
 * Transition: in_progress → completed.
 */
bookings.post('/:id/complete', validator('param', BookingIdParamSchema), async (c) => {
  const user = c.get('user');
  const { id } = c.req.valid('param');
  const result = await transitionBooking({
    bookingId: id,
    actorUserId: user.sub,
    actorRole: user.role,
    nextStatus: 'completed',
    patch: { completedAt: new Date() },
  });
  return success(c, result);
});

/**
 * POST /api/v1/bookings/:id/cancel — customer or pro cancels with reason.
 * Transition: anything pre-OTP → cancelled_customer / cancelled_pro.
 */
bookings.post(
  '/:id/cancel',
  validator('param', BookingIdParamSchema),
  validator('json', CancelBookingInputSchema),
  async (c) => {
    const user = c.get('user');
    const { id } = c.req.valid('param');
    const { reason } = c.req.valid('json');

    const nextStatus = user.role === 'professional' ? 'cancelled_pro' : 'cancelled_customer';
    const result = await transitionBooking({
      bookingId: id,
      actorUserId: user.sub,
      actorRole: user.role,
      nextStatus,
      patch: { cancellationReason: reason },
    });
    return success(c, result);
  },
);

export default bookings;
