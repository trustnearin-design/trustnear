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
