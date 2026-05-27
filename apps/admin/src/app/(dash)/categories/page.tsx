import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatPaise } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';

type Category = {
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
  _count: { offerings: number; bookings: number };
};

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  const { categories } = await apiFetch<{ categories: Category[] }>('/api/v1/admin/categories');

  const parents = categories.filter((c) => c.parentId === null);
  const childrenByParent = new Map<string, Category[]>();
  for (const c of categories) {
    if (c.parentId) {
      const list = childrenByParent.get(c.parentId) ?? [];
      list.push(c);
      childrenByParent.set(c.parentId, list);
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Manage what customers see — names, images, prices, ordering. All changes are live immediately."
        action={
          <Link href="/categories/new" className="btn-primary">
            + New parent category
          </Link>
        }
      />

      {parents.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">
            No categories yet. Create your first parent category.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {parents.map((parent) => (
            <CategorySection
              key={parent.id}
              parent={parent}
              children={childrenByParent.get(parent.id) ?? []}
            />
          ))}
        </div>
      )}
    </>
  );
}

function CategorySection({ parent, children }: { parent: Category; children: Category[] }) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-4 border-b border-border bg-brand p-5 text-ink-inverse">
        <CategoryThumb url={parent.heroImageUrl ?? parent.iconUrl} fallback={parent.name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-h2 font-bold">{parent.name}</h2>
            {!parent.isActive && <span className="pill bg-danger/20 text-danger">Inactive</span>}
            {parent.isFeatured && <span className="pill bg-accent text-brand-900">Featured</span>}
          </div>
          <p className="text-small text-brand-100">
            /{parent.slug} · {children.length} services · sortOrder {parent.sortOrder}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/categories/new?parentId=${parent.id}` as never}
            className="rounded-pill bg-accent px-4 py-2 text-small font-semibold text-brand-900 transition hover:bg-accent-600"
          >
            + Add service
          </Link>
          <Link
            href={`/categories/${parent.id}` as never}
            className="rounded-pill bg-brand-700 px-4 py-2 text-small font-semibold text-ink-inverse transition hover:bg-brand-600"
          >
            Edit
          </Link>
        </div>
      </header>

      {children.length === 0 ? (
        <p className="px-6 py-10 text-center text-small text-ink-subtle">
          No services under this parent yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {children.map((leaf) => (
            <li key={leaf.id} className="flex items-center gap-4 px-6 py-4">
              <CategoryThumb url={leaf.heroImageUrl ?? leaf.iconUrl} fallback={leaf.name} small />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-body font-semibold text-ink">{leaf.name}</p>
                  {!leaf.isActive && (
                    <span className="pill bg-danger/10 text-danger">Inactive</span>
                  )}
                  {leaf.isFeatured && (
                    <span className="pill bg-accent/15 text-accent-700">Featured</span>
                  )}
                </div>
                <p className="truncate text-small text-ink-muted">
                  /{leaf.slug} · {leaf._count.offerings} experts · {leaf._count.bookings} bookings
                </p>
              </div>
              <div className="hidden text-right md:block">
                <p className="text-small font-semibold text-ink">
                  {formatPaise(leaf.basePrice)}{' '}
                  <span className="font-normal text-ink-muted">
                    / {leaf.priceUnit === 'per_hour' ? 'hr' : 'visit'}
                  </span>
                </p>
                <p className="text-caption text-ink-subtle">
                  {Number(leaf.commissionRate).toFixed(1)}% commission · {leaf.minDurationMinutes}
                  min min
                </p>
              </div>
              <Link href={`/categories/${leaf.id}` as never} className="btn-ghost">
                Edit →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryThumb({
  url,
  fallback,
  small = false,
}: {
  url: string | null;
  fallback: string;
  small?: boolean;
}) {
  const size = small ? 'h-11 w-11' : 'h-14 w-14';
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={fallback}
        className={`${size} rounded-card border border-border bg-surface-muted object-cover`}
      />
    );
  }
  return (
    <span
      className={`${size} inline-flex items-center justify-center rounded-card bg-accent/15 text-h3 font-bold text-accent`}
    >
      {fallback.charAt(0).toUpperCase()}
    </span>
  );
}
