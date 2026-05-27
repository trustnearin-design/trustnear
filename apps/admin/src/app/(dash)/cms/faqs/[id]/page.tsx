import { FaqFormClient } from '../FaqFormClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default async function EditFaqPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <>
      <PageHeader title="Edit FAQ" subtitle="Changes go live immediately for published items." />
      <FaqFormClient mode="edit" id={id} />
    </>
  );
}
