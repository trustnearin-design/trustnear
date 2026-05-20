import { Hono } from 'hono';
import { ForbiddenError } from '@sevalink/types';
import { authenticate, type AuthContext } from '../../middleware/authenticate.js';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { ProIdParamSchema, ReviewsQuerySchema, SubmitReviewInputSchema } from './schemas.js';
import { listReviewsForPro, submitReview } from './service.js';

const reviews = new Hono<AuthContext>();

/**
 * POST /api/v1/reviews — customer submits review (auth required).
 */
reviews.post('/', authenticate, validator('json', SubmitReviewInputSchema), async (c) => {
  const user = c.get('user');
  if (user.role !== 'customer') {
    throw new ForbiddenError('Only customers can submit reviews');
  }
  const input = c.req.valid('json');
  const result = await submitReview({
    bookingId: input.bookingId,
    customerId: user.sub,
    rating: input.rating,
    ...(input.reviewText ? { reviewText: input.reviewText } : {}),
    ...(input.tags ? { tags: input.tags } : {}),
    isPublic: input.isPublic,
  });
  return success(c, result, undefined, 201);
});

/**
 * GET /api/v1/reviews/pro/:id — public reviews for a pro + aggregate stats.
 * No auth required — customer browses pro profile before logging in.
 */
reviews.get(
  '/pro/:id',
  validator('param', ProIdParamSchema),
  validator('query', ReviewsQuerySchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const q = c.req.valid('query');
    const result = await listReviewsForPro({
      professionalId: id,
      limit: q.limit,
      ...(q.cursor ? { cursor: q.cursor } : {}),
      ...(q.minRating ? { minRating: q.minRating } : {}),
    });
    return success(
      c,
      {
        reviews: result.items,
        stats: result.stats,
        count: result.items.length,
      },
      {
        requestId: c.get('requestId') ?? '',
        timestamp: new Date().toISOString(),
        ...(result.nextCursor ? { cursor: result.nextCursor } : {}),
      },
    );
  },
);

export default reviews;
