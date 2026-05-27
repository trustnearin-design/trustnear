'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Ban, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { clientFetch, qs } from '@/lib/api-client';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { DataTable, type DataTableSort } from '@/components/DataTable';

type UserRow = {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  role: 'customer' | 'professional' | 'admin';
  city: string | null;
  isActive: boolean;
  isVerified: boolean;
  walletBalance: number;
  createdAt: string;
  _count: { customerBookings: number };
};

const ROLES = [
  { value: '', label: 'All roles' },
  { value: 'customer', label: 'Customer' },
  { value: 'professional', label: 'Expert' },
  { value: 'admin', label: 'Admin' },
];

const ACTIVE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Suspended' },
];

export function UsersClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();

  const search = sp.get('search') ?? '';
  const role = sp.get('role') ?? '';
  const active = sp.get('active') ?? '';
  const sortBy = (sp.get('sortBy') ?? 'createdAt') as 'createdAt' | 'fullName' | 'walletBalance';
  const sortDir = (sp.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const cursor = sp.get('cursor') ?? '';

  const query = useQuery({
    queryKey: ['admin', 'users', { search, role, active, sortBy, sortDir, cursor }],
    queryFn: () =>
      clientFetch<{ items: UserRow[]; nextCursor: string | null }>(
        `/api/admin/users${qs({
          search,
          role,
          active,
          sortBy,
          sortDir,
          cursor,
          limit: '30',
        })}`,
      ),
    placeholderData: keepPreviousData,
  });

  const setSort = (next: DataTableSort) =>
    updateParams({ sortBy: next.sortBy, sortDir: next.sortDir });
  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (!v) next.delete(k);
      else next.set(k, v);
    }
    next.delete('cursor'); // any sort/filter change resets pagination
    router.push(`/users${next.toString() ? '?' + next.toString() : ''}` as never);
  };

  const columns = useMemo<ColumnDef<UserRow, unknown>[]>(
    () => [
      {
        id: 'fullName',
        header: 'Name',
        cell: ({ row }) => (
          <Link
            href={`/users/${row.original.id}` as never}
            prefetch
            className="flex items-center gap-3 hover:text-brand"
          >
            <Avatar name={row.original.fullName ?? row.original.phone} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">
                {row.original.fullName ?? 'Unnamed'}
              </p>
              <p className="truncate text-caption text-ink-subtle">
                {row.original.phone}
                {row.original.email ? ` · ${row.original.email}` : ''}
              </p>
            </div>
          </Link>
        ),
      },
      {
        id: 'role',
        header: 'Role',
        cell: ({ row }) => <RolePill role={row.original.role} />,
      },
      {
        id: 'isActive',
        header: 'Status',
        cell: ({ row }) =>
          row.original.isActive ? (
            <span className="pill bg-success/15 text-success">Active</span>
          ) : (
            <span className="pill bg-danger/10 text-danger">Suspended</span>
          ),
      },
      {
        id: 'city',
        header: 'City',
        cell: ({ row }) => row.original.city ?? '—',
      },
      {
        id: 'bookings',
        header: 'Bookings',
        cell: ({ row }) => row.original._count.customerBookings,
      },
      {
        id: 'walletBalance',
        header: 'Wallet',
        cell: ({ row }) => formatPaise(row.original.walletBalance),
      },
      {
        id: 'createdAt',
        header: 'Joined',
        cell: ({ row }) => formatRelativeDate(row.original.createdAt),
      },
    ],
    [],
  );

  const bulkActive = useMutation({
    mutationFn: (payload: { ids: string[]; isActive: boolean }) =>
      clientFetch<{ ok: string[]; failed: Array<{ id: string; reason: string }> }>(
        '/api/admin/users/bulk-active',
        { method: 'POST', body: JSON.stringify(payload) },
      ),
    onSuccess: (res, vars) => {
      const verb = vars.isActive ? 'reactivated' : 'suspended';
      if (res.failed.length === 0) {
        toast.success(`${res.ok.length} user${res.ok.length === 1 ? '' : 's'} ${verb}`);
      } else {
        toast.warning(
          `${res.ok.length} ${verb}, ${res.failed.length} failed (${res.failed[0]?.reason ?? ''})`,
        );
      }
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Bulk update failed'),
  });

  return (
    <DataTable<UserRow>
      data={query.data?.items ?? []}
      columns={columns}
      isLoading={query.isPending && !query.data}
      isFetching={query.isFetching}
      onRefresh={() => query.refetch()}
      hasError={query.isError}
      sort={{ sortBy, sortDir }}
      onSortChange={setSort}
      sortableColumns={['createdAt', 'fullName', 'walletBalance']}
      toolbar={
        <FiltersBar
          search={search}
          role={role}
          active={active}
          onApply={(patch) => updateParams(patch)}
        />
      }
      enableSelection
      bulkActions={(ids, clear) => (
        <BulkBar
          ids={ids}
          onActivate={() => {
            if (confirm(`Reactivate ${ids.length} user(s)?`)) {
              bulkActive.mutate({ ids, isActive: true });
              clear();
            }
          }}
          onSuspend={() => {
            if (confirm(`Suspend ${ids.length} user(s)? Last-admin guard still applies per row.`)) {
              bulkActive.mutate({ ids, isActive: false });
              clear();
            }
          }}
          pending={bulkActive.isPending}
        />
      )}
      hasNextPage={!!query.data?.nextCursor}
      hasPrevPage={!!cursor}
      onNextPage={() => {
        if (query.data?.nextCursor) updateParams({ cursor: query.data.nextCursor });
      }}
      onPrevPage={() => updateParams({ cursor: '' })}
      csvFilename="users.csv"
      emptyMessage="No users match these filters."
    />
  );
}

