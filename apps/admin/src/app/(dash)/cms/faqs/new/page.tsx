import { FaqFormClient } from '../FaqFormClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function NewFaqPage() {
  return (
    <>
      <PageHeader
        title="New FAQ"
        subtitle="Published FAQs appear in the customer + pro help center."
      />
      <FaqFormClient mode="create" />
    </>
  );
}
