import { PromoFormClient } from '../PromoFormClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default async function EditPromoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Edit promo code" subtitle="Changes apply to new redemptions only." />
      <PromoFormClient mode="edit" id={id} />
    </>
  );
}
