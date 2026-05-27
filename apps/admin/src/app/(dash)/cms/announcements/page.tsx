import { AnnouncementsClient } from './AnnouncementsClient';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AnnouncementsPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Announcements"
          subtitle="Broadcast a push notification to all users, customers, or experts."
        />
        <Link
          href={'/cms/announcements/new' as never}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New announcement
        </Link>
      </div>
      <AnnouncementsClient />
    </>
  );
}
