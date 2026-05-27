'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Activity, AlertTriangle } from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { formatCount, formatPaise, formatRelativeDate } from '@/lib/format';
import { SkeletonMetricGrid } from '@/components/Skeletons';
import { LiveOpsMap } from './LiveOpsMap';

// ─── Types ────────────────────────────────────────────────────────────

type DashboardData = {
  metrics: {
    users: { total: number; newToday: number };
    pros: { total: number; kycComplete: number; kycPending: number; online: number };
    bookings: { today: number; last7d: number; last30d: number; activeNow: number };
    gmvPaise: { today: number; last7d: number; last30d: number };
  };
  recent: Array<{
    id: string;
    bookingNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
    category: { name: string; slug: string };
    customer: { fullName: string | null; phone: string };
    professional: { user: { fullName: string | null; phone: string } } | null;
  }>;
};

type ChartsData = {
  daily: Array<{ date: string; bookings: number; gmvPaise: number; paidBookings: number }>;
  byCategory: Array<{
    categoryId: string;
    name: string;
    slug: string;
    bookings: number;
    gmvPaise: number;
  }>;
  funnel: Record<string, number>;
  paymentBreakdown: Array<{ status: string; count: number; totalPaise: number }>;
  topExperts: Array<{
    id: string;
    name: string;
    phone: string;
    trustBadge: string;
    totalBookings: number;
    gmvPaise30d: number;
  }>;
};

// Brand palette pulled from tailwind tokens (navy + gold). Recharts wants
// raw hex so we redeclare here.
const PALETTE = {
  brand: '#0B1F3A',
  brandLight: '#3454A0',
  accent: '#D4A24C',
  accentDeep: '#9C6F22',
  success: '#16A34A',
  warning: '#EAB308',
  danger: '#DC2626',
  ink: '#0F172A',
  inkMuted: '#64748B',
  border: '#E2E8F0',
};

// ─── Page ─────────────────────────────────────────────────────────────

