import { Hono } from 'hono';
import { prisma } from '@sevalink/db';
import { NotFoundError } from '@sevalink/types';
import { success } from '../../shared/responses.js';

const categories = new Hono();

/**
 * GET /api/v1/categories
 *
 * Default: flat list of LEAF categories (children of a parent) for backward
 * compatibility — the customer app still uses this for the category picker
 * inside the booking flow.
 *
 * Query params:
 *   ?featured=true   → only `isFeatured` (legacy)
 *   ?parentSlug=...  → only children of the given parent
 *   ?parentsOnly=true→ only top-level parents (no children embedded)
 *
 * For the tree-shaped view used on the home tab, call GET /categories/tree.
 */
categories.get('/', async (c) => {
  const featured = c.req.query('featured') === 'true';
  const parentSlug = c.req.query('parentSlug');
  const parentsOnly = c.req.query('parentsOnly') === 'true';

  let parentIdFilter: { parentId: string | null } | undefined;
  if (parentSlug) {
    const parent = await prisma.serviceCategory.findFirst({
      where: { slug: parentSlug, parentId: null, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (!parent) throw new NotFoundError(`Parent category not found: ${parentSlug}`);
    parentIdFilter = { parentId: parent.id };
  } else if (parentsOnly) {
    parentIdFilter = { parentId: null };
  } else {
    // Default: leaves only (categories that HAVE a parent)
    parentIdFilter = undefined;
  }

  const rows = await prisma.serviceCategory.findMany({
    where: {
      isActive: true,
      deletedAt: null,
      ...(parentIdFilter ?? { parentId: { not: null } }),
      ...(featured ? { isFeatured: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      parentId: true,
      name: true,
      iconUrl: true,
      bannerUrl: true,
      heroImageUrl: true,
      professionalTitle: true,
      description: true,
      shortPitch: true,
      basePrice: true,
      priceUnit: true,
      isFeatured: true,
      minDurationMinutes: true,
    },
  });

  return success(c, { categories: rows, count: rows.length });
});

/**
 * GET /api/v1/categories/tree
 *
 * Returns parent categories with their children embedded — the shape the
 * home tab needs to render 4 parent tiles with child counts + previews.
 *
 *   [
 *     { id, slug, name, heroImageUrl, shortPitch, children: [{ id, slug, name, heroImageUrl, basePrice, ... }] },
 *     ...
 *   ]
 *
 * Inactive children are filtered out so a deactivated leaf (e.g. legacy
 * "cooking") doesn't leak into the UI through its parent's tree.
 */
categories.get('/tree', async (c) => {
  const parents = await prisma.serviceCategory.findMany({
    where: { parentId: null, isActive: true, deletedAt: null },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      heroImageUrl: true,
      bannerUrl: true,
      shortPitch: true,
      description: true,
      children: {
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          heroImageUrl: true,
          shortPitch: true,
          professionalTitle: true,
          basePrice: true,
          priceUnit: true,
          minDurationMinutes: true,
        },
      },
    },
  });

  return success(c, { tree: parents, count: parents.length });
});

/**
 * GET /api/v1/categories/:slug
 *
 * Returns the category (parent or leaf). If parent, embeds children;
 * if leaf, embeds the parent so the customer app can build breadcrumbs
 * without a second round-trip.
 */
categories.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const row = await prisma.serviceCategory.findFirst({
    where: { slug, isActive: true, deletedAt: null },
    select: {
      id: true,
      slug: true,
      parentId: true,
      name: true,
      iconUrl: true,
      bannerUrl: true,
      heroImageUrl: true,
      professionalTitle: true,
      description: true,
      shortPitch: true,
      basePrice: true,
      priceUnit: true,
      minDurationMinutes: true,
      searchKeywords: true,
      parent: {
        select: { id: true, slug: true, name: true, heroImageUrl: true },
      },
      children: {
        where: { isActive: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          slug: true,
          name: true,
          heroImageUrl: true,
          shortPitch: true,
          basePrice: true,
          priceUnit: true,
        },
      },
    },
  });
  if (!row) {
    throw new NotFoundError(`Category not found: ${slug}`);
  }
  return success(c, row);
});

export default categories;
