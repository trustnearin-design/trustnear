import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';

export interface FaqArticle {
  id: string;
  slug: string;
  category: string;
  question: string;
  body: string;
  sortOrder: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface LegalPage {
  id: string;
  slug: string;
  title: string;
  body: string;
  version: number;
  effectiveAt: string;
  isPublished: boolean;
  updatedAt: string;
}

/** Public — no auth needed. Backed by CMS published rows. */
export function useFaqs() {
  return useQuery({
    queryKey: ['faqs'],
    queryFn: () => apiFetch<{ items: FaqArticle[] }>('/api/v1/faqs'),
    staleTime: 5 * 60_000,
  });
}

export function useLegalPage(slug: string) {
  return useQuery({
    queryKey: ['legal', slug],
    queryFn: () => apiFetch<LegalPage | null>(`/api/v1/legal/${slug}`),
    staleTime: 10 * 60_000,
  });
}
