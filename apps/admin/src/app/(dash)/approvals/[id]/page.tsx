import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { formatRelativeDate, formatPaise } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ApprovalActions } from './ApprovalActions';

/**
 * Per-pro review detail (Phase 3g). Side-by-side layout —
 * left = all submitted data, right = approve/reject action panel.
 * Admin can see everything in one screen without bouncing.
 */

type ReviewDetail = {
  id: string;
  approvalStatus: string;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectionFields: string[];
  gender: string | null;
  dob: string | null;
  languagesSpoken: string[];
  currentAddress: string | null;
  serviceRadiusKm: number;
  aadhaarVerified: boolean;
  aadhaarFullName: string | null;
  aadhaarLastFour: string | null;
  aadhaarDob: string | null;
  aadhaarPhotoUrl: string | null;
  panVerified: boolean;
  panNumber: string | null;
  panFullName: string | null;
  bankVerified: boolean;
  bankAccountLastFour: string | null;
  bankAccountHolderName: string | null;
  ifscCode: string | null;
  policeDocUrl: string | null;
  policeDocStatus: string;
  policeDocRejectionNote: string | null;
  user: {
    id: string;
    fullName: string;
    phone: string;
    email: string | null;
    profilePhoto: string | null;
    city: string;
    area: string | null;
    createdAt: string;
  };
  serviceOfferings: Array<{
    customPrice: number | null;
    experienceYears: number;
    category: {
      id: string;
      name: string;
      slug: string;
      basePrice: number;
      priceUnit: string;
    };
  }>;
  location: { latitude: string; longitude: string; updatedAt: string } | null;
  schedules: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
  }>;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const dynamic = 'force-dynamic';

