import { apiFetch } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { SmsConfigForm, type SmsConfig } from './SmsConfigForm';

export const dynamic = 'force-dynamic';

export default async function SmsConfigPage() {
  const { config } = await apiFetch<{ config: SmsConfig }>('/api/v1/admin/sms-config');

  return (
    <>
      <PageHeader
        title="SMS / OTP"
        subtitle="Active SMS provider, DLT template and credentials. Changes go live within ~30 sec — no API redeploy."
      />
      <SmsConfigForm initial={config} />
    </>
  );
}
