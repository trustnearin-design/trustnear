import { DisputesClient } from './DisputesClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function DisputesPage() {
  return (
    <>
      <PageHeader
        title="Disputes"
        subtitle="Bookings flagged for review. Resolve in favour of customer (refund), expert (close), or split."
      />
      <DisputesClient />
    </>
  );
}
