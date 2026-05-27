'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { toast } from 'sonner';
import { Ban } from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { DataTable, type DataTableSort } from '@/components/DataTable';

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

const STATUSES = [
  { value: '', label: 'All statuses' },
  { value: 'pending_match', label: 'Pending match' },
  { value: 'matched', label: 'Matched' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pro_en_route', label: 'En route' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled_customer', label: 'Cancelled (customer)' },
  { value: 'cancelled_pro', label: 'Cancelled (pro)' },
  { value: 'disputed', label: 'Disputed' },
];

const PAY = [
  { value: '', label: 'All payments' },
  { value: 'pending', label: 'Pending' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
  { value: 'partial_refund', label: 'Partial refund' },
  { value: 'failed', label: 'Failed' },
];

export function BookingsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const search = sp.get('search') ?? '';
  const status = sp.get('status') ?? '';
  const paymentStatus = sp.get('paymentStatus') ?? '';
  const sortBy = (sp.get('sortBy') ?? 'createdAt') as 'createdAt' | 'scheduledAt' | 'totalAmount';
  const sortDir = (sp.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const cursor = sp.get('cursor') ?? '';

  const query = useQuery({
    queryKey: ['admin', 'bookings', { search, status, paymentStatus, sortBy, sortDir, cursor }],
    queryFn: () =>
      clientFetch<{ items: BookingRow[]; nextCursor: string | null }>(
        `/api/admin/bookings${qs({
          search,
          status,
          paymentStatus,
          sortBy,
          sortDir,
          cursor,
          limit: '30',
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete('cursor');
    router.push(`/bookings${next.toString() ? '?' + next.toString() : ''}` as never);
  };

  const columns = useMemo<ColumnDef<BookingRow, unknown>[]>(
    () => [
      {
        id: 'bookingNumber',
        header: 'Booking',
        cell: ({ row }) => (
          <Link
            href={`/bookings/${row.original.id}` as never}
            prefetch
            className="font-mono font-semibold text-ink hover:text-brand"
          >
            {row.original.bookingNumber}
          </Link>
        ),
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => row.original.category.name,
      },
      {
        id: 'customer',
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="text-ink">{row.original.customer.fullName ?? '—'}</p>
            <p className="text-caption text-ink-subtle">{row.original.customer.phone}</p>
          </div>
        ),
      },
      {
        id: 'professional',
        header: 'Expert',
        cell: ({ row }) =>
          row.original.professional ? (
            <Link
              href={`/experts/${row.original.professional.id}` as never}
              prefetch
              className="hover:text-brand"
            >
              {row.original.professional.user.fullName ?? row.original.professional.user.phone}
            </Link>
          ) : (
            <span className="text-ink-subtle">— unmatched —</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusPill status={row.original.status} />,
      },
      {
        id: 'paymentStatus',
        header: 'Payment',
        cell: ({ row }) => <PayPill status={row.original.paymentStatus} />,
      },
      {
        id: 'totalAmount',
        header: 'Amount',
        cell: ({ row }) => (
          <span className="font-semibold text-ink">{formatPaise(row.original.totalAmount)}</span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created',
        cell: ({ row }) => formatRelativeDate(row.original.createdAt),
      },
    ],
    [],
  );

  const bulkCancel = useMutation({
    mutationFn: (payload: { ids: string[]; reason: string }) =>
      clientFetch<{ ok: string[]; failed: Array<{ id: string; reason: string }> }>(
        '/api/admin/bookings/bulk-cancel',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: (res) => {
      if (res.failed.length === 0) {
        toast.success(`${res.ok.length} booking${res.ok.length === 1 ? '' : 's'} cancelled`);
      } else {
        toast.warning(
          `${res.ok.length} cancelled, ${res.failed.length} failed (${res.failed[0]?.reason ?? ''})`,
        );
      }
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Bulk cancel failed'),
  });

  return (
    <DataTable<BookingRow>
      data={query.data?.items ?? []}
      columns={columns}
      isLoading={query.isPending && !query.data}
      isFetching={query.isFetching}
      onRefresh={() => query.refetch()}
      hasError={query.isError}
      sort={{ sortBy, sortDir }}
      onSortChange={(next: DataTableSort) =>
        updateParams({ sortBy: next.sortBy, sortDir: next.sortDir })
      }
      sortableColumns={['createdAt', 'scheduledAt', 'totalAmount']}
      toolbar={
        <FiltersBar
          search={search}
          status={status}
          paymentStatus={paymentStatus}
          onApply={(patch) => updateParams(patch)}
        />
      }
      enableSelection
      bulkActions={(ids, clear) => (
        <BulkBar
          ids={ids}
          onCancel={() => {
            const reason = prompt(
              `Force-cancel ${ids.length} booking(s)? Provide a reason (logged to audit):`,
            );
            if (reason && reason.trim().length >= 3) {
              bulkCancel.mutate({ ids, reason: reason.trim() });
              clear();
            } else if (reason !== null) {
              toast.error('Reason must be at least 3 characters.');
            }
          }}
          pending={bulkCancel.isPending}
        />
      )}
      hasNextPage={!!query.data?.nextCursor}
      hasPrevPage={!!cursor}
      onNextPage={() => {
        if (query.data?.nextCursor) updateParams({ cursor: query.data.nextCursor });
      }}
      onPrevPage={() => updateParams({ cursor: '' })}
      csvFilename="bookings.csv"
      emptyMessage="No bookings match these filters."
    />
  );
}

function FiltersBar({
  search,
  status,
  paymentStatus,
  onApply,
}: {
  search: string;
  status: string;
  paymentStatus: string;
  onApply: (patch: Record<string, string>) => void;
}) {
  const [s, setS] = useState(search);
  const [st, setSt] = useState(status);
  const [p, setP] = useState(paymentStatus);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ search: s, status: st, paymentStatus: p });
      }}
      className="card grid gap-3 p-3 md:grid-cols-[1fr,180px,180px,auto]"
    >
      <input
        value={s}
        onChange={(e) => setS(e.target.value)}
        placeholder="Booking #, customer name or phone…"
        className="input"
      />
      <select value={st} onChange={(e) => setSt(e.target.value)} className="input">
        {STATUSES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select value={p} onChange={(e) => setP(e.target.value)} className="input">
        {PAY.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-primary">
        Apply
      </button>
    </form>
  );
}

function BulkBar({
  ids: _ids,
  onCancel,
  pending,
}: {
  ids: string[];
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <button
      onClick={onCancel}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-card bg-danger/20 px-3 py-1.5 text-small font-semibold text-danger hover:bg-danger/30 disabled:opacity-60"
    >
      <Ban className="h-3.5 w-3.5" />
      Force cancel
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    pending_match: 'bg-warning/10 text-warning',
    matched: 'bg-brand-100 text-brand-700',
    confirmed: 'bg-accent/15 text-accent-700',
    pro_en_route: 'bg-accent/15 text-accent-700',
    otp_verified: 'bg-accent/15 text-accent-700',
    in_progress: 'bg-accent/15 text-accent-700',
    completed: 'bg-success/10 text-success',
    cancelled_customer: 'bg-danger/10 text-danger',
    cancelled_pro: 'bg-danger/10 text-danger',
    disputed: 'bg-danger/10 text-danger',
  };
  return (
    <span className={`pill ${tone[status] ?? 'bg-surface-muted text-ink-muted'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

function PayPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    paid: 'bg-success/15 text-success',
    pending: 'bg-warning/10 text-warning',
    refunded: 'bg-brand-100 text-brand-700',
    partial_refund: 'bg-brand-100 text-brand-700',
    failed: 'bg-danger/10 text-danger',
  };
  return (
    <span className={`pill ${tone[status] ?? 'bg-surface-muted text-ink-muted'}`}>{status}</span>
  );
}
