import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { VerificationToggle } from './VerificationToggle';

type KycDetail = {
  id: string;
  professionalTitle: string | null;
  bio: string | null;
  yearsExperience: number;
  trustScore: string | number;
  trustBadge: string;
  availabilityStatus: string;
  aadhaarVerified: boolean;
  aadhaarLastFour: string | null;
  aadhaarFullName: string | null;
  aadhaarDob: string | null;
  aadhaarPhotoUrl: string | null;
  panVerified: boolean;
  panNumber: string | null;
  panFullName: string | null;
  bankVerified: boolean;
  bankAccountLastFour: string | null;
  bankAccountHolderName: string | null;
  ifscCode: string | null;
  policeVerified: boolean;
  faceVerified: boolean;
  kycUpdatedAt: string | null;
  createdAt: string;
  totalBookings: number;
  verifiedCount: number;
  user: {
    id: string;
    fullName: string | null;
    phone: string;
    email: string | null;
    profilePhoto: string | null;
    city: string | null;
    area: string | null;
    createdAt: string;
  };
};

export const dynamic = 'force-dynamic';

export default async function KycDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await apiFetch<KycDetail>(`/api/v1/admin/kyc/${id}`);

  return (
    <>
      <Link href="/kyc" className="btn-ghost mb-3 -ml-2">
        ← Back to queue
      </Link>
      <PageHeader
        title={pro.user.fullName ?? 'Unnamed expert'}
        subtitle={`${pro.user.phone}${pro.user.city ? ` · ${pro.user.city}` : ''}`}
        action={
          <span
            className={
              'pill ' +
              (pro.verifiedCount === 4
                ? 'bg-success/15 text-success'
                : 'bg-warning/15 text-warning')
            }
          >
            {pro.verifiedCount} of 4 verified
          </span>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: meta */}
        <aside className="card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={pro.user.fullName ?? pro.user.phone} photo={pro.user.profilePhoto} />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-ink">
                {pro.professionalTitle ?? 'No title set'}
              </p>
              <p className="text-small text-ink-muted">
                Trust {Number(pro.trustScore).toFixed(1)} · {pro.trustBadge}
              </p>
            </div>
          </div>

          <dl className="space-y-3 text-small">
            <Row label="Phone" value={pro.user.phone} />
            <Row label="Email" value={pro.user.email ?? '—'} />
            <Row label="Area" value={pro.user.area ?? '—'} />
            <Row label="Experience" value={`${pro.yearsExperience} years`} />
            <Row label="Total bookings" value={String(pro.totalBookings)} />
            <Row label="Availability" value={pro.availabilityStatus} />
            <Row label="Joined" value={formatRelativeDate(pro.user.createdAt)} />
            <Row
              label="KYC updated"
              value={pro.kycUpdatedAt ? formatRelativeDate(pro.kycUpdatedAt) : 'never'}
            />
          </dl>
        </aside>

        {/* Right: verification grid */}
        <div className="space-y-6 lg:col-span-2">
          <VerificationCard
            id={pro.id}
            title="Aadhaar"
            field="aadhaar"
            verified={pro.aadhaarVerified}
            primary={pro.aadhaarFullName ?? '—'}
            secondary={`xxxx-xxxx-${pro.aadhaarLastFour ?? '----'}${pro.aadhaarDob ? ` · DOB ${pro.aadhaarDob.slice(0, 10)}` : ''}`}
            photoUrl={pro.aadhaarPhotoUrl}
          />
          <VerificationCard
            id={pro.id}
            title="PAN"
            field="pan"
            verified={pro.panVerified}
            primary={pro.panFullName ?? '—'}
            secondary={pro.panNumber ?? '—'}
          />
          <VerificationCard
            id={pro.id}
            title="Bank account"
            field="bank"
            verified={pro.bankVerified}
            primary={pro.bankAccountHolderName ?? '—'}
            secondary={`xxxxxx${pro.bankAccountLastFour ?? '----'}${pro.ifscCode ? ` · ${pro.ifscCode}` : ''}`}
          />
          <VerificationCard
            id={pro.id}
            title="Police verification"
            field="police"
            verified={pro.policeVerified}
            primary={pro.policeVerified ? 'Verified by admin' : 'Awaiting manual review'}
            secondary="Police verification is approved manually by the TrustNear ops team."
            allowToggle
          />
        </div>
      </div>
    </>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} className="h-14 w-14 rounded-full object-cover" />;
  }
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-h3 font-semibold text-brand">
      {name.charAt(0).toUpperCase()}
    </span>
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

function VerificationCard({
  id,
  title,
  field,
  verified,
  primary,
  secondary,
  photoUrl,
  allowToggle = false,
}: {
  id: string;
  title: string;
  field: 'aadhaar' | 'pan' | 'bank' | 'police';
  verified: boolean;
  primary: string;
  secondary: string;
  photoUrl?: string | null;
  allowToggle?: boolean;
}) {
  return (
    <article className="card p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-subtle">
            {title}
          </p>
          <h3 className="mt-1 text-h3 font-semibold text-ink">{primary}</h3>
          <p className="mt-1 text-small text-ink-muted">{secondary}</p>
        </div>
        <span
          className={
            'pill ' + (verified ? 'bg-success/15 text-success' : 'bg-surface-muted text-ink-muted')
          }
        >
          {verified ? '✓ Verified' : 'Pending'}
        </span>
      </header>

      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Aadhaar photo"
          className="mb-4 h-32 w-32 rounded-card border border-border object-cover"
        />
      )}

      {(allowToggle || field === 'aadhaar' || field === 'pan' || field === 'bank') && (
        <VerificationToggle
          professionalId={id}
          field={field}
          currentValue={verified}
          breakGlass={!allowToggle}
        />
      )}
    </article>
  );
}
