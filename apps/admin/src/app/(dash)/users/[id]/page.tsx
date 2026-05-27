import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatPaise, formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { UserActions } from './UserActions';

type UserDetail = {
  id: string;
  phone: string;
  fullName: string | null;
  email: string | null;
  role: 'customer' | 'professional' | 'admin';
  city: string | null;
  area: string | null;
  isActive: boolean;
  isVerified: boolean;
  walletBalance: number;
  loyaltyPoints: number;
  preferredLang: string;
  referralCode: string;
  createdAt: string;
  updatedAt: string;
  _count: { customerBookings: number };
  professional: {
    id: string;
    professionalTitle: string | null;
    trustScore: string | number;
    trustBadge: string;
    availabilityStatus: string;
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    policeVerified: boolean;
    totalBookings: number;
  } | null;
};

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await apiFetch<UserDetail>(`/api/v1/admin/users/${id}`);

  return (
    <>
      <Link href="/users" className="btn-ghost mb-3 -ml-2">
        ← Back to users
      </Link>
      <PageHeader
        title={user.fullName ?? 'Unnamed'}
        subtitle={`${user.phone} · joined ${formatRelativeDate(user.createdAt)}`}
        action={
          !user.isActive ? <span className="pill bg-danger/10 text-danger">Suspended</span> : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <aside className="card p-6">
          <dl className="space-y-3 text-small">
            <Row label="Role" value={user.role} />
            <Row label="Phone" value={user.phone} />
            <Row label="Email" value={user.email ?? '—'} />
            <Row label="City" value={user.city ?? '—'} />
            <Row label="Area" value={user.area ?? '—'} />
            <Row label="Language" value={user.preferredLang.toUpperCase()} />
            <Row label="Referral code" value={user.referralCode} />
            <Row label="Wallet" value={formatPaise(user.walletBalance)} />
            <Row label="Loyalty pts" value={String(user.loyaltyPoints)} />
            <Row label="Total bookings" value={String(user._count.customerBookings)} />
            <Row label="Verified" value={user.isVerified ? 'Yes' : 'No'} />
          </dl>
        </aside>

        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="text-h3 font-semibold text-ink">Admin actions</h2>
            <p className="mt-1 text-small text-ink-muted">
              Every change is recorded in the audit log.
            </p>
            <div className="mt-4">
              <UserActions userId={user.id} currentRole={user.role} isActive={user.isActive} />
            </div>
          </section>

          {user.professional && (
            <section className="card p-6">
              <h2 className="text-h3 font-semibold text-ink">Expert profile</h2>
              <p className="mt-1 text-small text-ink-muted">
                {user.professional.professionalTitle ?? 'No title'} · {user.professional.trustBadge}{' '}
                · Trust {Number(user.professional.trustScore).toFixed(1)}
              </p>
              <div className="mt-4 grid grid-cols-4 gap-3 text-center">
                <KycCell label="Aadhaar" ok={user.professional.aadhaarVerified} />
                <KycCell label="PAN" ok={user.professional.panVerified} />
                <KycCell label="Bank" ok={user.professional.bankVerified} />
                <KycCell label="Police" ok={user.professional.policeVerified} />
              </div>
              <Link
                href={`/experts/${user.professional.id}` as never}
                className="btn-ghost mt-4 inline-block"
              >
                Open full expert profile →
              </Link>
            </section>
          )}
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

function KycCell({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={
        'rounded-card p-3 ' +
        (ok ? 'bg-success/10 text-success' : 'bg-surface-muted text-ink-subtle')
      }
    >
      <p className="text-h3 font-bold">{ok ? '✓' : '·'}</p>
      <p className="text-caption font-semibold uppercase tracking-wider">{label}</p>
    </div>
  );
}