export default async function ApprovalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pro = await apiFetch<ReviewDetail>(`/api/v1/admin/pros/${id}/review`);

  return (
    <>
      <div className="mb-2">
        <Link
          href="/approvals"
          className="inline-flex items-center gap-1 text-small text-ink-muted hover:text-ink"
        >
          <ChevronLeft size={16} /> Back to approvals
        </Link>
      </div>
      <PageHeader
        title={pro.user.fullName}
        subtitle={`${pro.user.phone}${pro.user.email ? ' · ' + pro.user.email : ''} · ${pro.user.city}${pro.user.area ? ' · ' + pro.user.area : ''}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left + center: data */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile photo + status */}
          <div className="card flex items-center gap-6 p-6">
            {pro.user.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pro.user.profilePhoto}
                alt={pro.user.fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-100 text-2xl font-bold text-brand-700">
                {pro.user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-h3 font-bold text-ink">{pro.user.fullName}</h2>
              <p className="text-small text-ink-muted">
                Submitted{' '}
                {pro.submittedForReviewAt ? formatRelativeDate(pro.submittedForReviewAt) : '—'}
              </p>
              <div className="mt-2">
                <StatusBadge status={pro.approvalStatus} />
              </div>
            </div>
          </div>

          {/* Rejection summary (only if rejected) */}
          {pro.approvalStatus === 'rejected' && pro.rejectionReason ? (
            <div className="card border-danger/30 bg-danger/5 p-5">
              <h3 className="mb-2 text-body font-bold text-danger">Previously rejected</h3>
              <p className="text-small text-ink">{pro.rejectionReason}</p>
              {pro.rejectionFields.length > 0 ? (
                <p className="mt-2 text-caption text-ink-muted">
                  Fields to fix: {pro.rejectionFields.join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Personal info */}
          <Section title="Personal info">
            <Field label="Gender" value={pro.gender ?? '—'} />
            <Field label="Date of birth" value={pro.dob?.slice(0, 10) ?? '—'} />
            <Field label="Languages" value={pro.languagesSpoken.join(', ') || '—'} />
            <Field label="Address" value={pro.currentAddress ?? '—'} wide />
          </Section>

          {/* Services */}
          <Section title={`Services (${pro.serviceOfferings.length})`}>
            {pro.serviceOfferings.length === 0 ? (
              <p className="text-small text-ink-muted">No services added.</p>
            ) : (
              <ul className="space-y-2">
                {pro.serviceOfferings.map((o) => (
                  <li
                    key={o.category.id}
                    className="flex items-center justify-between rounded-card bg-surface-muted px-3 py-2"
                  >
                    <div>
                      <p className="text-small font-semibold text-ink">{o.category.name}</p>
                      <p className="text-caption text-ink-subtle">
                        {o.experienceYears} {o.experienceYears === 1 ? 'year exp' : 'years exp'}
                      </p>
                    </div>
                    <p className="text-small font-bold text-brand-700">
                      {formatPaise(o.customPrice ?? o.category.basePrice)}{' '}
                      <span className="text-caption font-normal text-ink-subtle">
                        / {priceUnitLabel(o.category.priceUnit)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Working area */}
          <Section title="Working area">
            <Field
              label="Center location"
              value={
                pro.location
                  ? `${Number(pro.location.latitude).toFixed(5)}, ${Number(pro.location.longitude).toFixed(5)}`
                  : '—'
              }
            />
            <Field label="Service radius" value={`${pro.serviceRadiusKm} km`} />
          </Section>

          {/* Schedule */}
          <Section title="Weekly schedule">
            <div className="grid grid-cols-7 gap-2">
              {DAYS.map((label, idx) => {
                const slot = pro.schedules.find((s) => s.dayOfWeek === idx);
                const available = slot?.isAvailable ?? false;
                return (
                  <div
                    key={label}
                    className={
                      'rounded-card border p-2 text-center ' +
                      (available
                        ? 'border-brand-300 bg-brand-50'
                        : 'border-border bg-surface-muted')
                    }
                  >
                    <p className="text-caption font-bold text-ink">{label}</p>
                    <p
                      className={
                        'mt-1 text-caption ' + (available ? 'text-brand-700' : 'text-ink-subtle')
                      }
                    >
                      {available && slot ? `${slot.startTime}–${slot.endTime}` : 'Off'}
                    </p>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* KYC */}
          <Section title="KYC verification">
            <div className="space-y-3">
              <KycRow
                label="Aadhaar (DigiLocker)"
                verified={pro.aadhaarVerified}
                details={
                  pro.aadhaarVerified
                    ? `${pro.aadhaarFullName ?? '—'} · ****${pro.aadhaarLastFour ?? '—'} · DOB ${pro.aadhaarDob?.slice(0, 10) ?? '—'}`
                    : null
                }
              >
                {pro.aadhaarPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pro.aadhaarPhotoUrl}
                    alt="Aadhaar photo"
                    className="h-16 w-16 rounded-card object-cover"
                  />
                ) : null}
              </KycRow>
              <KycRow
                label="PAN"
                verified={pro.panVerified}
                details={
                  pro.panVerified ? `${pro.panFullName ?? '—'} · ${pro.panNumber ?? '—'}` : null
                }
              />
              <KycRow
                label="Bank account"
                verified={pro.bankVerified}
                details={
                  pro.bankVerified
                    ? `${pro.bankAccountHolderName ?? '—'} · ****${pro.bankAccountLastFour ?? '—'} · IFSC ${pro.ifscCode ?? '—'}`
                    : null
                }
              />
              <KycRow
                label="Police verification"
                verified={pro.policeDocStatus === 'approved'}
                details={`Status: ${pro.policeDocStatus.replace(/_/g, ' ')}${pro.policeDocRejectionNote ? ` · ${pro.policeDocRejectionNote}` : ''}`}
              >
                {pro.policeDocUrl ? (
                  <a
                    href={pro.policeDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-caption font-semibold text-brand-700 hover:underline"
                  >
                    View document →
                  </a>
                ) : null}
              </KycRow>
            </div>
          </Section>
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <ApprovalActions professionalId={pro.id} currentStatus={pro.approvalStatus} />
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h3 className="mb-4 text-body-large font-bold text-ink">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={'flex gap-3 ' + (wide ? 'flex-col' : 'items-baseline')}>
      <p className="min-w-[120px] text-caption font-bold uppercase tracking-wide text-ink-subtle">
        {label}
      </p>
      <p className="text-small text-ink">{value}</p>
    </div>
  );
}

function KycRow({
  label,
  verified,
  details,
  children,
}: {
  label: string;
  verified: boolean;
  details: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-card border border-border bg-surface-muted p-3">
      <span
        className={
          'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-caption font-bold ' +
          (verified ? 'bg-success text-white' : 'bg-ink-subtle/20 text-ink-subtle')
        }
      >
        {verified ? '✓' : '—'}
      </span>
      <div className="flex-1">
        <p className="text-small font-bold text-ink">{label}</p>
        {details ? <p className="mt-0.5 text-caption text-ink-muted">{details}</p> : null}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted_for_review: { label: 'Pending review', cls: 'bg-warning/20 text-warning' },
    approved: { label: 'Approved', cls: 'bg-success/20 text-success' },
    rejected: { label: 'Rejected', cls: 'bg-danger/20 text-danger' },
    draft: { label: 'Draft', cls: 'bg-surface-muted text-ink-subtle' },
  };
  const entry = map[status] ?? { label: status, cls: 'bg-surface-muted text-ink-subtle' };
  return (
    <span className={`inline-block rounded-pill px-3 py-1 text-small font-bold ${entry.cls}`}>
      {entry.label}
    </span>
  );
}

function priceUnitLabel(unit: string): string {
  switch (unit) {
    case 'per_hour':
      return 'hour';
    case 'per_visit':
      return 'visit';
    case 'per_day':
      return 'day';
    case 'fixed':
      return 'fixed';
    default:
      return unit;
  }
}
