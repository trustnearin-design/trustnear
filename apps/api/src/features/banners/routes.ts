import { Hono } from 'hono';
import { z } from 'zod';
import { validator } from '../../shared/validator.js';
import { success } from '../../shared/responses.js';
import { listLiveBanners } from '../admin/banners-service.js';

const banners = new Hono();

const QuerySchema = z.object({
  placement: z
    .enum(['home_hero', 'home_strip', 'category_top', 'booking_complete'])
    .default('home_hero'),
});

/**
 * GET /banners?placement=home_hero — public read.
 * Returns only live (active + within scheduled window) banners for the
 * given placement. Consumed by customer + pro home screens.
 */
banners.get('/', validator('query', QuerySchema), async (c) => {
  const { placement } = c.req.valid('query');
  const list = await listLiveBanners(placement);
  return success(c, { banners: list });
});

export default banners;
