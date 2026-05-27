import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { TrustOverride } from './TrustOverride';
import { ExpertEditPanel } from './ExpertEditPanel';

type ExpertDetail = {
  id: string;
  professionalTitle: string | null;
  bio: string | null;
  yearsExperience: number;
  trustScore: string | number;
  trustBadge: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
  availabilityStatus: string;
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeVerified: boolean;
  totalBookings: number;
  repeatClientCount: number;
  cancellationCount: number;
  avgResponseTimeSeconds: number;
  isSubscriptionActive: boolean;
  subscriptionPlan: string;
  portfolioUrls: string[];
  certifications: string[];
  panFullName: string | null;
  panNumber: string | null;
  aadhaarFullName: string | null;
  aadhaarLastFour: string | null;
  bankAccountHolderName: string | null;
  ifscCode: string | null;
  kycUpdatedAt: string | null;
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
  serviceOfferings: Array<{
    id: string;
    isActive: boolean;
    customPrice: number | null;
    category: { id: string; name: string; slug: string };
  }>;
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
  _count: { bookings: number; reviews: number; trustEvents: number };
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dynamic = 'force-dynamic';

export default async function ExpertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await apiFetch<ExpertDetail>(`/api/v1/admin/experts/${id}`);

  return (
    <>
      <Link href="/experts" className="btn-ghost mb-3 -ml-2">
        ← Back to experts
      </Link>
      <PageHeader
        title={e.user.fullName ?? 'Unnamed expert'}
        subtitle={`${e.professionalTitle ?? 'No title'} · ${e.user.city ?? ''}`}
        action={
          <Link href={`/users/${e.user.id}` as never} className="btn-ghost">
            View user account →
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: meta */}
        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">At a glance</h2>
            <dl className="mt-3 space-y-3 text-small">
              <Row label="Phone" value={e.user.phone} />
              <Row label="Trust score" value={Number(e.trustScore).toFixed(1)} />
              <Row label="Trust badge" value={e.trustBadge} />
              <Row label="Availability" value={e.availabilityStatus} />
              <Row label="Experience" value={`${e.yearsExperience} years`} />
              <Row label="Total bookings" value={String(e.totalBookings)} />
              <Row label="Repeat clients" value={String(e.repeatClientCount)} />
              <Row label="Cancellations" value={String(e.cancellationCount)} />
              <Row
                label="Avg response"
                value={e.avgResponseTimeSeconds ? `${Math.round(e.avgResponseTimeSeconds)}s` : '—'}
              />
              <Row label="Reviews" value={String(e._count.reviews)} />
              <Row label="Joined" value={formatRelativeDate(e.createdAt)} />
              <Row
                label="Subscription"
                value={e.isSubscriptionActive ? e.subscriptionPlan : 'Free'}
              />
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Schedule</h2>
            <ul className="mt-3 space-y-1.5 text-small">
              {DAYS.map((d, i) => {
                const s = e.schedules.find((x) => x.dayOfWeek === i);
                return (
                  <li key={d} className="flex justify-between">
                    <span className="text-ink-muted">{d}</span>
                    <span className="font-medium text-ink">
                      {s ? `${s.startTime} – ${s.endTime}` : '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        {/* Right */}
        <div className="space-y-6 lg:col-span-2">
          <ExpertEditPanel
            expertId={e.id}
            initial={{
              fullName: e.user.fullName ?? '',
              profilePhoto: e.user.profilePhoto ?? '',
              professionalTitle: e.professionalTitle ?? '',
              bio: e.bio ?? '',
              yearsExperience: e.yearsExperience,
              portfolioUrls: e.portfolioUrls,
              certifications: e.certifications,
              introVideoUrl: '',
            }}
          />

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Trust override</h2>
            <p className="mt-1 text-small text-ink-muted">
              Manual correction or onboarding boost. Logged in audit.
            </p>
            <div className="mt-4">
              <TrustOverride
                expertId={e.id}
                currentScore={Number(e.trustScore)}
                currentBadge={e.trustBadge}
              />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">KYC</h2>
            <div className="mt-3 grid grid-cols-4 gap-3">
              <KycCell label="Aadhaar" ok={e.aadhaarVerified} sub={e.aadhaarFullName} />
              <KycCell label="PAN" ok={e.panVerified} sub={e.panFullName} />
              <KycCell label="Bank" ok={e.bankVerified} sub={e.bankAccountHolderName} />
              <KycCell label="Police" ok={e.policeVerified} sub={null} />
            </div>
            <Link href={`/kyc/${e.id}` as never} className="btn-ghost mt-4 inline-block">
              Manage KYC →
            </Link>
          </section>

          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">
              Services offered ({e.serviceOfferings.length})
            </h2>
            {e.serviceOfferings.length === 0 ? (
              <p className="mt-2 text-small text-ink-subtle">No services yet.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {e.serviceOfferings.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-card border border-border px-4 py-2"
                  >
                    <span className="text-body font-medium text-ink">
                      {s.category.name}
                      {!s.isActive && (
                        <span className="ml-2 pill bg-danger/10 text-danger">Inactive</span>
                      )}
                    </span>
                    {s.customPrice !== null && (
                      <span className="text-small text-ink-muted">
                        Custom: {formatPaise(s.customPrice)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function KycCell({ label, ok, sub }: { label: string; ok: boolean; sub: string | null }) {
  return (
    <div
      className={
        'rounded-card p-3 text-center ' +
        (ok ? 'bg-success/10 text-success' : 'bg-surface-muted text-ink-subtle')
      }
    >
      <p className="text-h3 font-bold">{ok ? '✓' : '·'}</p>
      <p className="text-caption font-semibold uppercase tracking-wider">{label}</p>
      {sub && <p className="mt-1 truncate text-caption text-ink-muted">{sub}</p>}
    </div>
  );
}
