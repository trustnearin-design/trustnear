import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

/**
 * Promotional banners shown across the app. Admin-managed; live + scheduled
 * filtering happens server-side so the customer never sees expired banners.
 */
export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  placement: 'home_hero' | 'home_strip' | 'category_top' | 'booking_complete';
  ctaText: string | null;
  linkKind: 'none' | 'category' | 'external' | 'promo';
  linkTarget: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
}

export function useBanners(placement: Banner['placement']) {
  return useQuery({
    queryKey: ['banners', placement] as const,
    queryFn: async (): Promise<Banner[]> => {
      const data = await apiFetch<{ banners: Banner[] }>(`/api/v1/banners?placement=${placement}`);
      return data.banners;
    },
    // Banners change rarely — 5 minute stale window keeps the home screen
    // snappy without burning a request on every scroll.
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