// ─── Filters bar ──────────────────────────────────────────────────────

function FiltersBar({
  search,
  role,
  active,
  onApply,
}: {
  search: string;
  role: string;
  active: string;
  onApply: (patch: Record<string, string>) => void;
}) {
  const [s, setS] = useState(search);
  const [r, setR] = useState(role);
  const [a, setA] = useState(active);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onApply({ search: s, role: r, active: a });
      }}
      className="card grid gap-3 p-3 md:grid-cols-[1fr,180px,180px,auto]"
    >
      <input
        value={s}
        onChange={(e) => setS(e.target.value)}
        placeholder="Search by phone, name, email…"
        className="input"
      />
      <select value={r} onChange={(e) => setR(e.target.value)} className="input">
        {ROLES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select value={a} onChange={(e) => setA(e.target.value)} className="input">
        {ACTIVE_FILTERS.map((opt) => (
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

// ─── Bulk action bar ──────────────────────────────────────────────────

function BulkBar({
  ids: _ids,
  onActivate,
  onSuspend,
  pending,
}: {
  ids: string[];
  onActivate: () => void;
  onSuspend: () => void;
  pending: boolean;
}) {
  return (
    <>
      <button
        onClick={onActivate}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-card bg-success/20 px-3 py-1.5 text-small font-semibold text-success hover:bg-success/30 disabled:opacity-60"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        Reactivate
      </button>
      <button
        onClick={onSuspend}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-card bg-danger/20 px-3 py-1.5 text-small font-semibold text-danger hover:bg-danger/30 disabled:opacity-60"
      >
        <Ban className="h-3.5 w-3.5" />
        Suspend
      </button>
    </>
  );
}

// ─── Bits ─────────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-small font-semibold text-brand">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function RolePill({ role }: { role: 'customer' | 'professional' | 'admin' }) {
  const tone = {
    customer: 'bg-brand-100 text-brand-700',
    professional: 'bg-accent/15 text-accent-700',
    admin: 'bg-success/15 text-success',
  };
  const Icon = role === 'admin' ? ShieldAlert : null;
  return (
    <span className={`pill inline-flex items-center gap-1 ${tone[role]}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {role}
    </span>
  );
}
