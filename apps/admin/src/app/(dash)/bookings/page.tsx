import { BookingsClient } from './BookingsClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function BookingsPage() {
  return (
    <>
      <PageHeader
        title="Bookings"
        subtitle="Live bookings across the platform. Filter, inspect, intervene."
      />
      <BookingsClient />
    </>
  );
}
