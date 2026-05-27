import { AuditClient } from './AuditClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <>
      <PageHeader
        title="Audit log"
        subtitle="Who did what, when. Read-only — pulls live from the audit_logs table."
      />
      <AuditClient />
    </>
  );
}
