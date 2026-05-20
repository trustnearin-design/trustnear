import { Hono } from 'hono';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { NearbyQuerySchema, ProIdParamSchema } from './schemas.js';
import { findNearbyPros, getProDetail } from './service.js';

const pros = new Hono();

/**
 * GET /api/v1/pros/nearby
 * Discover online pros near a location for a given service category.
 *
 * Query: ?lat=&lng=&category=&radiusKm=&limit=
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