export function DashboardClient() {
  const overview = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => clientFetch<DashboardData>('/api/admin/dashboard'),
    refetchInterval: 30_000,
  });

  const charts = useQuery({
    queryKey: ['admin', 'dashboard', 'charts'],
    queryFn: () => clientFetch<ChartsData>('/api/admin/dashboard/charts'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (overview.isPending && !overview.data) {
    return (
      <>
        <SkeletonMetricGrid count={4} />
        <SkeletonMetricGrid count={3} />
      </>
    );
  }

  if (overview.isError || !overview.data) {
    return (
      <div className="card p-12 text-center">
        <p className="text-body text-danger">Failed to load dashboard. Refresh karke try kar.</p>
      </div>
    );
  }

  const { metrics, recent } = overview.data;
  const daily = charts.data?.daily ?? [];

  // Compute deltas: today vs yesterday + last 7d vs prior 7d
  const todayBookings = daily.at(-1)?.bookings ?? metrics.bookings.today;
  const yesterdayBookings = daily.at(-2)?.bookings ?? 0;
  const bookingsDelta = pctDelta(todayBookings, yesterdayBookings);

  const last7dGmv = daily.slice(-7).reduce((a, b) => a + b.gmvPaise, 0);
  const prior7dGmv = daily.slice(-14, -7).reduce((a, b) => a + b.gmvPaise, 0);
  const gmvDelta = pctDelta(last7dGmv, prior7dGmv);

  const todayGmv = daily.at(-1)?.gmvPaise ?? metrics.gmvPaise.today;
  const yesterdayGmv = daily.at(-2)?.gmvPaise ?? 0;
  const todayGmvDelta = pctDelta(todayGmv, yesterdayGmv);

  return (
    <>
      {/* ── Hero KPI strip ──────────────────────────────────────── */}
      <section className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <HeroKpi
          label="Bookings today"
          value={formatCount(todayBookings)}
          delta={bookingsDelta}
          deltaLabel="vs yesterday"
          spark={daily.slice(-14).map((d) => ({ x: d.date, y: d.bookings }))}
          tone="brand"
        />
        <HeroKpi
          label="GMV today"
          value={formatPaise(todayGmv)}
          delta={todayGmvDelta}
          deltaLabel="vs yesterday"
          spark={daily.slice(-14).map((d) => ({ x: d.date, y: d.gmvPaise }))}
          tone="success"
        />
        <HeroKpi
          label="GMV (7d)"
          value={formatPaise(last7dGmv)}
          delta={gmvDelta}
          deltaLabel="vs prior 7d"
          spark={daily.slice(-7).map((d) => ({ x: d.date, y: d.gmvPaise }))}
          tone="accent"
        />
        <HeroKpi
          label="Active bookings"
          value={formatCount(metrics.bookings.activeNow)}
          delta={null}
          deltaLabel={`${metrics.pros.online} experts online`}
          spark={[]}
          tone="warning"
        />
      </section>

      {/* ── Trends row ──────────────────────────────────────────── */}
      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card title="Bookings & GMV — last 30 days" subtitle="Daily volume vs paid GMV">
          {charts.isPending ? (
            <ChartSkeleton />
          ) : daily.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={daily} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bookGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.brand} stopOpacity={0.32} />
                    <stop offset="100%" stopColor={PALETTE.brand} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gmvGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PALETTE.accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={PALETTE.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDay}
                  tick={{ fontSize: 11, fill: PALETTE.inkMuted }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={20}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: PALETTE.inkMuted }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: PALETTE.inkMuted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => '₹' + Math.round(v / 100000) + 'L'}
                  width={50}
                />
                <Tooltip
                  content={<TrendsTooltip />}
                  cursor={{ stroke: PALETTE.brand, strokeOpacity: 0.15 }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="bookings"
                  stroke={PALETTE.brand}
                  strokeWidth={2}
                  fill="url(#bookGrad)"
                  name="Bookings"
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="gmvPaise"
                  stroke={PALETTE.accent}
                  strokeWidth={2}
                  fill="url(#gmvGrad)"
                  name="GMV (paise)"
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Payment breakdown" subtitle="Last 30 days by status">
          {charts.isPending ? (
            <ChartSkeleton />
          ) : (charts.data?.paymentBreakdown.length ?? 0) === 0 ? (
            <EmptyChart />
          ) : (
            <div className="grid grid-cols-[1fr,180px] items-center gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={charts.data!.paymentBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {charts.data!.paymentBreakdown.map((entry) => (
                      <Cell key={entry.status} fill={payColor(entry.status)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCount(Number(value)), 'count']}
                    contentStyle={tooltipStyle}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="space-y-2">
                {charts.data!.paymentBreakdown.map((p) => (
                  <li key={p.status} className="flex items-center gap-2 text-small">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: payColor(p.status) }}
                    />
                    <span className="capitalize text-ink-muted">
                      {p.status.replaceAll('_', ' ')}
                    </span>
                    <span className="ml-auto font-semibold text-ink">{formatCount(p.count)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </section>

      {/* ── Categories + Funnel row ─────────────────────────────── */}
      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <Card title="GMV by category (30d)" subtitle="Top 10 service categories">
          {charts.isPending ? (
            <ChartSkeleton />
          ) : (charts.data?.byCategory.length ?? 0) === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={charts.data!.byCategory}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
              >
                <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => '₹' + Math.round(v / 100000) + 'L'}
                  tick={{ fontSize: 11, fill: PALETTE.inkMuted }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: PALETTE.ink }}
                  axisLine={false}
                  tickLine={false}
                  width={130}
                />
                <Tooltip
                  formatter={(value) => [formatPaise(Number(value)), 'GMV']}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="gmvPaise" radius={[0, 6, 6, 0]} fill={PALETTE.accent}>
                  {charts.data!.byCategory.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === 0 ? PALETTE.brand : i < 3 ? PALETTE.brandLight : PALETTE.accent}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Booking funnel (30d)" subtitle="Where bookings end up">
          {charts.isPending ? <ChartSkeleton /> : <FunnelView funnel={charts.data?.funnel ?? {}} />}
        </Card>
      </section>

      {/* ── Top experts + Recent activity ───────────────────────── */}
      <section className="mb-8 grid gap-4 lg:grid-cols-[5fr,7fr]">
        <Card title="Top experts (30d)" subtitle="Ranked by paid GMV">
          {charts.isPending ? (
            <SkeletonList rows={6} />
          ) : (charts.data?.topExperts.length ?? 0) === 0 ? (
            <EmptyChart />
          ) : (
            <ol className="space-y-3">
              {charts.data!.topExperts.map((e, i) => (
                <li
                  key={e.id}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface px-3 py-2"
                >
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
                  <Link
                    href={`/experts/${e.id}` as never}
                    prefetch
                    className="flex-1 min-w-0 truncate text-small font-semibold text-ink hover:text-brand"
                  >
                    {e.name}
                  </Link>
                  <BadgePill badge={e.trustBadge} />
                  <span className="w-24 text-right text-small font-semibold text-ink">
                    {formatPaise(e.gmvPaise30d)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Recent activity" subtitle="Latest 10 bookings — auto-refreshes every 30s">
          <RecentList recent={recent} />
        </Card>
      </section>

      {/* ── Live ops map ────────────────────────────────────────── */}
      <section className="mb-8">
        <Card
          title="Live ops"
          subtitle="Online experts + active bookings across Jaipur"
          icon={<Activity className="h-4 w-4 text-success" />}
        >
          <LiveOpsMap />
        </Card>
      </section>

      {/* ── Secondary metrics ───────────────────────────────────── */}
      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <SmallMetric
          label="Total users"
          value={formatCount(metrics.users.total)}
          sub={`${formatCount(metrics.users.newToday)} new today`}
        />
        <SmallMetric
          label="Total experts"
          value={formatCount(metrics.pros.total)}
          sub={`${metrics.pros.kycComplete} fully verified`}
        />
        <SmallMetric
          label="KYC queue"
          value={formatCount(metrics.pros.kycPending)}
          sub="experts not yet fully verified"
          tone={metrics.pros.kycPending > 0 ? 'warning' : 'default'}
        />
      </section>
    </>
  );
}

// ─── Hero KPI card with sparkline + delta ─────────────────────────────

function HeroKpi({
  label,
  value,
  delta,
  deltaLabel,
  spark,
  tone,
}: {
  label: string;
  value: string;
  delta: number | null;
  deltaLabel: string;
  spark: Array<{ x: string; y: number }>;
  tone: 'brand' | 'success' | 'accent' | 'warning';
}) {
  const stroke =
    tone === 'brand'
      ? PALETTE.brand
      : tone === 'success'
        ? PALETTE.success
        : tone === 'accent'
          ? PALETTE.accentDeep
          : PALETTE.warning;
  return (
    <div className="card relative overflow-hidden p-5">
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-2 text-h1 font-bold leading-tight text-ink">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {delta !== null && <DeltaPill delta={delta} />}
        <span className="text-caption text-ink-subtle">{deltaLabel}</span>
      </div>
      {spark.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spark} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <Line
                type="monotone"
                dataKey="y"
                stroke={stroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function DeltaPill({ delta }: { delta: number }) {
  if (!Number.isFinite(delta) || delta === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-pill bg-surface-muted px-2 py-0.5 text-caption font-semibold text-ink-muted">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const up = delta > 0;
  const cls = up ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger';
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-caption font-semibold ${cls}`}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

// ─── Generic card wrapper ─────────────────────────────────────────────

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-h3 font-semibold text-ink">{title}</h2>
          </div>
          {subtitle && <p className="mt-0.5 text-small text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Funnel view ──────────────────────────────────────────────────────

const FUNNEL_ORDER = [
  { key: 'pending_match', label: 'Pending match', tone: 'bg-warning' },
  { key: 'matched', label: 'Matched', tone: 'bg-brand-light' },
  { key: 'confirmed', label: 'Confirmed', tone: 'bg-brand' },
  { key: 'pro_en_route', label: 'En route', tone: 'bg-brand' },
  { key: 'in_progress', label: 'In progress', tone: 'bg-accent' },
  { key: 'completed', label: 'Completed', tone: 'bg-success' },
  { key: 'cancelled_customer', label: 'Cancelled (cust)', tone: 'bg-danger' },
  { key: 'cancelled_pro', label: 'Cancelled (pro)', tone: 'bg-danger' },
  { key: 'disputed', label: 'Disputed', tone: 'bg-danger' },
];

function FunnelView({ funnel }: { funnel: Record<string, number> }) {
  const total = Object.values(funnel).reduce((a, b) => a + b, 0);
  if (total === 0) return <EmptyChart />;
  const max = Math.max(...Object.values(funnel), 1);

  return (
    <ul className="space-y-2.5">
      {FUNNEL_ORDER.map((s) => {
        const count = funnel[s.key] ?? 0;
        const width = (count / max) * 100;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <li key={s.key} className="grid grid-cols-[120px,1fr,80px] items-center gap-3">
            <span className="text-small text-ink-muted">{s.label}</span>
            <div className="relative h-7 overflow-hidden rounded bg-surface-muted">
              <div
                className={`h-full ${
                  s.tone === 'bg-brand-light' ? 'bg-[#3454A0]' : s.tone
                } transition-all duration-500`}
                style={{ width: `${Math.max(width, count > 0 ? 4 : 0)}%` }}
              />
              <span className="absolute inset-0 flex items-center px-3 text-small font-semibold text-ink-inverse mix-blend-difference">
                {count > 0 ? formatCount(count) : ''}
              </span>
            </div>
            <span className="text-right text-small font-semibold text-ink">{pct.toFixed(1)}%</span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Recent activity ──────────────────────────────────────────────────

function RecentList({ recent }: { recent: DashboardData['recent'] }) {
  if (recent.length === 0) {
    return <p className="px-3 py-12 text-center text-body text-ink-subtle">No bookings yet.</p>;
  }
  return (
    <ul className="divide-y divide-border">
      {recent.map((b) => (
        <li key={b.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusDot(b.status)}`}
            title={b.status}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-semibold text-ink">
              <Link href={`/bookings/${b.id}` as never} prefetch className="hover:text-brand">
                {b.bookingNumber}
              </Link>{' '}
              · {b.category.name}
            </p>
            <p className="truncate text-caption text-ink-subtle">
              {b.customer.fullName ?? b.customer.phone}
              {b.professional && ' → ' + (b.professional.user.fullName ?? '—')}
            </p>
          </div>
          <span className="hidden text-small font-semibold text-ink sm:inline">
            {formatPaise(b.totalAmount)}
          </span>
          <span className="text-caption text-ink-subtle">{formatRelativeDate(b.createdAt)}</span>
        </li>
      ))}
      <li className="pt-3">
        <Link
          href="/bookings"
          prefetch
          className="flex items-center justify-end gap-1 text-small font-semibold text-brand hover:text-brand-700"
        >
          View all bookings <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </li>
    </ul>
  );
}

// ─── Small bits ───────────────────────────────────────────────────────

function SmallMetric({
  label,
  value,
  sub,
  tone = 'default',
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'default' | 'warning';
}) {
  const accent = tone === 'warning' ? 'border-l-warning' : 'border-l-transparent';
  return (
    <div className={`card border-l-4 ${accent} p-5`}>
      <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">{label}</p>
      <p className="mt-1 text-h2 font-bold text-ink">{value}</p>
      <p className="mt-0.5 text-small text-ink-muted">{sub}</p>
    </div>
  );
}

function BadgePill({ badge }: { badge: string }) {
  const tone: Record<string, string> = {
    platinum: 'bg-brand text-ink-inverse',
    gold: 'bg-accent text-brand-900',
    silver: 'bg-ink-subtle/20 text-ink',
    bronze: 'bg-accent-700/15 text-accent-700',
    none: 'bg-surface-muted text-ink-subtle',
  };
  return <span className={`pill ${tone[badge] ?? tone['none']}`}>{badge}</span>;
}

function SkeletonList({ rows }: { rows: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3">
          <div className="h-7 w-7 animate-pulse rounded-full bg-surface-muted" />
          <div className="flex-1 animate-pulse rounded bg-surface-muted h-4" />
          <div className="h-4 w-16 animate-pulse rounded bg-surface-muted" />
        </li>
      ))}
    </ul>
  );
}

function ChartSkeleton() {
  return <div className="h-[260px] animate-pulse rounded bg-surface-muted" />;
}

function EmptyChart() {
  return (
    <div className="flex h-[200px] items-center justify-center text-small text-ink-subtle">
      <AlertTriangle className="mr-2 h-4 w-4" />
      Not enough data yet.
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────

const tooltipStyle = {
  background: 'white',
  border: '1px solid ' + PALETTE.border,
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};

function TrendsTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const date = new Date(label as string);
  const bookings = payload.find((p: any) => p.dataKey === 'bookings')?.value ?? 0;
  const gmv = payload.find((p: any) => p.dataKey === 'gmvPaise')?.value ?? 0;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 shadow-card">
      <p className="text-caption font-semibold text-ink">
        {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
      </p>
      <p className="text-small text-ink-muted">
        <span className="inline-block h-2 w-2 rounded-full bg-brand mr-1.5 align-middle" />
        {formatCount(bookings)} bookings
      </p>
      <p className="text-small text-ink-muted">
        <span
          className="inline-block h-2 w-2 rounded-full mr-1.5 align-middle"
          style={{ backgroundColor: PALETTE.accent }}
        />
        {formatPaise(gmv)} GMV
      </p>
    </div>
  );
}

function shortDay(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / prev) * 100;
}

function statusDot(status: string): string {
  const map: Record<string, string> = {
    pending_match: 'bg-warning',
    matched: 'bg-brand-400',
    confirmed: 'bg-brand',
    pro_en_route: 'bg-brand',
    otp_verified: 'bg-accent',
    in_progress: 'bg-accent',
    completed: 'bg-success',
    cancelled_customer: 'bg-danger',
    cancelled_pro: 'bg-danger',
    disputed: 'bg-danger',
  };
  return map[status] ?? 'bg-ink-subtle';
}

function payColor(status: string): string {
  const map: Record<string, string> = {
    paid: PALETTE.success,
    pending: PALETTE.warning,
    refunded: PALETTE.brand,
    partial_refund: PALETTE.brandLight,
    failed: PALETTE.danger,
  };
  return map[status] ?? PALETTE.inkMuted;
}
