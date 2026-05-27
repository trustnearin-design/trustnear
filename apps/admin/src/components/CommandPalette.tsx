'use client';

import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShieldCheck,
  Star,
  CalendarClock,
  Users,
  FolderTree,
  Images,
  Settings,
  ScrollText,
  Search,
  ArrowRight,
  Plus,
  Bell,
  Megaphone,
  Tag,
  HelpCircle,
  FileText,
  AlertTriangle,
  MessageSquare,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { clientFetch, qs } from '@/lib/api-client';

const NAV: Array<{ label: string; href: string; Icon: LucideIcon; keywords?: string }> = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    Icon: LayoutDashboard,
    keywords: 'home overview metrics',
  },
  { label: 'KYC Queue', href: '/kyc', Icon: ShieldCheck, keywords: 'verification pending' },
  { label: 'Experts', href: '/experts', Icon: Star, keywords: 'pros professionals' },
  { label: 'Bookings', href: '/bookings', Icon: CalendarClock, keywords: 'orders jobs' },
  { label: 'Users', href: '/users', Icon: Users, keywords: 'customers people' },
  {
    label: 'Disputes',
    href: '/disputes',
    Icon: AlertTriangle,
    keywords: 'ops conflict resolve refund',
  },
  {
    label: 'Reviews',
    href: '/reviews',
    Icon: MessageSquare,
    keywords: 'moderation rating stars hide',
  },
  {
    label: 'Payouts',
    href: '/payouts',
    Icon: Wallet,
    keywords: 'wallet earnings transactions money',
  },
  { label: 'Categories', href: '/categories', Icon: FolderTree, keywords: 'services taxonomy' },
  { label: 'Banners', href: '/banners', Icon: Images, keywords: 'promo home hero slider' },
  {
    label: 'Push Templates',
    href: '/cms/templates',
    Icon: Bell,
    keywords: 'notification copy push',
  },
  {
    label: 'Announcements',
    href: '/cms/announcements',
    Icon: Megaphone,
    keywords: 'broadcast push send',
  },
  { label: 'Promo Codes', href: '/cms/promos', Icon: Tag, keywords: 'coupon discount offer' },
  { label: 'FAQs', href: '/cms/faqs', Icon: HelpCircle, keywords: 'help articles questions' },
  { label: 'Legal Pages', href: '/cms/legal', Icon: FileText, keywords: 'terms privacy refund' },
  {
    label: 'Admin team',
    href: '/admins',
    Icon: ShieldCheck,
    keywords: 'super ops finance support roles',
  },
  { label: 'Config', href: '/config', Icon: Settings, keywords: 'settings flags business rules' },
  { label: 'Audit log', href: '/audit', Icon: ScrollText, keywords: 'history activity who' },
];

const QUICK_ACTIONS: Array<{ label: string; href: string; Icon: LucideIcon; keywords?: string }> = [
  { label: 'New category', href: '/categories/new', Icon: Plus, keywords: 'add create service' },
  { label: 'New banner', href: '/banners/new', Icon: Plus, keywords: 'add create promo' },
  {
    label: 'New announcement',
    href: '/cms/announcements/new',
    Icon: Plus,
    keywords: 'broadcast push',
  },
  { label: 'New promo code', href: '/cms/promos/new', Icon: Plus, keywords: 'coupon discount' },
  { label: 'New FAQ', href: '/cms/faqs/new', Icon: Plus, keywords: 'help article' },
  {
    label: 'New legal version',
    href: '/cms/legal/new',
    Icon: Plus,
    keywords: 'terms privacy refund',
  },
];

