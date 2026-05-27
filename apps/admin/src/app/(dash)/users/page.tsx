import { UsersClient } from './UsersClient';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <>
      <PageHeader title="Users" subtitle="Search, filter, change roles, suspend. Audit-logged." />
      <UsersClient />
    </>
  );
}
