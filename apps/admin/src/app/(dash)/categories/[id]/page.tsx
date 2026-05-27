import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { CategoryForm, type CategoryFormValues, type ParentOption } from '../CategoryForm';

type CategoryDetail = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  heroImageUrl: string | null;
  professionalTitle: string | null;
  description: string | null;
  shortPitch: string | null;
  basePrice: number;
  priceUnit: 'per_hour' | 'per_visit';
  isActive: boolean;
  isFeatured: boolean;
  phase: number;
  sortOrder: number;
  commissionRate: string | number;
  minDurationMinutes: number;
  searchKeywords: string[];
  parent: { id: string; name: string; slug: string } | null;
};

type CategoryListItem = { id: string; parentId: string | null; name: string };

export const dynamic = 'force-dynamic';

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [category, list] = await Promise.all([
    apiFetch<CategoryDetail>(`/api/v1/admin/categories/${id}`),
    apiFetch<{ categories: CategoryListItem[] }>('/api/v1/admin/categories'),
  ]);

  const parents: ParentOption[] = list.categories
    .filter((c) => c.parentId === null && c.id !== id)
    .map((c) => ({ id: c.id, name: c.name }));

  const initial: CategoryFormValues = {
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    iconUrl: category.iconUrl ?? '',
    bannerUrl: category.bannerUrl ?? '',
    heroImageUrl: category.heroImageUrl ?? '',
    professionalTitle: category.professionalTitle ?? '',
    description: category.description ?? '',
    shortPitch: category.shortPitch ?? '',
    basePrice: category.basePrice / 100, // paise → rupees for input
    priceUnit: category.priceUnit,
    isActive: category.isActive,
    isFeatured: category.isFeatured,
    phase: category.phase,
    sortOrder: category.sortOrder,
    commissionRate: Number(category.commissionRate),
    minDurationMinutes: category.minDurationMinutes,
    searchKeywords: category.searchKeywords.join(', '),
  };

  return (
    <>
      <Link href="/categories" className="btn-ghost mb-3 -ml-2">
        ← Back to categories
      </Link>
      <PageHeader
        title={category.name}
        subtitle={
          category.parent
            ? `Service under ${category.parent.name} · /${category.slug}`
            : `Parent category · /${category.slug}`
        }
      />
      <CategoryForm mode="edit" initial={initial} parents={parents} categoryId={id} />
    </>
  );
}
