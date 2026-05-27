import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { BannerForm, type BannerFormValues } from '../BannerForm';

type BannerDetail = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  placement: BannerFormValues['placement'];
  ctaText: string | null;
  linkKind: BannerFormValues['linkKind'];
  linkTarget: string | null;
  startsAt: string | null;
  endsAt: string | null;
  sortOrder: number;
  isActive: boolean;
};

export const dynamic = 'force-dynamic';

/** Trim ISO datetime to the local-input format "YYYY-MM-DDTHH:mm". */
function toLocalDt(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 16);
}

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const banner = await apiFetch<BannerDetail>(`/api/v1/admin/banners/${id}`);

  const initial: BannerFormValues = {
    title: banner.title,
    subtitle: banner.subtitle ?? '',
    imageUrl: banner.imageUrl,
    placement: banner.placement,
    ctaText: banner.ctaText ?? '',
    linkKind: banner.linkKind,
    linkTarget: banner.linkTarget ?? '',
    startsAt: toLocalDt(banner.startsAt),
    endsAt: toLocalDt(banner.endsAt),
    sortOrder: banner.sortOrder,
    isActive: banner.isActive,
  };

  return (
    <>
      <Link href="/banners" className="btn-ghost mb-3 -ml-2">
        ← Back to banners
      </Link>
      <PageHeader title={banner.title} subtitle={`Editing banner · ${banner.placement}`} />
      <BannerForm mode="edit" initial={initial} bannerId={id} />
    </>
  );
}
