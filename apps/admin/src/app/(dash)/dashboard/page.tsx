import { DashboardClient } from './DashboardClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Overview" subtitle="What's happening on TrustNear right now." />
      <DashboardClient />
    </>
  );
}