type SearchHit = {
  type: 'booking' | 'user' | 'expert';
  id: string;
  label: string;
  sub: string;
  href: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  // Toggle on Cmd+K / Ctrl+K. Also "/" when no input focused (Linear-style).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Reset search when palette closes so we don't show stale results next open
  useEffect(() => {
    if (!open) setTimeout(() => setSearch(''), 150);
  }, [open]);

  const enabled = open && search.trim().length >= 2;

  const usersHits = useQuery({
    queryKey: ['cmdk', 'users', search],
    enabled,
    queryFn: () =>
      clientFetch<{
        items: Array<{ id: string; fullName: string | null; phone: string; role: string }>;
      }>(`/api/admin/users${qs({ search, limit: '5' })}`),
    staleTime: 10_000,
  });

  const expertsHits = useQuery({
    queryKey: ['cmdk', 'experts', search],
    enabled,
    queryFn: () =>
      clientFetch<{
        items: Array<{
          id: string;
          professionalTitle: string | null;
          user: { fullName: string | null; phone: string };
        }>;
      }>(`/api/admin/experts${qs({ search, limit: '5' })}`),
    staleTime: 10_000,
  });

  const bookingsHits = useQuery({
    queryKey: ['cmdk', 'bookings', search],
    enabled,
    queryFn: () =>
      clientFetch<{
        items: Array<{
          id: string;
          bookingNumber: string;
          status: string;
          customer: { fullName: string | null; phone: string };
        }>;
      }>(`/api/admin/bookings${qs({ search, limit: '5' })}`),
    staleTime: 10_000,
  });

  const close = useCallback(() => setOpen(false), []);
  const go = useCallback(
    (href: string) => {
      router.push(href as never);
      close();
    },
    [router, close],
  );

  const isSearching = usersHits.isFetching || expertsHits.isFetching || bookingsHits.isFetching;

  return (
    <>
      {/* Trigger pill (visible top of body via portal-free inline insertion) */}
      <CommandTrigger onOpen={() => setOpen(true)} />

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:pt-[10vh]"
        >
          <button
            aria-label="Close palette"
            onClick={close}
            className="absolute inset-0 bg-brand/40 backdrop-blur-sm"
          />
          <Command
            label="Command palette"
            shouldFilter={false}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-card border border-border bg-surface shadow-[0_24px_60px_rgba(11,31,58,0.25)]"
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-ink-subtle" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder="Search bookings, users, experts… or jump to a page"
                className="flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-caption text-ink-subtle">
                Esc
              </kbd>
            </div>

            <Command.List className="max-h-[60vh] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-small text-ink-subtle">
                {isSearching ? 'Searching…' : 'No matches.'}
              </Command.Empty>

              {/* Live search results — only when user typed enough */}
              {enabled && (
                <>
                  {(bookingsHits.data?.items.length ?? 0) > 0 && (
                    <Command.Group
                      heading="Bookings"
                      className="text-caption font-semibold uppercase tracking-wider text-ink-subtle"
                    >
                      {bookingsHits.data!.items.map((b) => (
                        <Item
                          key={b.id}
                          value={'booking-' + b.id + b.bookingNumber}
                          onSelect={() => go(`/bookings/${b.id}`)}
                          icon={<CalendarClock className="h-4 w-4 text-brand" />}
                          label={b.bookingNumber}
                          sub={`${b.status.replaceAll('_', ' ')} · ${b.customer.fullName ?? b.customer.phone}`}
                        />
                      ))}
                    </Command.Group>
                  )}

                  {(expertsHits.data?.items.length ?? 0) > 0 && (
                    <Command.Group
                      heading="Experts"
                      className="text-caption font-semibold uppercase tracking-wider text-ink-subtle"
                    >
                      {expertsHits.data!.items.map((e) => (
                        <Item
                          key={e.id}
                          value={'expert-' + e.id + (e.user.fullName ?? '')}
                          onSelect={() => go(`/experts/${e.id}`)}
                          icon={<Star className="h-4 w-4 text-accent" />}
                          label={e.user.fullName ?? e.user.phone}
                          sub={`${e.professionalTitle ?? '—'} · ${e.user.phone}`}
                        />
                      ))}
                    </Command.Group>
                  )}

                  {(usersHits.data?.items.length ?? 0) > 0 && (
                    <Command.Group
                      heading="Users"
                      className="text-caption font-semibold uppercase tracking-wider text-ink-subtle"
                    >
                      {usersHits.data!.items.map((u) => (
                        <Item
                          key={u.id}
                          value={'user-' + u.id + (u.fullName ?? '')}
                          onSelect={() => go(`/users/${u.id}`)}
                          icon={<Users className="h-4 w-4 text-brand" />}
                          label={u.fullName ?? u.phone}
                          sub={`${u.role} · ${u.phone}`}
                        />
                      ))}
                    </Command.Group>
                  )}
                </>
              )}

              {/* Static navigation — always shown */}
              <Command.Group
                heading="Navigation"
                className="text-caption font-semibold uppercase tracking-wider text-ink-subtle"
              >
                {NAV.filter((n) =>
                  search ? matches(n.label + ' ' + (n.keywords ?? ''), search) : true,
                ).map((n) => (
                  <Item
                    key={n.href}
                    value={'nav-' + n.href}
                    onSelect={() => go(n.href)}
                    icon={<n.Icon className="h-4 w-4 text-ink-muted" />}
                    label={n.label}
                  />
                ))}
              </Command.Group>

              <Command.Group
                heading="Quick actions"
                className="text-caption font-semibold uppercase tracking-wider text-ink-subtle"
              >
                {QUICK_ACTIONS.filter((q) =>
                  search ? matches(q.label + ' ' + (q.keywords ?? ''), search) : true,
                ).map((q) => (
                  <Item
                    key={q.href}
                    value={'action-' + q.href}
                    onSelect={() => go(q.href)}
                    icon={<q.Icon className="h-4 w-4 text-accent" />}
                    label={q.label}
                  />
                ))}
              </Command.Group>
            </Command.List>

            <div className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-4 py-2 text-caption text-ink-subtle">
              <span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↑↓</kbd>{' '}
                navigate ·{' '}
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↵</kbd> open
              </span>
              <span>
                <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">⌘K</kbd>{' '}
                toggle
              </span>
            </div>
          </Command>
        </div>
      )}
    </>
  );
}

function Item({
  value,
  onSelect,
  icon,
  label,
  sub,
}: {
  value: string;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
      className="group flex cursor-pointer items-center gap-3 rounded px-3 py-2 text-small text-ink data-[selected=true]:bg-brand data-[selected=true]:text-ink-inverse"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded bg-surface-muted group-data-[selected=true]:bg-brand-700">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{label}</p>
        {sub && (
          <p className="truncate text-caption text-ink-subtle group-data-[selected=true]:text-brand-100">
            {sub}
          </p>
        )}
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-ink-subtle opacity-0 group-data-[selected=true]:opacity-100" />
    </Command.Item>
  );
}

function CommandTrigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-pill border border-border bg-surface px-3 py-2 text-small font-medium text-ink-muted shadow-card hover:bg-surface-muted lg:bottom-auto lg:right-auto lg:left-72 lg:top-4"
      title="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Search or jump to…</span>
      <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-caption">
        ⌘K
      </kbd>
    </button>
  );
}

function matches(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}
