import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface Category {
  id: string;
  slug: string;
  name: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  professionalTitle: string;
  description: string;
  /** Stored in paise. Use formatRupees() to display. */
  basePrice: number;
  priceUnit: string;
  isFeatured: boolean;
  minDurationMinutes: number;
}

export interface CategoryDetail extends Category {
  searchKeywords: string[];
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

export function useCategoryDetail(slug: string | undefined) {
  return useQuery({
    queryKey: ['category', slug],
    queryFn: () => apiFetch<CategoryDetail>(`/categories/${slug}`, { auth: false }),
    enabled: !!slug,
    staleTime: 5 * 60_000,
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
