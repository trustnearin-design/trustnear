'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, IndianRupee } from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { SkeletonTable } from '@/components/Skeletons';

type PayoutRow = {
  userId: string;
  name: string;
  phone: string;
  walletBalance: number;
  proId: string | null;
  trustBadge: string;
  totalBookings: number;
  earned30d: number;
  payouts30d: number;
};

type WalletTxn = {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'hold' | 'release' | 'refund';
  reason: string;
  amount: number;
  balanceAfter: number;
  referenceId: string | null;
  createdAt: string;
  user: { fullName: string | null; phone: string; role: string };
};

export function PayoutsClient() {
  const payouts = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: () => clientFetch<{ items: PayoutRow[] }>(`/api/admin/payouts${qs({ limit: '50' })}`),
    staleTime: 30_000,
  });

  const [reasonFilter, setReasonFilter] = useState('');
  const txns = useQuery({
    queryKey: ['admin', 'wallet', 'txns', reasonFilter],
    queryFn: () =>
      clientFetch<{ items: WalletTxn[] }>(
        `/api/admin/wallet/transactions${qs({ reason: reasonFilter, limit: '50' })}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const totalBalances = (payouts.data?.items ?? []).reduce((acc, p) => acc + p.walletBalance, 0);
  const totalEarned30d = (payouts.data?.items ?? []).reduce((acc, p) => acc + p.earned30d, 0);

  return (
    <>
      {/* Hero KPIs */}
      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <Kpi
          label="Pro wallet balance"
          value={formatPaise(totalBalances)}
          sub="Total owed to top pros (un-withdrawn)"
          Icon={Wallet}
        />
        <Kpi
          label="Earned by pros (30d)"
          value={formatPaise(totalEarned30d)}
          sub={`Across ${payouts.data?.items.length ?? 0} top pros`}
          Icon={ArrowDownToLine}
        />
        <Kpi
          label="Recent transactions"
          value={String(txns.data?.items.length ?? 0)}
          sub="In last 50 wallet movements"
          Icon={ArrowUpFromLine}
        />
      </section>

      {/* Two columns: pros leaderboard + wallet ledger */}
      <div className="grid gap-5 lg:grid-cols-[5fr,7fr]">
        <section>
          <h2 className="mb-3 px-1 text-caption font-semibold uppercase tracking-wider text-ink-muted">
            Top earners (30d)
          </h2>
          {payouts.isPending ? (
            <SkeletonTable rows={6} />
          ) : payouts.isError ? (
            <div className="card p-8 text-center text-small text-danger">
              Failed to load payouts.
            </div>
          ) : (payouts.data?.items.length ?? 0) === 0 ? (
            <div className="card p-8 text-center text-small text-ink-subtle">
              No pros earning yet.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <ul className="divide-y divide-border">
                {payouts.data!.items.map((p, i) => (
                  <li key={p.userId} className="flex items-center gap-3 px-4 py-3">
                    <span
                      className={
                        'inline-flex h-7 w-7 items-center justify-center rounded-full text-caption font-bold ' +
                        (i === 0
                          ? 'bg-accent text-brand-900'
                          : i < 3
                            ? 'bg-brand text-ink-inverse'
                            : 'bg-surface-muted text-ink-muted')
                      }
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {p.proId ? (
                        <Link
                          href={`/experts/${p.proId}` as never}
                          prefetch
                          className="block truncate font-semibold text-ink hover:text-brand"
                        >
                          {p.name}
                        </Link>
                      ) : (
                        <p className="truncate font-semibold text-ink">{p.name}</p>
                      )}
                      <p className="truncate text-caption text-ink-subtle">
                        {p.phone} · {p.totalBookings} bookings ·{' '}
                        <span className="capitalize">{p.trustBadge}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-small font-semibold text-ink">
                        {formatPaise(p.earned30d)}
                      </p>
                      <p className="text-caption text-ink-subtle">
                        Wallet {formatPaise(p.walletBalance)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-caption font-semibold uppercase tracking-wider text-ink-muted">
              Wallet ledger
            </h2>
            <select
              value={reasonFilter}
              onChange={(e) => setReasonFilter(e.target.value)}
              className="input py-1 text-small"
            >
              <option value="">All reasons</option>
              <option value="booking_payment">Booking payment</option>
              <option value="pro_payout">Pro payout</option>
              <option value="refund">Refund</option>
              <option value="referral_reward">Referral</option>
              <option value="promo_credit">Promo credit</option>
              <option value="wallet_topup">Wallet top-up</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          {txns.isPending && !txns.data ? (
            <SkeletonTable rows={8} />
          ) : (txns.data?.items.length ?? 0) === 0 ? (
            <div className="card p-8 text-center text-small text-ink-subtle">
              No transactions match this filter.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-border bg-surface-muted/40">
                  <tr>
                    <Th>User</Th>
                    <Th>Type</Th>
                    <Th>Reason</Th>
                    <Th className="text-right">Amount</Th>
                    <Th className="text-right">Balance after</Th>
                    <Th className="text-right">When</Th>
                  </tr>
                </thead>
                <tbody>
                  {txns.data!.items.map((t) => (
                    <tr key={t.id} className="border-b border-border/60">
                      <td className="px-3 py-2.5 text-small text-ink">
                        <p className="font-semibold">{t.user.fullName ?? t.user.phone}</p>
                        <p className="text-caption uppercase tracking-wider text-ink-subtle">
                          {t.user.role}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <TypePill type={t.type} />
                      </td>
                      <td className="px-3 py-2.5 text-small text-ink-muted">
                        {t.reason.replaceAll('_', ' ')}
                      </td>
                      <td className="px-3 py-2.5 text-right text-small font-semibold text-ink">
                        <span
                          className={
                            t.type === 'debit' || t.type === 'hold' ? 'text-danger' : 'text-success'
                          }
                        >
                          {t.type === 'debit' || t.type === 'hold' ? '-' : '+'}
                          {formatPaise(t.amount)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-small text-ink-muted">
                        {formatPaise(t.balanceAfter)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-caption text-ink-subtle">
                        {formatRelativeDate(t.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Kpi({
  label,
  value,
  sub,
  Icon,
}: {
  label: string;
  value: string;
  sub: string;
  Icon: typeof Wallet;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">
          {label}
        </p>
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <p className="mt-2 inline-flex items-center text-h1 font-bold text-ink">
        {value.startsWith('₹') ? <IndianRupee className="mr-1 h-5 w-5" /> : null}
        {value.replace('₹', '')}
      </p>
      <p className="mt-1 text-small text-ink-muted">{sub}</p>
    </div>
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

function TypePill({ type }: { type: WalletTxn['type'] }) {
  const tone: Record<string, string> = {
    credit: 'bg-success/15 text-success',
    debit: 'bg-danger/15 text-danger',
    refund: 'bg-brand-100 text-brand-700',
    hold: 'bg-warning/15 text-warning',
    release: 'bg-accent/15 text-accent-700',
  };
  return (
    <span className={`pill ${tone[type] ?? 'bg-surface-muted text-ink-muted'} capitalize`}>
      {type}
    </span>
  );
}
