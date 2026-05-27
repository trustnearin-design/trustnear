import { PromosClient } from './PromosClient';
import { PageHeader } from '@/components/PageHeader';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function PromosPage() {
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Promo codes"
          subtitle="Coupons customers can apply at checkout. Validity windows + usage caps enforced server-side."
        />
        <Link
          href={'/cms/promos/new' as never}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New promo
        </Link>
      </div>
      <PromosClient />
    </>
  );
}
