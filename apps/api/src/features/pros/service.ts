import { prisma, Prisma } from '@sevalink/db';
import { roundCoord } from '@sevalink/utils';
import { NotFoundError } from '@sevalink/types';
import { redis } from '../../redis.js';
import { computeMatchScore } from './matching.js';

const NEARBY_CACHE_TTL_SECONDS = 30;

export interface NearbyPro {
  professionalId: string;
  userId: string;
  fullName: string;
  professionalTitle: string | null;
  profilePhoto: string | null;
  area: string | null;
  trustScore: number;
  trustBadge: string;
  yearsExperience: number;
  repeatClientCount: number;
  totalBookings: number;
  avgResponseTimeSeconds: number;
  distanceKm: number;
  matchScore: number;
}

interface NearbyRow {
  professional_id: string;
  user_id: string;
  full_name: string;
  professional_title: string | null;
  profile_photo: string | null;
  area: string | null;
  trust_score: Prisma.Decimal;
  trust_badge: string;
  years_experience: number;
  repeat_client_count: number;
  total_bookings: number;
  avg_response_time_seconds: number;
  distance_meters: number;
}

/**
 * Find professionals near a location for a given category.
 *
 * SQL filters by availability + category + radius (cheap, indexable).
 * Composite scoring + final sort happens in Node — small data set after
 * the radius filter, and the formula is in app config (live-tunable).
 *
 * Cached in Redis for 30s, keyed by rounded coords + category + radius.
 */
export async function findNearbyPros(args: {
  lat: number;
  lng: number;
  categorySlug: string;
  radiusKm: number;
  limit: number;
}): Promise<NearbyPro[]> {
  const cacheKey = `nearby:${roundCoord(args.lat)}:${roundCoord(args.lng)}:${args.categorySlug}:${String(args.radiusKm)}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as NearbyPro[];
  }

  const radiusMeters = args.radiusKm * 1000;

  // Raw query — PostGIS ST_DistanceSphere on lat/lng decimals.
  // Filters: online + offers category + within radius.
  const rows = await prisma.$queryRaw<NearbyRow[]>`
    SELECT
      p.id::text             AS professional_id,
      u.id::text             AS user_id,
      u.full_name,
      p.professional_title,
      u.profile_photo,
      u.area,
      p.trust_score,
      p.trust_badge::text    AS trust_badge,
      p.years_experience,
      p.repeat_client_count,
      p.total_bookings,
      p.avg_response_time_seconds,
      ST_DistanceSphere(
        ST_MakePoint(pl.longitude::float8, pl.latitude::float8),
        ST_MakePoint(${args.lng}::float8, ${args.lat}::float8)
      ) AS distance_meters
    FROM professionals p
    JOIN users u                  ON u.id = p.user_id  AND u.is_active = true AND u.deleted_at IS NULL
    JOIN pro_locations pl         ON pl.professional_id = p.id
    JOIN pro_service_offerings o  ON o.professional_id = p.id AND o.is_active = true
    JOIN service_categories c     ON c.id = o.category_id     AND c.is_active = true
    WHERE p.availability_status = 'online'
      AND p.deleted_at IS NULL
      AND c.slug = ${args.categorySlug}
      AND ST_DistanceSphere(
            ST_MakePoint(pl.longitude::float8, pl.latitude::float8),
            ST_MakePoint(${args.lng}::float8, ${args.lat}::float8)
          ) <= ${radiusMeters}
    ORDER BY p.trust_score DESC
    LIMIT 50
  `;

  // Score + sort in Node so weights from app_config (later) can be hot-swapped
  const scored: NearbyPro[] = rows.map((r) => {
    const distanceKm = r.distance_meters / 1000;
    const trustScore = Number(r.trust_score);
    return {
      professionalId: r.professional_id,
      userId: r.user_id,
      fullName: r.full_name,
      professionalTitle: r.professional_title,
      profilePhoto: r.profile_photo,
      area: r.area,
      trustScore,
      trustBadge: r.trust_badge,
      yearsExperience: r.years_experience,
      repeatClientCount: r.repeat_client_count,
      totalBookings: r.total_bookings,
      avgResponseTimeSeconds: r.avg_response_time_seconds,
      distanceKm: Math.round(distanceKm * 100) / 100,
      matchScore:
        Math.round(
          computeMatchScore({
            trustScore,
            repeatClientCount: r.repeat_client_count,
            avgResponseTimeSeconds: r.avg_response_time_seconds,
            distanceKm,
            radiusKm: args.radiusKm,
          }) * 100,
        ) / 100,
    };
  });

  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top = scored.slice(0, args.limit);

  await redis.set(cacheKey, JSON.stringify(top), 'EX', NEARBY_CACHE_TTL_SECONDS);
  return top;
}

/**
 * Full pro profile — used by the Pro Profile screen (customer side).
 */
export async function getProDetail(professionalId: string) {
  const pro = await prisma.professional.findFirst({
    where: { id: professionalId, deletedAt: null },
    select: {
      id: true,
      professionalTitle: true,
      bio: true,
      yearsExperience: true,
      trustScore: true,
      trustBadge: true,
      availabilityStatus: true,
      aadhaarVerified: true,
      faceVerified: true,
      bankVerified: true,
      policeVerified: true,
      introVideoUrl: true,
      totalBookings: true,
      repeatClientCount: true,
      avgResponseTimeSeconds: true,
      subscriptionPlan: true,
      user: {
        select: {
          id: true,
          fullName: true,
          profilePhoto: true,
          city: true,
          area: true,
        },
      },
      serviceOfferings: {
        where: { isActive: true },
        select: {
          experienceYears: true,
          customPrice: true,
          category: {
            select: {
              id: true,
              slug: true,
              name: true,
              iconUrl: true,
              basePrice: true,
              priceUnit: true,
            },
          },
        },
      },
      schedules: {
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          isAvailable: true,
        },
        orderBy: { dayOfWeek: 'asc' },
      },
      reviews: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          rating: true,
          reviewText: true,
          tags: true,
          createdAt: true,
          proResponse: true,
          customer: { select: { fullName: true, profilePhoto: true } },
        },
      },
    },
  });

  if (!pro) {
    throw new NotFoundError('Professional not found');
  }
  return pro;
}
