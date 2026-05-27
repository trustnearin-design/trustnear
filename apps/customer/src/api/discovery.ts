import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Category {
  id: string;
  slug: string;
  parentId?: string | null;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl?: string | null;
  professionalTitle: string;
  description: string;
  shortPitch?: string | null;
  /** Stored in paise. Use formatRupees() to display. */
  basePrice: number;
  priceUnit: string;
  isFeatured: boolean;
  minDurationMinutes: number;
}

export interface CategoryDetail extends Category {
  searchKeywords: string[];
  parent?: { id: string; slug: string; name: string; heroImageUrl: string | null } | null;
  children?: Array<{
    id: string;
    slug: string;
    name: string;
    heroImageUrl: string | null;
    shortPitch: string | null;
    basePrice: number;
    priceUnit: string;
  }>;
}

/** Leaf shape inside a parent's tree entry (GET /categories/tree). */
export interface CategoryTreeChild {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
  shortPitch: string | null;
  professionalTitle: string;
  basePrice: number;
  priceUnit: string;
  minDurationMinutes: number;
}

export interface CategoryTreeParent {
  id: string;
  slug: string;
  name: string;
  heroImageUrl: string | null;
  bannerUrl: string | null;
  shortPitch: string | null;
  description: string;
  children: CategoryTreeChild[];
}

export interface NearbyPro {
  professionalId: string;
  userId: string;
  fullName: string;
  professionalTitle: string | null;
  profilePhoto: string | null;
  area: string | null;
  trustScore: number;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  yearsExperience: number;
  repeatClientCount: number;
  totalBookings: number;
  avgResponseTimeSeconds: number;
  distanceKm: number;
  matchScore: number;
}

export interface ProServiceOffering {
  experienceYears: number;
  /** Paise. Null = use category basePrice. */
  customPrice: number | null;
  category: {
    id: string;
    slug: string;
    name: string;
    iconUrl: string | null;
    basePrice: number;
    priceUnit: string;
  };
}

export interface ProSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface ProReview {
  id: string;
  rating: number;
  reviewText: string | null;
  tags: string[];
  createdAt: string;
  proResponse: string | null;
  customer: { fullName: string; profilePhoto: string | null };
}

export interface ProDetail {
  id: string;
  professionalTitle: string | null;
  bio: string | null;
  yearsExperience: number;
  trustScore: string;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  availabilityStatus: 'online' | 'offline' | 'busy';
  aadhaarVerified: boolean;
  faceVerified: boolean;
  bankVerified: boolean;
  policeVerified: boolean;
  introVideoUrl: string | null;
  totalBookings: number;
  repeatClientCount: number;
  avgResponseTimeSeconds: number;
  subscriptionPlan: string | null;
  user: {
    id: string;
    fullName: string;
    profilePhoto: string | null;
    city: string | null;
    area: string | null;
  };
  serviceOfferings: ProServiceOffering[];
  schedules: ProSchedule[];
  reviews: ProReview[];
}

export function useCategories(featured?: boolean) {
  return useQuery({
    queryKey: ['categories', { featured: !!featured }],
    queryFn: () =>
      apiFetch<{ categories: Category[]; count: number }>(
        `/categories${featured ? '?featured=true' : ''}`,
        { auth: false },
      ),
    staleTime: 5 * 60_000,
  });
}

/**
 * Tree view used by the home tab — parent tiles each carrying their
 * active children. Inactive children are filtered server-side.
 */
export function useCategoryTree() {
  return useQuery({
    queryKey: ['categories.tree'],
    queryFn: () =>
      apiFetch<{ tree: CategoryTreeParent[]; count: number }>('/categories/tree', { auth: false }),
    staleTime: 5 * 60_000,
  });
}

/** Children of a single parent — used by the parent-detail screen. */
export function useChildrenByParent(parentSlug: string | undefined) {
  return useQuery({
    queryKey: ['categories.children', parentSlug],
    queryFn: () =>
      apiFetch<{ categories: Category[]; count: number }>(`/categories?parentSlug=${parentSlug}`, {
        auth: false,
      }),
    enabled: !!parentSlug,
    staleTime: 5 * 60_000,
  });
}

export function useCategoryDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => apiFetch<CategoryDetail>(`/categories/${slug}`, { auth: false }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}

export interface CategorySearchHit {
  id: string;
  slug: string;
  parentId: string | null;
  name: string;
  heroImageUrl: string | null;
  shortPitch: string | null;
  basePrice: number;
  priceUnit: string;
  minDurationMinutes: number;
  parent: { id: string; slug: string; name: string } | null;
}

/**
 * Free-text category search. Returns empty until q.length >= 2.
 * 250ms debounce is the caller's responsibility (search screen).
 */
export function useSearchCategories(q: string) {
  const query = q.trim();
  return useQuery({
    queryKey: ['categories.search', query],
    queryFn: () =>
      apiFetch<{ results: CategorySearchHit[]; count: number; query: string }>(
        `/categories/search?q=${encodeURIComponent(query)}`,
        { auth: false },
      ),
    enabled: query.length >= 2,
    staleTime: 60_000,
  });
}

export interface NearbyArgs {
  lat: number;
  lng: number;
  category: string;
  radiusKm?: number;
  limit?: number;
}

export function useNearbyPros(args: NearbyArgs | null) {
  return useQuery({
    queryKey: ['pros.nearby', args],
    queryFn: () => {
      if (!args) throw new Error('missing args');
      const qs = new URLSearchParams({
        lat: String(args.lat),
        lng: String(args.lng),
        category: args.category,
        ...(args.radiusKm ? { radiusKm: String(args.radiusKm) } : {}),
        ...(args.limit ? { limit: String(args.limit) } : {}),
      });
      return apiFetch<{
        pros: NearbyPro[];
        count: number;
        query: { lat: number; lng: number; category: string; radiusKm: number };
      }>(`/pros/nearby?${qs.toString()}`);
    },
    enabled: !!args,
    staleTime: 30_000,
  });
}

export function useProDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['pro', id],
    queryFn: () => apiFetch<ProDetail>(`/pros/${id}`),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export interface FeaturedPro {
  id: string;
  fullName: string;
  profilePhoto: string | null;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  trustScore: number;
  yearsExperience: number;
  professionalTitle: string | null;
  primaryCategory: string | null;
}

/**
 * Top platform pros — used by the "Top Verified Pros" circular strip
 * on customer home. Public endpoint, no auth required.
 */
export function useFeaturedPros(limit = 10) {
  return useQuery({
    queryKey: ['pros.featured', limit],
    queryFn: () =>
      apiFetch<{ pros: FeaturedPro[]; count: number }>(`/pros/featured?limit=${limit}`, {
        auth: false,
      }),
    staleTime: 2 * 60_000,
  });
}
