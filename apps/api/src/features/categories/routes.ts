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
 * GET /api/v1/categories/search?q=...&limit=20
 *
 * Free-text search across active categories. Matches against name,
 * shortPitch, and searchKeywords (Postgres array). Scoring boosts
 * prefix-matches, then in-name matches, then keyword matches; leaves
 * are nudged above parents because users typically search for a
 * service ("home cleaning"), not a hub ("home care").
 *
 * Empty / very-short q returns empty results — the customer app keeps
 * the recent-searches list visible until q.length >= 2.
 */
interface SearchRow {
  id: string;
  slug: string;
  parent_id: string | null;
  name: string;
  hero_image_url: string | null;
  short_pitch: string | null;
  base_price: number;
  price_unit: string;
  min_duration_minutes: number;
  parent_pid: string | null;
  parent_slug: string | null;
  parent_name: string | null;
}

categories.get('/search', async (c) => {
  const q = (c.req.query('q') ?? '').trim();
  const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 20) || 20, 1), 50);

  if (q.length < 2) {
    return success(c, { results: [], count: 0, query: q });
  }

  // Fuzzy + synonym search via pg_trgm. Two precise signals — deliberately
  // NOT a loose substring ILIKE, which made short queries ("ac") match any
  // keyword containing those letters ("facial"):
  //   • sim  = best trigram match of the query to the name OR any single
  //            keyword, using `similarity()` (typo tolerance, e.g. "cockroch
  //            spry" ≈ keyword "cockroach spray") and `word_similarity()`
  //            (query matched against the closest word-extent, good for
  //            prefixes/partials). Per-keyword max — NOT a blob — so the
  //            score isn't diluted by long keyword lists.
  //   • kw_exact = a keyword equals the whole query or any one query token
  //            (handles synonyms like "bartan", "naai", "jhadu").
  // Results require sim > threshold OR kw_exact OR a name prefix. Exact and
  // prefix matches sort first; leaves sort above parent hubs (users search
  // for a service, not a hub). Indexes: prisma/sql/trgm-index.sql.
  const ql = q.toLowerCase();
  const tokens = ql.split(/\s+/).filter(Boolean);

  const rows = await prisma.$queryRaw<SearchRow[]>`
    WITH scored AS (
      SELECT
        c.id::text                AS id,
        c.slug,
        c.parent_id::text         AS parent_id,
        c.name,
        c.hero_image_url,
        c.short_pitch,
        c.base_price,
        c.price_unit::text        AS price_unit,
        c.min_duration_minutes,
        p.id::text                AS parent_pid,
        p.slug                    AS parent_slug,
        p.name                    AS parent_name,
        GREATEST(
          similarity(lower(c.name), ${ql}),
          strict_word_similarity(${ql}, lower(c.name)),
          COALESCE((
            SELECT max(GREATEST(similarity(lower(kw), ${ql}), strict_word_similarity(${ql}, lower(kw))))
            FROM unnest(c.search_keywords) kw
          ), 0)
        ) AS sim,
        (lower(c.name) LIKE ${ql + '%'}) AS name_prefix,
        EXISTS (
          SELECT 1 FROM unnest(c.search_keywords) kw
          WHERE lower(kw) = ${ql} OR lower(kw) = ANY (${tokens}::text[])
        ) AS kw_exact
      FROM service_categories c
      LEFT JOIN service_categories p ON p.id = c.parent_id
      WHERE c.is_active = true AND c.deleted_at IS NULL
    )
    SELECT
      id, slug, parent_id, name, hero_image_url, short_pitch,
      base_price, price_unit, min_duration_minutes,
      parent_pid, parent_slug, parent_name
    FROM scored
    WHERE sim > 0.42 OR kw_exact OR name_prefix
    ORDER BY
      kw_exact DESC,
      name_prefix DESC,
      (parent_id IS NOT NULL) DESC,
      sim DESC,
      name ASC
    LIMIT ${limit};
  `;

  const results = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    parentId: r.parent_id,
    name: r.name,
    heroImageUrl: r.hero_image_url,
    shortPitch: r.short_pitch,
    basePrice: r.base_price,
    priceUnit: r.price_unit,
    minDurationMinutes: r.min_duration_minutes,
    parent:
      r.parent_pid && r.parent_slug && r.parent_name
        ? { id: r.parent_pid, slug: r.parent_slug, name: r.parent_name }
        : null,
  }));

  return success(c, { results, count: results.length, query: q });
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
