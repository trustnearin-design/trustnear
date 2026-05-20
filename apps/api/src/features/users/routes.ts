import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { success } from '../../shared/responses.js';

const users = new Hono<AuthContext>();

/**
 * GET /users/me — current user profile.
 * Protected: requires valid access token.
 */
users.get('/me', authenticate, async (c) => {
  const auth = c.get('user');
  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: {
      id: true,
      phone: true,
      email: true,
      fullName: true,
      role: true,
      profilePhoto: true,
      city: true,
      area: true,
      preferredLang: true,
      referralCode: true,
      walletBalance: true,
      loyaltyPoints: true,
      isVerified: true,
      createdAt: true,
    },
  });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return success(c, user);
});

export default users;
