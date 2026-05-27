import { ReviewsClient } from './ReviewsClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function ReviewsPage() {
  return (
    <>
      <PageHeader
        title="Reviews"
        subtitle="Customer reviews across experts. Hide what violates guidelines, surface low ratings."
      />
      <ReviewsClient />
    </>
  );
}
