import { TemplatesClient } from './TemplatesClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        title="Push notification templates"
        subtitle="Edit the copy users see for each event. Variables like {{professionalName}} get substituted at send time."
      />
      <TemplatesClient />
    </>
  );
}
