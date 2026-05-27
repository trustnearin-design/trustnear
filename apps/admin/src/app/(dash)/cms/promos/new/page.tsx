import { PromoFormClient } from '../PromoFormClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function NewPromoPage() {
  return (
    <>
      <PageHeader
        title="New promo code"
        subtitle="Coupon validation happens at booking-creation time on the API."
      />
      <PromoFormClient mode="create" />
    </>
  );
}
