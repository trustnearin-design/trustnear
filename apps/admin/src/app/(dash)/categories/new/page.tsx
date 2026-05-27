import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { CategoryForm, type CategoryFormValues, type ParentOption } from '../CategoryForm';

type Category = {
  id: string;
  parentId: string | null;
  name: string;
};

export const dynamic = 'force-dynamic';

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parentId?: string }>;
}) {
  const { parentId } = await searchParams;
  const { categories } = await apiFetch<{ categories: Category[] }>('/api/v1/admin/categories');
  const parents: ParentOption[] = categories
    .filter((c) => c.parentId === null)
    .map((c) => ({ id: c.id, name: c.name }));

  const initial: CategoryFormValues = {
    parentId: parentId ?? null,
    name: '',
    slug: '',
    iconUrl: '',
    bannerUrl: '',
    heroImageUrl: '',
    professionalTitle: '',
    description: '',
    shortPitch: '',
    basePrice: 0,
    priceUnit: 'per_hour',
    isActive: true,
    isFeatured: false,
    phase: 1,
    sortOrder: 0,
    commissionRate: 15,
    minDurationMinutes: 60,
    searchKeywords: '',
  };

  return (
    <>
      <Link href="/categories" className="btn-ghost mb-3 -ml-2">
        ← Back to categories
      </Link>
      <PageHeader
        title={parentId ? 'New service' : 'New parent category'}
        subtitle={
          parentId
            ? 'Add a service under an existing parent. Customers will see it as a bookable option.'
            : 'A parent groups related services (e.g. Home Care, Beauty & Wellness).'
        }
      />
      <CategoryForm mode="create" initial={initial} parents={parents} />
    </>
  );
}
