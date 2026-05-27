import { LegalNewClient } from './LegalNewClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function NewLegalPage() {
  return (
    <>
      <PageHeader
        title="New legal page version"
        subtitle="Each save creates a new version. Publishing one auto-unpublishes the prior live version for that slug."
      />
      <LegalNewClient />
    </>
  );
}
