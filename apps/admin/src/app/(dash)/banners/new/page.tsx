import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { BannerForm, type BannerFormValues } from '../BannerForm';

type Placement = BannerFormValues['placement'];

const VALID: Placement[] = ['home_hero', 'home_strip', 'category_top', 'booking_complete'];

export default async function NewBannerPage({
  searchParams,
}: {
  searchParams: Promise<{ placement?: string }>;
}) {
  const params = await searchParams;
  const placement = VALID.includes(params.placement as Placement)
    ? (params.placement as Placement)
    : 'home_hero';

  const initial: BannerFormValues = {
    title: '',
    subtitle: '',
    imageUrl: '',
    placement,
    ctaText: '',
    linkKind: 'none',
    linkTarget: '',
    startsAt: '',
    endsAt: '',
    sortOrder: 0,
    isActive: true,
  };

  return (
    <>
      <Link href="/banners" className="btn-ghost mb-3 -ml-2">
        ← Back to banners
      </Link>
      <PageHeader
        title="New banner"
        subtitle="Goes live as soon as you save — schedule is optional."
      />
      <BannerForm mode="create" initial={initial} />
    </>
  );
}
