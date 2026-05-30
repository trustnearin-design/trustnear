'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';

type SessionUser = {
  fullName: string | null;
  phone: string;
  adminRole: 'super' | 'ops' | 'finance' | 'support';
};

/**
 * App shell — owns the responsive chrome around every dashboard page.
 *
 * Desktop (`lg+`): fixed plum rail on the left, content offset by its width.
 * Mobile/tablet (`< lg`): the rail collapses into an off-canvas drawer behind
 * a hamburger in the top bar, with a tap-to-dismiss backdrop. The drawer is a
 * client concern (open/close state + route-change auto-close), which is why
 * this wrapper exists between the server `layout.tsx` and the `Sidebar`.
 */
export function AdminShell({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating to a new route should dismiss the drawer on mobile so the
  // destination page is visible immediately after a nav tap.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock background scroll while the drawer is open (mobile only).
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-surface-muted">
      {/* Mobile top bar — hamburger + lockup. Hidden on desktop. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-card text-ink transition hover:bg-surface-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.png" alt="TrustNear" width={28} height={28} className="rounded-md" />
        <p className="font-display text-h3 font-extrabold tracking-tight text-ink">TrustNear</p>
      </header>

      {/* Backdrop behind the drawer — tap to dismiss. Mobile only. */}
      {open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-brand/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar user={user} open={open} onClose={() => setOpen(false)} />

      <main className="min-h-screen px-4 pb-10 pt-[4.5rem] sm:px-6 lg:ml-64 lg:px-8 lg:pt-8">
        {children}
      </main>
    </div>
  );
}
