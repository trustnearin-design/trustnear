'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Archive } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discountType: 'percent' | 'flat';
  value: number;
  maxDiscount: number | null;
  minOrderAmount: number;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  createdAt: string;
};

export function PromosClient() {
  const list = useQuery({
    queryKey: ['admin', 'cms', 'promos'],
    queryFn: () => clientFetch<{ items: Promo[] }>('/api/admin/cms/promo-codes'),
    staleTime: 30_000,
  });
  const qc = useQueryClient();

  const archive = useMutation({
    mutationFn: (id: string) =>
      clientFetch(`/api/admin/cms/promo-codes/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Promo archived (set inactive)');
      qc.invalidateQueries({ queryKey: ['admin', 'cms', 'promos'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Archive failed'),
  });

  if (list.isPending) return <SkeletonTable rows={5} />;
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load promo codes.</p>
      </div>
    );
  }

  const items = list.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-ink-subtle">
          No promo codes yet. Create the first one to launch a coupon.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-border bg-surface-muted/40">
          <tr>
            <Th>Code</Th>
            <Th>Discount</Th>
            <Th>Min order</Th>
            <Th>Usage</Th>
            <Th>Validity</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <tr
              key={p.id}
              className="border-b border-border/60 transition hover:bg-surface-muted/40"
            >
              <td className="px-3 py-3">
                <Link
                  href={`/cms/promos/${p.id}` as never}
                  prefetch
                  className="font-mono font-semibold text-brand hover:underline"
                >
                  {p.code}
                </Link>
                {p.description && (
                  <p className="mt-0.5 max-w-xs truncate text-caption text-ink-subtle">
                    {p.description}
                  </p>
                )}
              </td>
              <td className="px-3 py-3 text-small text-ink">
                {p.discountType === 'percent'
                  ? `${(p.value / 100).toFixed(0)}%${
                      p.maxDiscount ? ' · cap ' + formatPaise(p.maxDiscount) : ''
                    }`
                  : formatPaise(p.value) + ' off'}
              </td>
              <td className="px-3 py-3 text-small text-ink-muted">
                {p.minOrderAmount > 0 ? formatPaise(p.minOrderAmount) : '—'}
              </td>
              <td className="px-3 py-3 text-small text-ink-muted">
                {p.usageCount}
                {p.usageLimit ? ` / ${p.usageLimit}` : ' · ∞'}
              </td>
              <td className="px-3 py-3 text-caption text-ink-muted">
                <p>From {formatRelativeDate(p.validFrom)}</p>
                <p>Until {formatRelativeDate(p.validUntil)}</p>
              </td>
              <td className="px-3 py-3">
                {p.isActive ? (
                  <span className="pill bg-success/15 text-success">Active</span>
                ) : (
                  <span className="pill bg-surface-muted text-ink-subtle">Inactive</span>
                )}
              </td>
              <td className="px-3 py-3 text-right">
                {p.isActive && (
                  <button
                    onClick={() => {
                      if (confirm(`Archive promo "${p.code}"?`)) archive.mutate(p.id);
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-card border border-border bg-surface text-ink-muted hover:bg-surface-muted hover:text-danger"
                    title="Archive"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-caption font-semibold uppercase tracking-wider text-ink-muted">
      {children}
    </th>
  );
}
