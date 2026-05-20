import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { ForbiddenError, NotFoundError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { NearbyQuerySchema, ProIdParamSchema } from './schemas.js';
import { findNearbyPros, getProDetail } from './service.js';
import { getTrustSnapshot } from '../trust-score/service.js';

const pros = new Hono<AuthContext>();

/**
 * GET /api/v1/pros/me/trust-score — current pro's score breakdown + recent events.
 * Protected: requires JWT, role=professional.
 *
 * IMPORTANT: defined BEFORE /:id so "me" doesn't get matched as a UUID.
 */
pros.get('/me/trust-score', authenticate, async (c) => {
  const user = c.get('user');
  if (user.role !== 'professional') {
    throw new ForbiddenError('Only professionals can view their trust score');
  }
  const pro = await prisma.professional.findUnique({
    where: { userId: user.sub },
    select: { id: true },
  });
  if (!pro) {
    throw new NotFoundError('Professional profile not found for this user');
  }
  const snapshot = await getTrustSnapshot(pro.id);
  return success(c, snapshot);
});

/**
 * GET /api/v1/pros/nearby
 * Discover online pros near a location for a given service category.
 */
pros.get('/nearby', validator('query', NearbyQuerySchema), async (c) => {
  const q = c.req.valid('query');
  const results = await findNearbyPros({
    lat: q.lat,
    lng: q.lng,
    categorySlug: q.category,
    radiusKm: q.radiusKm,
    limit: q.limit,
  });
  return success(c, {
    pros: results,
    count: results.length,
    query: {
      lat: q.lat,
      lng: q.lng,
      category: q.category,
      radiusKm: q.radiusKm,
    },
  });
});

/**
 * GET /api/v1/pros/:id
 * Full pro profile — title, bio, services, schedule, recent reviews.
 */
pros.get('/:id', validator('param', ProIdParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const pro = await getProDetail(id);
  return success(c, pro);
});

export default pros;
