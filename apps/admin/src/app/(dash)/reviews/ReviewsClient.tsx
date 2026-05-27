'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Eye, EyeOff, Star, MessageSquare } from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type Review = {
  id: string;
  rating: number;
  reviewText: string | null;
  tags: string[];
  isPublic: boolean;
  sentimentScore: string | null;
  proResponse: string | null;
  createdAt: string;
  customer: { id: string; fullName: string | null; phone: string };
  professional: {
    id: string;
    professionalTitle: string | null;
    user: { fullName: string | null; phone: string };
  };
  booking: { id: string; bookingNumber: string };
};

const FILTERS: Array<{ value: 'all' | 'visible' | 'hidden' | 'lowRating'; label: string }> = [
  { value: 'all', label: 'All reviews' },
  { value: 'lowRating', label: 'Low ratings (≤ 2★)' },
  { value: 'hidden', label: 'Hidden' },
  { value: 'visible', label: 'Visible only' },
];

export function ReviewsClient() {
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden' | 'lowRating'>('all');
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin', 'reviews', filter],
    queryFn: () =>
      clientFetch<{ items: Review[] }>(`/api/admin/reviews${qs({ filter, limit: '50' })}`),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const moderate = useMutation({
    mutationFn: (args: { id: string; isPublic: boolean }) =>
      clientFetch(`/api/admin/reviews/${args.id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublic: args.isPublic }),
      }),
    onSuccess: (_, vars) => {
      toast.success(vars.isPublic ? 'Review visible again' : 'Review hidden');
      qc.invalidateQueries({ queryKey: ['admin', 'reviews'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  const items = list.data?.items ?? [];

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={
              'inline-flex items-center gap-2 rounded-pill border px-3 py-1.5 text-small font-medium transition ' +
              (filter === f.value
                ? 'border-brand bg-brand text-ink-inverse'
                : 'border-border bg-surface text-ink hover:bg-surface-muted')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.isPending && !list.data ? (
        <SkeletonTable rows={4} />
      ) : list.isError ? (
        <div className="card p-12 text-center">
          <p className="text-body text-danger">Failed to load reviews.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">No reviews match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <article
              key={r.id}
              className={
                'card p-5 ' + (!r.isPublic ? 'border-dashed border-danger/40 bg-danger/5' : '')
              }
            >
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarRow rating={r.rating} />
                    {!r.isPublic && <span className="pill bg-danger/15 text-danger">Hidden</span>}
                    {r.rating <= 2 && r.isPublic && (
                      <span className="pill bg-warning/15 text-warning">Low rating</span>
                    )}
                    <p className="text-caption text-ink-subtle">
                      {formatRelativeDate(r.createdAt)}
                    </p>
                  </div>
                  {r.reviewText && <p className="mt-2 text-body text-ink">{r.reviewText}</p>}
                  {r.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-pill bg-surface-muted px-2 py-0.5 text-caption text-ink-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.proResponse && (
                    <div className="mt-3 rounded-card border border-border bg-surface-muted/40 p-3">
                      <p className="mb-1 flex items-center gap-1 text-caption font-semibold uppercase tracking-wider text-ink-subtle">
                        <MessageSquare className="h-3 w-3" />
                        Expert response
                      </p>
                      <p className="text-small text-ink-muted">{r.proResponse}</p>
                    </div>
                  )}
                </div>
                {r.isPublic ? (
                  <button
                    onClick={() => {
                      if (confirm('Hide this review from customer + pro apps?')) {
                        moderate.mutate({ id: r.id, isPublic: false });
                      }
                    }}
                    disabled={moderate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-card border border-border bg-surface px-3 py-1.5 text-small font-medium text-ink hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Hide
                  </button>
                ) : (
                  <button
                    onClick={() => moderate.mutate({ id: r.id, isPublic: true })}
                    disabled={moderate.isPending}
                    className="inline-flex items-center gap-1.5 rounded-card border border-success/30 bg-success/5 px-3 py-1.5 text-small font-semibold text-success hover:bg-success/10 disabled:opacity-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Unhide
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-caption text-ink-muted">
                <span>
                  Customer:{' '}
                  <Link
                    href={`/users/${r.customer.id}` as never}
                    prefetch
                    className="font-semibold text-brand hover:underline"
                  >
                    {r.customer.fullName ?? r.customer.phone}
                  </Link>
                </span>
                <span>·</span>
                <span>
                  Expert:{' '}
                  <Link
                    href={`/experts/${r.professional.id}` as never}
                    prefetch
                    className="font-semibold text-brand hover:underline"
                  >
                    {r.professional.user.fullName ?? r.professional.user.phone}
                  </Link>
                </span>
                <span>·</span>
                <Link
                  href={`/bookings/${r.booking.id}` as never}
                  prefetch
                  className="font-mono text-brand hover:underline"
                >
                  {r.booking.bookingNumber}
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={'h-4 w-4 ' + (i < rating ? 'fill-accent text-accent' : 'text-ink-subtle')}
        />
      ))}
      <span className="ml-1 text-small font-semibold text-ink">{rating}</span>
    </span>
  );
}
