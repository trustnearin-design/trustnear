import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { DomainError, ErrorCode, ForbiddenError, NotFoundError } from '@sevalink/types';
import { authenticate, authorize, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import {
  AvailabilityInputSchema,
  MyJobsQuerySchema,
  NearbyQuerySchema,
  ProIdParamSchema,
} from './schemas.js';
import {
  AreaInputSchema,
  PersonalInfoSchema,
  PhotoConfirmSchema,
  ScheduleInputSchema,
  ServicesInputSchema,
} from './onboarding-schemas.js';
import { findNearbyPros, getProDetail, listFeaturedPros } from './service.js';
import { getMyJobs, getMyProfile, getMyTodaySummary, setMyAvailability } from './me-service.js';
import {
  getOnboardingStatus,
  saveArea,
  savePersonalInfo,
  savePhoto,
  savePoliceDoc,
  saveSchedule,
  saveServices,
  submitForReview,
} from './onboarding-service.js';
import { saveUpload } from '../admin/uploads-service.js';
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

/**
 * ─── Phase 3g — Onboarding wizard endpoints ──────────────────────────
 * Server-side state machine for the Pro app's onboarding flow. The
 * client fetches /me/onboarding/status to know what's done and where to
 * land the user; each PATCH/POST below saves one step. The submit
 * endpoint flips approval_status to submitted_for_review and re-validates
 * every required step so the admin queue can trust the data.
 */

pros.get('/me/onboarding/status', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const status = await getOnboardingStatus(user.sub);
  return success(c, status);
});

pros.patch(
  '/me/onboarding/personal',
  authenticate,
  authorize('professional'),
  validator('json', PersonalInfoSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const result = await savePersonalInfo(user.sub, data);
    return success(c, result);
  },
);

/**
 * Photo upload — multipart/form-data, field name "file". Reuses the
 * shared uploads-service (local FS in dev, S3 when env vars set). After
 * a successful upload the URL is persisted on User.profilePhoto via
 * savePhoto so subsequent /me responses already include it.
 */
pros.post('/me/onboarding/photo', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'Missing file in form data (field "file")',
    );
  }
  const origin = new URL(c.req.url).origin;
  const upload = await saveUpload({ file, folder: 'pro-photos', publicBaseUrl: origin });
  const result = await savePhoto(user.sub, upload.url);
  return success(c, { ...result, backend: upload.backend });
});

/**
 * Alt path for clients that uploaded out-of-band (e.g. direct-to-S3 from
 * the mobile app) and just need to register the URL.
 */
pros.put(
  '/me/onboarding/photo',
  authenticate,
  authorize('professional'),
  validator('json', PhotoConfirmSchema),
  async (c) => {
    const user = c.get('user');
    const { url } = c.req.valid('json');
    const result = await savePhoto(user.sub, url);
    return success(c, result);
  },
);

pros.patch(
  '/me/onboarding/services',
  authenticate,
  authorize('professional'),
  validator('json', ServicesInputSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const result = await saveServices(user.sub, data);
    return success(c, result);
  },
);

pros.patch(
  '/me/onboarding/area',
  authenticate,
  authorize('professional'),
  validator('json', AreaInputSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const result = await saveArea(user.sub, data);
    return success(c, result);
  },
);

pros.patch(
  '/me/onboarding/schedule',
  authenticate,
  authorize('professional'),
  validator('json', ScheduleInputSchema),
  async (c) => {
    const user = c.get('user');
    const data = c.req.valid('json');
    const result = await saveSchedule(user.sub, data);
    return success(c, result);
  },
);

pros.post('/me/onboarding/police-doc', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData().catch(() => null);
  const file = formData?.get('file');
  if (!file || !(file instanceof File)) {
    throw new DomainError(
      ErrorCode.SL_900_VALIDATION_ERROR,
      'Missing file in form data (field "file")',
    );
  }
  const origin = new URL(c.req.url).origin;
  const upload = await saveUpload({ file, folder: 'pro-police-docs', publicBaseUrl: origin });
  const result = await savePoliceDoc(user.sub, upload.url);
  return success(c, result);
});

pros.post('/me/onboarding/submit', authenticate, authorize('professional'), async (c) => {
  const user = c.get('user');
  const result = await submitForReview(user.sub);
  return success(c, result);
});

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
