import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { ForbiddenError, NotFoundError } from '@sevalink/types';
import { authenticate, authorize, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import {
  AvailabilityInputSchema,
  MyJobsQuerySchema,
  NearbyQuerySchema,
  ProIdParamSchema,
} from './schemas.js';
import { findNearbyPros, getProDetail, listFeaturedPros } from './service.js';
import { getMyJobs, getMyProfile, getMyTodaySummary, setMyAvailability } from './me-service.js';
import { getTrustSnapshot } from '../trust-score/service.js';

const pros = new Hono<AuthContext>();

/**
 * Pro-self endpoints — all require role=professional. Defined BEFORE /:id
 * so "me" doesn't get matched as a UUID path param.
 */

pros.get('/me', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const profile = await getMyProfile(user.sub);
  return success(c, profile);
});

pros.patch(
  '/me/availability',
  authenticate,
  authorize('professional'),
  validator('json', AvailabilityInputSchema),
  async (c) => {
    const user = c.get('user');
    const { status } = c.req.valid('json');
    const result = await setMyAvailability(user.sub, status);
    return success(c, result);
  },
);

pros.get('/me/today', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const summary = await getMyTodaySummary(user.sub);
  return success(c, summary);
});

pros.get(
  '/me/jobs',
  authenticate,
  authorize('professional'),
  validator('query', MyJobsQuerySchema),
  async (c) => {
    const user = c.get('user');
    const q = c.req.valid('query');
    const jobs = await getMyJobs(user.sub, q.segment, q.limit);
    return success(c, { jobs, count: jobs.length, segment: q.segment });
  },
);

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
 * GET /api/v1/pros/featured?limit=N
 * Top professionals across the platform by trust score — powers the
 * "Top Verified Pros" circular-avatar strip on the customer home.
 * Defined BEFORE /:id so "featured" doesn't get matched as a UUID.
 */
pros.get('/featured', async (c) => {
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 10), 1), 30);
  const pros = await listFeaturedPros(limit);
  return success(c, { pros, count: pros.length });
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
