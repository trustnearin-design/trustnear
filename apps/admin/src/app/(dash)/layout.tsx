import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';
import { Sidebar } from '@/components/Sidebar';
import { CommandPalette } from '@/components/CommandPalette';
import { GlobalShortcuts } from '@/components/GlobalShortcuts';

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session) redirect('/login');

  return (
    <div className="min-h-screen bg-surface-muted">
      <Sidebar
        user={{
          fullName: session.fullName,
          phone: session.phone,
          adminRole: session.adminRole,
        }}
      />
      <main className="ml-64 min-h-screen px-8 pb-8 pt-16 lg:pt-8">{children}</main>
      <CommandPalette />
      <GlobalShortcuts />
    </div>
  );
}
