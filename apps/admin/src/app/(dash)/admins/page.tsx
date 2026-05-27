import { AdminsClient } from './AdminsClient';
import { PageHeader } from '@/components/PageHeader';
import { readSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
  const session = await readSession();
  if (!session) redirect('/login');
  if (session.adminRole !== 'super') {
    // Soft-gate: non-super admins can't see the team.
    return (
      <div className="card p-12 text-center">
        <p className="text-h3 font-semibold text-ink">Restricted to super-admins</p>
        <p className="mt-2 text-body text-ink-muted">
          You're signed in as <strong>{session.adminRole}</strong>. Ask a super-admin to manage the
          team.
        </p>
      </div>
    );
  }
  return (
    <>
      <PageHeader
        title="Admin team"
        subtitle="Manage who has admin access + which scope (super / ops / finance / support)."
      />
      <AdminsClient currentUserId={session.userId} />
    </>
  );
}
