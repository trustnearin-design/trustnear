'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldAlert, Crown, Wrench, Banknote, Headphones } from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';
import { formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type AdminUser = {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  role: 'admin';
  adminRole: 'super' | 'ops' | 'finance' | 'support' | null;
  isActive: boolean;
  createdAt: string;
};

const ROLES: Array<{
  value: 'super' | 'ops' | 'finance' | 'support';
  label: string;
  Icon: typeof Crown;
  description: string;
}> = [
  {
    value: 'super',
    label: 'Super',
    Icon: Crown,
    description: 'Full access incl. admin management',
  },
  { value: 'ops', label: 'Ops', Icon: Wrench, description: 'Disputes, bookings, KYC' },
  {
    value: 'finance',
    label: 'Finance',
    Icon: Banknote,
    description: 'Refunds, promos, payouts, wallet',
  },
  { value: 'support', label: 'Support', Icon: Headphones, description: 'Users, reviews, FAQs' },
];

export function AdminsClient({ currentUserId }: { currentUserId: string }) {
  const list = useQuery({
    queryKey: ['admin', 'team'],
    queryFn: () =>
      clientFetch<{ items: AdminUser[]; nextCursor: string | null }>(
        `/api/admin/users${qs({ role: 'admin', limit: '100' })}`,
      ),
    staleTime: 15_000,
  });

  const qc = useQueryClient();

  const changeRole = useMutation({
    mutationFn: (args: { userId: string; adminRole: 'super' | 'ops' | 'finance' | 'support' }) =>
      clientFetch<AdminUser>(`/api/admin/users/${args.userId}/admin-role`, {
        method: 'PATCH',
        body: JSON.stringify({ adminRole: args.adminRole }),
      }),
    onSuccess: () => {
      toast.success('Admin role updated');
      qc.invalidateQueries({ queryKey: ['admin', 'team'] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'Update failed'),
  });

  if (list.isPending) return <SkeletonTable rows={4} />;
  if (list.isError) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load team.</p>
      </div>
    );
  }

  const items = list.data?.items ?? [];

  return (
    <>
      {/* Role legend */}
      <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <div key={r.value} className="card flex items-start gap-3 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-brand-100 text-brand">
              <r.Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-small font-semibold text-ink">{r.label}</p>
              <p className="text-caption text-ink-muted">{r.description}</p>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">
            No admins yet. Use <code className="font-mono">scripts/create-admin.mjs</code> to
            bootstrap the first one.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted/40">
              <tr>
                <Th>Admin</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Joined</Th>
                <Th className="text-right">Change role</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <tr key={u.id} className="border-b border-border/60">
                    <td className="px-3 py-3 align-middle">
                      <Link
                        href={`/users/${u.id}` as never}
                        prefetch
                        className="flex items-center gap-3 hover:text-brand"
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-small font-semibold text-brand">
                          {(u.fullName ?? u.phone).charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-semibold text-ink">
                            {u.fullName ?? 'Unnamed'}
                            {isSelf && (
                              <span className="ml-2 rounded-pill bg-accent/15 px-2 py-0.5 text-caption text-accent-700">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-caption text-ink-subtle">{u.phone}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 align-middle">
                      <RolePill role={u.adminRole ?? 'super'} />
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {u.isActive ? (
                        <span className="pill bg-success/15 text-success">Active</span>
                      ) : (
                        <span className="pill bg-danger/10 text-danger">Suspended</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle text-caption text-ink-subtle">
                      {formatRelativeDate(u.createdAt)}
                    </td>
                    <td className="px-3 py-3 align-middle text-right">
                      <select
                        value={u.adminRole ?? 'super'}
                        disabled={changeRole.isPending}
                        onChange={(e) => {
                          const next = e.target.value as 'super' | 'ops' | 'finance' | 'support';
                          if (next === u.adminRole) return;
                          if (
                            isSelf &&
                            u.adminRole === 'super' &&
                            next !== 'super' &&
                            !confirm(
                              "You're demoting yourself from super — you'll lose admin team access. Continue?",
                            )
                          ) {
                            e.target.value = 'super';
                            return;
                          }
                          changeRole.mutate({ userId: u.id, adminRole: next });
                        }}
                        className="input py-1.5 text-small"
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-card border border-warning/30 bg-warning/5 p-3 text-small text-warning">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <p>
          To <strong>add</strong> a new admin, promote a customer to{' '}
          <code className="font-mono">admin</code> from the Users page first, then set their scope
          here. Bootstrap the first super-admin via{' '}
          <code className="font-mono">scripts/create-admin.mjs</code>.
        </p>
      </div>
    </>
  );
}

function RolePill({ role }: { role: 'super' | 'ops' | 'finance' | 'support' }) {
  const conf: Record<string, { tone: string; Icon: typeof Crown }> = {
    super: { tone: 'bg-accent text-[#0B1F3A]', Icon: Crown },
    ops: { tone: 'bg-brand-100 text-brand-700', Icon: Wrench },
    finance: { tone: 'bg-success/15 text-success', Icon: Banknote },
    support: { tone: 'bg-brand-200/40 text-brand-700', Icon: Headphones },
  };
  const c = conf[role] ?? conf['super']!;
  return (
    <span className={`pill ${c.tone} inline-flex items-center gap-1`}>
      <c.Icon className="h-3 w-3" />
      {role}
    </span>
  );
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={
        'px-3 py-2.5 text-left text-caption font-semibold uppercase tracking-wider text-ink-muted ' +
        className
      }
    >
      {children}
    </th>
  );
}
