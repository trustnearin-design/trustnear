-- pg_trgm GIN indexes powering the fuzzy / typo-tolerant category search
-- (GET /api/v1/categories/search). The pg_trgm extension is already enabled
-- via schema.prisma `extensions = [..., pg_trgm]`.
--
-- This repo applies schema with `prisma db push` (no migrations folder), so
-- these indexes are applied out-of-band and idempotently via:
--   pnpm --filter @sevalink/db db:index
-- Safe to re-run; `IF NOT EXISTS` makes every statement a no-op once applied.

CREATE INDEX IF NOT EXISTS idx_svc_cat_name_trgm
  ON service_categories USING gin (lower(name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_svc_cat_pitch_trgm
  ON service_categories USING gin (lower(coalesce(short_pitch, '')) gin_trgm_ops);

-- NOTE: no trigram index on search_keywords — array_to_string() is STABLE
-- (not IMMUTABLE) so it can't be used in an index expression. The runtime
-- query still does similarity()/ILIKE over the keyword array; at this table
-- size (~60 rows) that scan is negligible, so the index buys nothing.
