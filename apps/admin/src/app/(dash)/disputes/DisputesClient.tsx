'use client';

import Link from 'next/link';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, IndianRupee } from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type BookingRow = {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  proPayout: number;
  scheduledAt: string;
  createdAt: string;
  category: { name: string; slug: string };
  customer: { id: string; fullName: string | null; phone: string };
  professional: { id: string; user: { fullName: string | null; phone: string } } | null;
};

export function DisputesClient() {
  const query = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: () =>
      clientFetch<{ items: BookingRow[] }>(
        `/api/admin/bookings${qs({ status: 'disputed', limit: '100', sortBy: 'createdAt', sortDir: 'asc' })}`,
      ),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  if (query.isPending) return <SkeletonTable rows={5} />;
  if (query.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load disputes.</p>
      </div>
    );
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <AlertTriangle className="h-6 w-6 text-success" />
        </div>
        <p className="text-body text-ink">No disputes open right now.</p>
        <p className="mt-1 text-small text-ink-subtle">
          Disputed bookings will appear here for resolution.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((b) => {
        const ageHours = (Date.now() - new Date(b.createdAt).getTime()) / 3_600_000;
        return (
          <Link
            key={b.id}
            href={`/bookings/${b.id}` as never}
            prefetch
            className="card flex items-start gap-4 p-5 transition hover:border-brand/40 hover:shadow-card"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-danger/10 text-danger">
              <AlertTriangle className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-mono font-semibold text-ink">{b.bookingNumber}</p>
                <span className="pill bg-danger/15 text-danger">Disputed</span>
                {b.paymentStatus === 'paid' && (
                  <span className="pill bg-success/15 text-success">Paid</span>
                )}
                {ageHours > 24 && (
                  <span className="pill bg-warning/15 text-warning">
                    SLA breach · {Math.floor(ageHours)}h old
                  </span>
                )}
              </div>
              <p className="mt-1 text-body text-ink">
                {b.category.name}
                <span className="text-ink-subtle"> · </span>
                <span className="text-ink-muted">{b.customer.fullName ?? b.customer.phone}</span>
                {b.professional && (
                  <>
                    <span className="text-ink-subtle"> → </span>
                    <span className="text-ink-muted">
                      {b.professional.user.fullName ?? b.professional.user.phone}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-1 text-caption text-ink-subtle">
                Opened {formatRelativeDate(b.createdAt)}
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="inline-flex items-center text-body font-semibold text-ink">
                <IndianRupee className="h-3.5 w-3.5" />
                {(b.totalAmount / 100).toLocaleString('en-IN')}
              </p>
              <p className="text-caption text-ink-subtle">Pro payout {formatPaise(b.proPayout)}</p>
            </div>

            <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-ink-subtle" />
          </Link>
        );
      })}
    </div>
  );
}
