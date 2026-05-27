'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { clientFetch, qs } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/format';
import { DataTable, type DataTableSort } from '@/components/DataTable';

type ExpertRow = {
  id: string;
  professionalTitle: string | null;
  trustScore: string | number;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  availabilityStatus: 'online' | 'busy' | 'offline';
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeVerified: boolean;
  totalBookings: number;
  createdAt: string;
  user: {
    id: string;
    fullName: string | null;
    phone: string;
    profilePhoto: string | null;
    city: string | null;
    area: string | null;
    isActive: boolean;
  };
};

const BADGES = [
  { value: '', label: 'All badges' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold', label: 'Gold' },
  { value: 'silver', label: 'Silver' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'none', label: 'No badge' },
];

const AVAILABILITY = [
  { value: '', label: 'Any availability' },
  { value: 'online', label: 'Online' },
  { value: 'busy', label: 'Busy' },
  { value: 'offline', label: 'Offline' },
];

export function ExpertsClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const search = sp.get('search') ?? '';
  const badge = sp.get('badge') ?? '';
  const availability = sp.get('availability') ?? '';
  const city = sp.get('city') ?? '';
  const kycComplete = sp.get('kycComplete') ?? '';
  const sortBy = (sp.get('sortBy') ?? 'trustScore') as 'trustScore' | 'totalBookings' | 'createdAt';
  const sortDir = (sp.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const cursor = sp.get('cursor') ?? '';

  const query = useQuery({
    queryKey: [
      'admin',
      'experts',
      { search, badge, availability, city, kycComplete, sortBy, sortDir, cursor },
    ],
    queryFn: () =>
      clientFetch<{ items: ExpertRow[]; nextCursor: string | null }>(
        `/api/admin/experts${qs({
          search,
          badge,
          availability,
          city,
          kycComplete,
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
    router.push(`/experts${next.toString() ? '?' + next.toString() : ''}` as never);
  };

  const columns = useMemo<ColumnDef<ExpertRow, unknown>[]>(
    () => [
      {
        id: 'fullName',
        header: 'Expert',
        cell: ({ row }) => (
          <Link
            href={`/experts/${row.original.id}` as never}
            prefetch
            className="flex items-center gap-3 hover:text-brand"
          >
            <Avatar
              name={row.original.user.fullName ?? row.original.user.phone}
              photo={row.original.user.profilePhoto}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {row.original.user.fullName ?? 'Unnamed'}
              </p>
              <p className="truncate text-caption text-ink-subtle">
                {row.original.professionalTitle ?? '—'} · {row.original.user.phone}
              </p>
            </div>
          </Link>
        ),
      },
      {
        id: 'trustBadge',
        header: 'Badge',
        cell: ({ row }) => <BadgePill badge={row.original.trustBadge} />,
      },
      {
        id: 'trustScore',
        header: 'Trust',
        cell: ({ row }) => (
          <span className="font-semibold text-ink">
            {Number(row.original.trustScore).toFixed(1)}
          </span>
        ),
      },
      {
        id: 'availabilityStatus',
        header: 'Status',
        cell: ({ row }) => <AvailabilityPill status={row.original.availabilityStatus} />,
      },
      {
        id: 'city',
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-ink-muted">
            {row.original.user.city ?? '—'}
            {row.original.user.area ? ' · ' + row.original.user.area : ''}
          </span>
        ),
      },
      {
        id: 'kyc',
        header: 'KYC',
        cell: ({ row }) => {
          const total = [
            row.original.aadhaarVerified,
            row.original.panVerified,
            row.original.bankVerified,
            row.original.policeVerified,
          ].filter(Boolean).length;
          const cls =
            total === 4 ? 'text-success' : total === 0 ? 'text-ink-subtle' : 'text-warning';
          return <span className={`font-semibold ${cls}`}>{total}/4</span>;
        },
      },
      {
        id: 'totalBookings',
        header: 'Bookings',
        cell: ({ row }) => row.original.totalBookings,
      },
      {
        id: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => formatRelativeDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <DataTable<ExpertRow>
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
      sortableColumns={['trustScore', 'totalBookings', 'createdAt']}
      toolbar={
        <FiltersBar
          search={search}
          badge={badge}
          availability={availability}
          city={city}
          onApply={(patch) => updateParams(patch)}
        />
      }
      hasNextPage={!!query.data?.nextCursor}
      hasPrevPage={!!cursor}
      onNextPage={() => {
        if (query.data?.nextCursor) updateParams({ cursor: query.data.nextCursor });
      }}
      onPrevPage={() => updateParams({ cursor: '' })}
      csvFilename="experts.csv"
      emptyMessage="No experts match these filters."
    />
  );
}

function FiltersBar({
  search,
  badge,
  availability,
  city,
  onApply,
}: {
  search: string;
  badge: string;
  availability: string;
  city: string;
  onApply: (patch: Record<string, string>) => void;
}) {
  const [s, setS] = useState(search);
  const [b, setB] = useState(badge);
  const [av, setAv] = useState(availability);
  const [c, setC] = useState(city);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ search: s, badge: b, availability: av, city: c });
      }}
      className="card grid gap-3 p-3 md:grid-cols-[1fr,160px,160px,140px,auto]"
    >
      <input
        value={s}
        onChange={(e) => setS(e.target.value)}
        placeholder="Search name or phone…"
        className="input"
      />
      <select value={b} onChange={(e) => setB(e.target.value)} className="input">
        {BADGES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select value={av} onChange={(e) => setAv(e.target.value)} className="input">
        {AVAILABILITY.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <input
        value={c}
        onChange={(e) => setC(e.target.value)}
        placeholder="City"
        className="input"
      />
      <button type="submit" className="btn-primary">
        Apply
      </button>
    </form>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-small font-semibold text-brand">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function BadgePill({ badge }: { badge: ExpertRow['trustBadge'] }) {
  const tone: Record<string, string> = {
    platinum: 'bg-brand text-ink-inverse',
    gold: 'bg-accent text-brand-900',
    silver: 'bg-ink-subtle/20 text-ink',
    bronze: 'bg-accent-700/15 text-accent-700',
    none: 'bg-surface-muted text-ink-subtle',
  };
  return <span className={`pill ${tone[badge]}`}>{badge}</span>;
}

function AvailabilityPill({ status }: { status: ExpertRow['availabilityStatus'] }) {
  const tone = {
    online: 'bg-success/15 text-success',
    busy: 'bg-warning/15 text-warning',
    offline: 'bg-surface-muted text-ink-subtle',
  };
  return <span className={`pill ${tone[status]} capitalize`}>{status}</span>;
}
