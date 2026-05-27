import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';

type KycQueueData = {
  pros: Array<{
    id: string;
    professionalTitle: string | null;
    trustBadge: string;
    trustScore: string | number;
    aadhaarVerified: boolean;
    panVerified: boolean;
    bankVerified: boolean;
    policeVerified: boolean;
    verifiedCount: number;
    kycUpdatedAt: string | null;
    createdAt: string;
    user: {
      id: string;
      fullName: string | null;
      phone: string;
      profilePhoto: string | null;
      city: string | null;
    };
  }>;
};

type Filter = 'pending' | 'partial' | 'complete' | 'all';
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'partial', label: 'In progress' },
  { key: 'pending', label: 'Not started' },
  { key: 'complete', label: 'Verified' },
  { key: 'all', label: 'All' },
];

export const dynamic = 'force-dynamic';

export default async function KycPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const activeFilter = (FILTERS.find((f) => f.key === params.filter)?.key ?? 'partial') as Filter;
  const { pros } = await apiFetch<KycQueueData>(`/api/v1/admin/kyc?filter=${activeFilter}`);

  return (
    <>
      <PageHeader
        title="KYC Queue"
        subtitle="Review expert verifications. Approve police checks manually."
      />

      {/* Filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/kyc?filter=${f.key}` as never}
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

      {/* List */}
      {pros.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-body text-ink-subtle">No experts in this bucket.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <ul className="divide-y divide-border">
            {pros.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/kyc/${p.id}` as never}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-surface-muted"
                >
                  <Avatar name={p.user.fullName ?? p.user.phone} photo={p.user.profilePhoto} />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-body font-semibold text-ink">
                      {p.user.fullName ?? 'Unnamed'}{' '}
                      <span className="text-ink-subtle">· {p.user.phone}</span>
                    </p>
                    <p className="truncate text-small text-ink-muted">
                      {p.professionalTitle ?? 'No title'}
                      {p.user.city && ` · ${p.user.city}`}
                    </p>
                  </div>
                  <KycChecklist
                    aadhaar={p.aadhaarVerified}
                    pan={p.panVerified}
                    bank={p.bankVerified}
                    police={p.policeVerified}
                  />
                  <div className="w-28 text-right">
                    <p className="text-small font-semibold text-ink">{p.verifiedCount} / 4</p>
                    <p className="text-caption text-ink-subtle">
                      {p.kycUpdatedAt ? formatRelativeDate(p.kycUpdatedAt) : 'not started'}
                    </p>
                  </div>
                  <span className="text-h3 text-ink-subtle">→</span>
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
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo} alt={name} className="h-11 w-11 rounded-full object-cover" />;
  }
  return (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-small font-semibold text-brand">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function KycChecklist({
  aadhaar,
  pan,
  bank,
  police,
}: {
  aadhaar: boolean;
  pan: boolean;
  bank: boolean;
  police: boolean;
}) {
  const items: [string, boolean][] = [
    ['Aadhaar', aadhaar],
    ['PAN', pan],
    ['Bank', bank],
    ['Police', police],
  ];
  return (
    <div className="hidden gap-1.5 md:flex">
      {items.map(([label, ok]) => (
        <span
          key={label}
          title={label}
          className={
            'inline-flex h-6 w-6 items-center justify-center rounded-full text-caption font-bold ' +
            (ok ? 'bg-success/15 text-success' : 'bg-surface-muted text-ink-subtle')
          }
        >
          {ok ? '✓' : '·'}
        </span>
      ))}
    </div>
  );
}
