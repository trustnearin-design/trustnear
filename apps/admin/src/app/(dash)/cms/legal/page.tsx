import { LegalClient } from './LegalClient';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LegalPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Legal pages"
          subtitle="Terms, Privacy, Refund. Each save creates a new version — old versions stay for audit."
        />
        <Link
          href={'/cms/legal/new' as never}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New version
        </Link>
      </div>
      <LegalClient />
    </>
  );
}
