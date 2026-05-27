import { PayoutsClient } from './PayoutsClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function PayoutsPage() {
  return (
    <>
      <PageHeader
        title="Payouts & wallet"
        subtitle="Pro earnings overview + platform-wide wallet ledger. Real-money ground truth."
      />
      <PayoutsClient />
    </>
  );
}
