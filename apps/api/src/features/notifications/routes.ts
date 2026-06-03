import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@sevalink/db';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { logger } from '../../logger.js';
import { isExpoPushToken } from './expo.js';

const RegisterPushTokenSchema = z.object({
  token: z.string().min(1).max(200),
});

const notifications = new Hono<AuthContext>();

/**
 * POST /api/v1/notifications/push-token
 * Customer (or any role) registers their Expo push token. One device per
 * user — re-registering overwrites the old token, which is what we want
 * when the same user logs in on a new phone.
 *
 * Validates the token format before storing so we don't fill the DB with
 * "test" strings that would later return errors at send time.
 */
notifications.post(
  '/push-token',
  authenticate,
  validator('json', RegisterPushTokenSchema),
  async (c) => {
    const auth = c.get('user');
    const { token } = c.req.valid('json');
    if (!isExpoPushToken(token)) {
      // 400 not 422 — caller sent something that looks like a token but
      // isn't one Expo will accept. Better to fail fast than store junk.
      return c.json(
        {
          success: false,
          error: {
            code: 'SL_906_BAD_REQUEST',
            message: 'Not a valid Expo push token (expected ExponentPushToken[...])',
          },
          meta: { requestId: c.get('requestId') ?? '', timestamp: new Date().toISOString() },
        },
        400,
      );
    }
    await prisma.user.update({
      where: { id: auth.sub },
      data: { deviceToken: token },
    });
    logger.info({ userId: auth.sub }, 'push-token: registered');
    return success(c, { registered: true });
  },
);

/**
 * GET /api/v1/notifications — the user's in-app notification inbox, newest
 * first. Cursor-paginated. Every booking/payment/system event writes a row
 * here (see service.ts dispatch), so this is a reliable history even when a
 * push was missed.
 */
const ListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

notifications.get('/', authenticate, validator('query', ListQuerySchema), async (c) => {
  const auth = c.get('user');
  const { cursor, limit } = c.req.valid('query');
  const rows = await prisma.notification.findMany({
    where: { userId: auth.sub },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      isRead: true,
      createdAt: true,
    },
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;
  return success(
    c,
    { notifications: items, count: items.length },
    {
      requestId: c.get('requestId') ?? '',
      timestamp: new Date().toISOString(),
      ...(nextCursor ? { cursor: nextCursor } : {}),
    },
  );
});

/**
 * GET /api/v1/notifications/unread-count — drives the bell badge.
 */
notifications.get('/unread-count', authenticate, async (c) => {
  const auth = c.get('user');
  const count = await prisma.notification.count({
    where: { userId: auth.sub, isRead: false },
  });
  return success(c, { count });
});

/**
 * POST /api/v1/notifications/read-all — mark every unread notification read.
 */
notifications.post('/read-all', authenticate, async (c) => {
  const auth = c.get('user');
  const res = await prisma.notification.updateMany({
    where: { userId: auth.sub, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return success(c, { updated: res.count });
});

/**
 * POST /api/v1/notifications/:id/read — mark one read (e.g. on tap).
 */
notifications.post('/:id/read', authenticate, async (c) => {
  const auth = c.get('user');
  const id = c.req.param('id');
  await prisma.notification.updateMany({
    where: { id, userId: auth.sub, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return success(c, { ok: true });
});

/**
 * DELETE /api/v1/notifications/push-token
 * Call on logout. Idempotent — fine to call even if no token is set.
 */
notifications.delete('/push-token', authenticate, async (c) => {
  const auth = c.get('user');
  await prisma.user.update({
    where: { id: auth.sub },
    data: { deviceToken: null },
  });
  logger.info({ userId: auth.sub }, 'push-token: cleared');
  return success(c, { cleared: true });
});

export default notifications;
