'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Keyboard, X } from 'lucide-react';

/**
 * Linear-style "g + X" navigation shortcuts. Press `g`, then a letter
 * within 1.5s to jump to that section. Press `?` anytime to open the
 * help modal. Skipped while typing in inputs/textareas/contentEditable.
 */
const NAV_BINDINGS: Array<{ key: string; href: string; label: string }> = [
  { key: 'd', href: '/dashboard', label: 'Dashboard' },
  { key: 'k', href: '/kyc', label: 'KYC Queue' },
  { key: 'e', href: '/experts', label: 'Experts' },
  { key: 'b', href: '/bookings', label: 'Bookings' },
  { key: 'u', href: '/users', label: 'Users' },
  { key: 'x', href: '/disputes', label: 'Disputes' },
  { key: 'r', href: '/reviews', label: 'Reviews' },
  { key: 'p', href: '/payouts', label: 'Payouts' },
  { key: 'c', href: '/categories', label: 'Categories' },
  { key: 'n', href: '/cms/announcements', label: 'Announcements' },
  { key: 't', href: '/cms/templates', label: 'Push Templates' },
  { key: 'a', href: '/admins', label: 'Admins' },
  { key: 's', href: '/config', label: 'Settings (Config)' },
  { key: 'l', href: '/audit', label: 'Audit log' },
];

export function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const gPressedAt = useRef<number | null>(null);

  useEffect(() => {
    function isTyping(): boolean {
      const el = document.activeElement;
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
      if ((el as HTMLElement).isContentEditable) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return; // let Cmd+K etc through
      if (isTyping()) return;

      // ?  → help
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (e.key === 'Escape' && helpOpen) {
        setHelpOpen(false);
        return;
      }

      const now = Date.now();

      // First press: g (Linear sequence prefix)
      if (e.key === 'g' && !e.repeat) {
        gPressedAt.current = now;
        return;
      }

      // Second press within 1.5s
      if (gPressedAt.current && now - gPressedAt.current < 1500) {
        const binding = NAV_BINDINGS.find((b) => b.key === e.key.toLowerCase());
        if (binding) {
          e.preventDefault();
          gPressedAt.current = null;
          router.push(binding.href as never);
          return;
        }
        // Any other key cancels the sequence
        gPressedAt.current = null;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, helpOpen]);

  if (!helpOpen) return null;
  return <HelpModal onClose={() => setHelpOpen(false)} />;
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-[12vh]">
      <button
        aria-label="Close help"
        onClick={onClose}
        className="absolute inset-0 bg-nav/40 backdrop-blur-sm"
      />
      <div className="relative z-10 w-full max-w-xl overflow-hidden rounded-card border border-border bg-surface shadow-[0_24px_60px_rgba(11,31,58,0.25)]">
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Keyboard className="h-4 w-4 text-brand" />
          <p className="flex-1 text-body font-semibold text-ink">Keyboard shortcuts</p>
          <button
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-ink-subtle hover:bg-surface-muted"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Section title="Global">
            <Row chord="⌘ K" label="Open command palette" />
            <Row chord="/" label="Open command palette" />
            <Row chord="?" label="Show this help" />
            <Row chord="Esc" label="Close any modal" />
          </Section>
          <Section title="Navigate (press g, then…)">
            {NAV_BINDINGS.map((b) => (
              <Row key={b.key} chord={`g ${b.key.toUpperCase()}`} label={b.label} />
            ))}
          </Section>
        </div>
        <div className="border-t border-border bg-surface-muted/50 px-5 py-2.5 text-caption text-ink-subtle">
          Tip: shortcuts are disabled while typing in inputs. Tap outside or press Esc to dismiss.
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </p>
      <ul className="space-y-1.5">{children}</ul>
    </div>
  );
}

function Row({ chord, label }: { chord: string; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <kbd className="inline-flex min-w-[42px] justify-center rounded border border-border bg-surface-muted px-2 py-0.5 text-caption font-mono font-semibold text-ink">
        {chord}
      </kbd>
      <span className="text-small text-ink-muted">{label}</span>
    </li>
  );
}
