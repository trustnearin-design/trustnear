import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import { AdminShell } from '@/components/AdminShell';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <AdminShell
      user={{
        fullName: session.fullName,
        phone: session.phone,
        adminRole: session.adminRole,
      }}
    >
      {children}
      <CommandPalette />
      <GlobalShortcuts />
    </AdminShell>
  );
}
