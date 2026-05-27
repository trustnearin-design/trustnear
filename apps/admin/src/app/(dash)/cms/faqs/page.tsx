import { FaqsClient } from './FaqsClient';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function FaqsPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="FAQs"
          subtitle="Help-center articles. Customer + Pro apps read the published set from the public endpoint."
        />
        <Link
          href={'/cms/faqs/new' as never}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New FAQ
        </Link>
      </div>
      <FaqsClient />
    </>
  );
}
