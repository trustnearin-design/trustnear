import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { formatRelativeDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  placement: 'home_hero' | 'home_strip' | 'category_top' | 'booking_complete';
  ctaText: string | null;
  linkKind: 'none' | 'category' | 'external' | 'promo';
  linkTarget: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const PLACEMENT_LABEL: Record<Banner['placement'], string> = {
  home_hero: 'Home — hero slider',
  home_strip: 'Home — promotional strip',
  category_top: 'Category page — top',
  booking_complete: 'Booking complete',
};

export const dynamic = 'force-dynamic';

export default async function BannersPage() {
  const { banners } = await apiFetch<{ banners: Banner[] }>('/api/v1/admin/banners');

  const byPlacement = new Map<string, Banner[]>();
  for (const b of banners) {
    const list = byPlacement.get(b.placement) ?? [];
    list.push(b);
    byPlacement.set(b.placement, list);
  }

  const placements: Banner['placement'][] = [
    'home_hero',
    'home_strip',
    'category_top',
    'booking_complete',
  ];

  return (
    <>
      <PageHeader
        title="Banners"
        subtitle="Promotional banners shown across the customer app. Schedule + activate + sort."
        action={
          <Link href="/banners/new" className="btn-primary">
            + New banner
          </Link>
        }
      />

      {banners.length === 0 ? (
        <div className="card">
          <EmptyState
            mascot="toolbox"
            title="Abhi koi banner nahi hai"
            subtitle="Customer home par dikhane ke liye pehla banner upload karein."
            action={
              <Link href="/banners/new" className="btn-primary text-small">
                + Create first banner
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-5">
          {placements.map((p) => {
            const list = byPlacement.get(p) ?? [];
            return (
              <section key={p} className="card overflow-hidden">
                <header className="flex items-center justify-between border-b border-border bg-surface-muted px-5 py-3">
                  <div>
                    <h2 className="text-h3 font-semibold text-ink">{PLACEMENT_LABEL[p]}</h2>
                    <p className="text-caption text-ink-subtle">
                      {list.length} banner{list.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <Link
                    href={`/banners/new?placement=${p}` as never}
                    className="btn-ghost text-small"
                  >
                    + Add here
                  </Link>
                </header>
                {list.length === 0 ? (
                  <p className="px-6 py-8 text-center text-small text-ink-subtle">
                    No banners in this placement.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {list.map((b) => (
                      <li key={b.id}>
                        <Link
                          href={`/banners/${b.id}` as never}
                          className="flex items-center gap-4 px-5 py-4 transition hover:bg-surface-muted"
                        >
                          <BannerThumb url={b.imageUrl} alt={b.title} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-body font-semibold text-ink">{b.title}</p>
                              {!b.isActive && (
                                <span className="pill bg-danger/10 text-danger">Inactive</span>
                              )}
                              {!isLive(b) && b.isActive && (
                                <span className="pill bg-warning/10 text-warning">
                                  {scheduleHint(b)}
                                </span>
                              )}
                              {isLive(b) && (
                                <span className="pill bg-success/10 text-success">Live</span>
                              )}
                            </div>
                            <p className="truncate text-small text-ink-muted">
                              {b.subtitle ?? <em className="text-ink-subtle">No subtitle</em>}
                            </p>
                            <p className="mt-0.5 text-caption text-ink-subtle">
                              sort {b.sortOrder} ·{' '}
                              {b.linkKind === 'none'
                                ? 'no action'
                                : `${b.linkKind} → ${b.linkTarget ?? '?'}`}{' '}
                              · updated {formatRelativeDate(b.updatedAt)}
                            </p>
                          </div>
                          <span className="text-h3 text-ink-subtle">→</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function BannerThumb({ url, alt }: { url: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      className="h-14 w-24 shrink-0 rounded-card border border-border bg-surface-muted object-cover"
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.opacity = '0.3';
      }}
    />
  );
}

function isLive(b: Banner): boolean {
  if (!b.isActive) return false;
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return false;
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return false;
  return true;
}

function scheduleHint(b: Banner): string {
  const now = Date.now();
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'Scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() < now) return 'Expired';
  return 'Scheduled';
}
