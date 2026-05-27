'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { clientFetch, qs } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/format';
import { DataTable, type DataTableSort } from '@/components/DataTable';

type AuditRow = {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; fullName: string | null; phone: string } | null;
};

const ACTIONS = [
  { value: '', label: 'All actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'soft_delete', label: 'Soft delete' },
  { value: 'restore', label: 'Restore' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'permission_change', label: 'Permission change' },
  { value: 'config_change', label: 'Config change' },
];

export function AuditClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const entity = sp.get('entity') ?? '';
  const action = sp.get('action') ?? '';
  const sortDir = (sp.get('sortDir') ?? 'desc') as 'asc' | 'desc';
  const cursor = sp.get('cursor') ?? '';

  const query = useQuery({
    queryKey: ['admin', 'audit', { entity, action, sortDir, cursor }],
    queryFn: () =>
      clientFetch<{ items: AuditRow[]; nextCursor: string | null }>(
        `/api/admin/audit${qs({ entity, action, sortDir, cursor, limit: '30' })}`,
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
    router.push(`/audit${next.toString() ? '?' + next.toString() : ''}` as never);
  };

  const columns = useMemo<ColumnDef<AuditRow, unknown>[]>(
    () => [
      {
        id: 'actor',
        header: 'Actor',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink">
              {row.original.actor?.fullName ?? row.original.actor?.phone ?? 'system'}
            </p>
            <p className="text-caption uppercase tracking-wider text-ink-subtle">
              {row.original.actorRole ?? '—'}
            </p>
          </div>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        cell: ({ row }) => <ActionPill action={row.original.action} />,
      },
      {
        id: 'entity',
        header: 'Entity',
        cell: ({ row }) => (
          <code className="font-mono text-small text-brand">{row.original.entity}</code>
        ),
      },
      {
        id: 'entityId',
        header: 'Entity ID',
        cell: ({ row }) =>
          row.original.entityId ? (
            <code className="font-mono text-caption text-ink-subtle">
              #{row.original.entityId.slice(0, 8)}
            </code>
          ) : (
            '—'
          ),
      },
      {
        id: 'ipAddress',
        header: 'IP',
        cell: ({ row }) =>
          row.original.ipAddress ? (
            <code className="font-mono text-caption">{row.original.ipAddress}</code>
          ) : (
            '—'
          ),
      },
      {
        id: 'createdAt',
        header: 'When',
        cell: ({ row }) => formatRelativeDate(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <DataTable<AuditRow>
      data={query.data?.items ?? []}
      columns={columns}
      isLoading={query.isPending && !query.data}
      isFetching={query.isFetching}
      onRefresh={() => query.refetch()}
      hasError={query.isError}
      sort={{ sortBy: 'createdAt', sortDir }}
      onSortChange={(next: DataTableSort) => updateParams({ sortDir: next.sortDir })}
      sortableColumns={['createdAt']}
      toolbar={
        <FiltersBar entity={entity} action={action} onApply={(patch) => updateParams(patch)} />
      }
      hasNextPage={!!query.data?.nextCursor}
      hasPrevPage={!!cursor}
      onNextPage={() => {
        if (query.data?.nextCursor) updateParams({ cursor: query.data.nextCursor });
      }}
      onPrevPage={() => updateParams({ cursor: '' })}
      csvFilename="audit.csv"
      emptyMessage="No audit entries match."
    />
  );
}

function FiltersBar({
  entity,
  action,
  onApply,
}: {
  entity: string;
  action: string;
  onApply: (patch: Record<string, string>) => void;
}) {
  const [e, setE] = useState(entity);
  const [a, setA] = useState(action);
  return (
    <form
      onSubmit={(ev) => {
        ev.preventDefault();
        onApply({ entity: e, action: a });
      }}
      className="card grid gap-3 p-3 md:grid-cols-[1fr,200px,auto]"
    >
      <input
        value={e}
        onChange={(ev) => setE(ev.target.value)}
        placeholder="Entity (e.g. bookings, users)…"
        className="input font-mono"
      />
      <select value={a} onChange={(ev) => setA(ev.target.value)} className="input">
        {ACTIONS.map((opt) => (
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

function ActionPill({ action }: { action: string }) {
  const tone: Record<string, string> = {
    create: 'bg-success/15 text-success',
    update: 'bg-brand-100 text-brand-700',
    delete: 'bg-danger/15 text-danger',
    soft_delete: 'bg-danger/10 text-danger',
    restore: 'bg-success/10 text-success',
    login: 'bg-surface-muted text-ink-muted',
    logout: 'bg-surface-muted text-ink-muted',
    permission_change: 'bg-accent/15 text-accent-700',
    config_change: 'bg-accent/15 text-accent-700',
  };
  return (
    <span className={`pill ${tone[action] ?? 'bg-surface-muted text-ink-muted'}`}>
      {action.replaceAll('_', ' ')}
    </span>
  );
}
