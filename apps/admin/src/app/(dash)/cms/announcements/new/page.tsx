import { AnnouncementNewClient } from './AnnouncementNewClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function NewAnnouncementPage() {
  return (
    <>
      <PageHeader
        title="New announcement"
        subtitle="Send a one-off push to all users, customers, or experts."
      />
      <AnnouncementNewClient />
    </>
  );
}
