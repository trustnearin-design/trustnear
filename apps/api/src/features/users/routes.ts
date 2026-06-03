import { Hono } from 'hono';
import { z } from 'zod';
import { prisma } from '@sevalink/db';
import { ConflictError, DomainError, ErrorCode, NotFoundError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { saveUpload } from '../admin/uploads-service.js';
import { logger } from '../../logger.js';

const users = new Hono<AuthContext>();

const USER_SELECT = {
  id: true,
  phone: true,
  email: true,
  fullName: true,
  role: true,
  adminRole: true,
  profilePhoto: true,
  city: true,
  area: true,
  preferredLang: true,
  referralCode: true,
  walletBalance: true,
  loyaltyPoints: true,
  isVerified: true,
  createdAt: true,
} as const;

/**
 * GET /users/me — current user profile.
 * Protected: requires valid access token.
 */
users.get('/me', authenticate, async (c) => {
  const auth = c.get('user');
  const user = await prisma.user.findUnique({
    where: { id: auth.sub },
    select: USER_SELECT,
  });
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return success(c, user);
});

/**
 * PATCH /users/me — self-edit profile. Phone is intentionally NOT editable
 * here (it's the OTP-verified identity). All fields optional → partial PATCH;
 * at least one must be present. Email uniqueness is enforced with a friendly
 * conflict rather than a raw DB error.
 */
const UpdateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.string().trim().email().max(200).optional(),
    city: z.string().trim().min(2).max(50).optional(),
    area: z.string().trim().min(2).max(100).optional(),
    preferredLang: z.string().trim().min(2).max(5).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

users.patch('/me', authenticate, validator('json', UpdateProfileSchema), async (c) => {
  const auth = c.get('user');
  const data = c.req.valid('json');

  if (data.email) {
    const clash = await prisma.user.findFirst({
      where: { email: data.email, id: { not: auth.sub } },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictError('That email is already in use by another account');
    }
  }

  const user = await prisma.user.update({
    where: { id: auth.sub },
    data: {
      ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
      ...(data.email !== undefined ? { email: data.email } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.area !== undefined ? { area: data.area } : {}),
      ...(data.preferredLang !== undefined ? { preferredLang: data.preferredLang } : {}),
    },
    select: USER_SELECT,
  });
  logger.info({ userId: auth.sub }, 'users: profile updated');
  return success(c, user);
});

/**
 * POST /users/me/photo — multipart/form-data, field "file". Uploads via the
 * shared uploads-service (local FS in dev, S3 in prod) and stores the URL on
 * User.profilePhoto. Mirrors the pro onboarding photo endpoint.
 */
users.post('/me/photo', authenticate, async (c) => {
  const auth = c.get('user');
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'Missing file in form data (field "file")',
    );
  }
  const origin = new URL(c.req.url).origin;
  const upload = await saveUpload({ file, folder: 'customer-photos', publicBaseUrl: origin });
  const user = await prisma.user.update({
    where: { id: auth.sub },
    data: { profilePhoto: upload.url },
    select: { profilePhoto: true },
  });
  return success(c, { profilePhoto: user.profilePhoto, backend: upload.backend });
});

export default users;
