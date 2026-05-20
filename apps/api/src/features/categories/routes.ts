import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';
import { success } from '../../shared/responses.js';

const categories = new Hono();

/**
 * GET /api/v1/categories
 * Lists active service categories. Optional ?featured=true to filter.
 */
categories.get('/', async (c) => {
  const featured = c.req.query('featured') === 'true';

  const rows = await prisma.serviceCategory.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(featured ? { isFeatured: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      iconUrl: true,
      bannerUrl: true,
      professionalTitle: true,
      description: true,
      basePrice: true,
      priceUnit: true,
      isFeatured: true,
      minDurationMinutes: true,
    },
  });

  return success(c, { categories: rows, count: rows.length });
});

/**
 * GET /api/v1/categories/:slug
 */
categories.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const row = await prisma.serviceCategory.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true,
      slug: true,
      name: true,
      iconUrl: true,
      bannerUrl: true,
      professionalTitle: true,
      description: true,
      basePrice: true,
      priceUnit: true,
      minDurationMinutes: true,
      searchKeywords: true,
    },
  });
  if (!row) {
    throw new NotFoundError(`Category not found: ${slug}`);
  }
  return success(c, row);
});

export default categories;
