import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';

/**
 * Pro Onboarding Approvals queue (Phase 3g).
 *
 * The default filter is `submitted_for_review` — pros awaiting admin
 * review after completing the wizard. Other tabs let admins audit
 * recently approved/rejected pros without leaving the page.
 *
 * Each row is the at-a-glance card the admin needs to triage: photo,
 * name+phone, primary service, KYC chips, submitted time. Click → full
 * review detail page.
 */

type ApprovalRow = {
  professionalId: string;
  userId: string;
  fullName: string;
  phone: string;
  profilePhoto: string | null;
  approvalStatus: string;
  submittedForReviewAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  rejectionFields: string[];
  aadhaarVerified: boolean;
  panVerified: boolean;
  bankVerified: boolean;
  policeDocStatus: string;
  primaryCategory: string | null;
  city: string;
  area: string | null;
};

type ApprovalsData = {
  rows: ApprovalRow[];
  total: number;
};

type Filter = 'submitted_for_review' | 'rejected' | 'approved' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'submitted_for_review', label: 'Pending review' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

export const dynamic = 'force-dynamic';

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = (FILTERS.find((f) => f.key === params.status)?.key ??
    'submitted_for_review') as Filter;

  const { rows, total } = await apiFetch<ApprovalsData>(
    `/api/v1/admin/pros/pending?status=${activeFilter}&limit=50`,
  );

  return (
    <>
      <PageHeader
        title="Pro Approvals"
        subtitle={`Review onboarding submissions — ${total} ${activeFilter.replace(/_/g, ' ')}.`}
      />

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/approvals?status=${f.key}` as never}
            className={
              'rounded-pill px-4 py-2 text-small font-semibold transition ' +
              (activeFilter === f.key
                ? 'bg-brand text-ink-inverse'
                : 'bg-surface text-ink-muted hover:bg-surface-muted hover:text-ink')
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">
            No pros in this bucket.
            {activeFilter === 'submitted_for_review' &&
              ' Onboarding wizard submissions will land here.'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.professionalId}>
                <Link
                  href={`/approvals/${p.professionalId}` as never}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-surface-muted"
                >
                  <Avatar name={p.fullName} photo={p.profilePhoto} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-body font-semibold text-ink">
                      {p.fullName} <span className="text-ink-subtle">· {p.phone}</span>
                    </p>
                    <p className="truncate text-small text-ink-muted">
                      {p.primaryCategory ?? 'No category'} · {p.city}
                      {p.area && ` · ${p.area}`}
                    </p>
                    {p.approvalStatus === 'rejected' && p.rejectionReason ? (
                      <p className="mt-1 truncate text-caption text-danger">
                        Rejected: {p.rejectionReason}
                      </p>
                    ) : null}
                  </div>
                  <KycChips
                    aadhaar={p.aadhaarVerified}
                    pan={p.panVerified}
                    bank={p.bankVerified}
                    police={p.policeDocStatus}
                  />
                  <div className="ml-2 hidden text-right md:block">
                    <StatusBadge status={p.approvalStatus} />
                    <p className="mt-1 text-caption text-ink-subtle">
                      {p.submittedForReviewAt ? formatRelativeDate(p.submittedForReviewAt) : '—'}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  return photo ? (
    <span className="inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-surface-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={name} className="h-full w-full object-cover" />
    </span>
  ) : (
    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-body font-semibold text-brand-700">
      {(name ?? '?').charAt(0).toUpperCase()}
    </span>
  );
}

function KycChips({
  aadhaar,
  pan,
  bank,
  police,
}: {
  aadhaar: boolean;
  pan: boolean;
  bank: boolean;
  police: string;
}) {
  const items: Array<{ label: string; ok: boolean; pending?: boolean }> = [
    { label: 'A', ok: aadhaar },
    { label: 'P', ok: pan },
    { label: 'B', ok: bank },
    {
      label: 'V',
      ok: police === 'approved',
      pending: police === 'pending_review',
    },
  ];
  return (
    <div className="hidden gap-1 sm:flex">
      {items.map((i) => (
        <span
          key={i.label}
          title={`${i.label === 'A' ? 'Aadhaar' : i.label === 'P' ? 'PAN' : i.label === 'B' ? 'Bank' : 'Police'} ${
            i.ok ? 'verified' : i.pending ? 'pending' : 'not done'
          }`}
          className={
            'inline-flex h-7 w-7 items-center justify-center rounded-md text-caption font-bold ' +
            (i.ok
              ? 'bg-success/20 text-success'
              : i.pending
                ? 'bg-warning/20 text-warning'
                : 'bg-surface-muted text-ink-subtle')
          }
        >
          {i.label}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    submitted_for_review: { label: 'Pending', cls: 'bg-warning/20 text-warning' },
    approved: { label: 'Approved', cls: 'bg-success/20 text-success' },
    rejected: { label: 'Rejected', cls: 'bg-danger/20 text-danger' },
    draft: { label: 'Draft', cls: 'bg-surface-muted text-ink-subtle' },
  };
  const entry = map[status] ?? { label: status, cls: 'bg-surface-muted text-ink-subtle' };
  return (
    <span className={`inline-block rounded-pill px-2.5 py-0.5 text-caption font-bold ${entry.cls}`}>
      {entry.label}
    </span>
  );
}
