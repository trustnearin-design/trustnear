import { ExpertsClient } from './ExpertsClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function ExpertsPage() {
  return (
    <>
      <PageHeader
        title="Experts"
        subtitle="Verified TrustNear experts. Filter, inspect, override trust score."
      />
      <ExpertsClient />
    </>
  );
}
