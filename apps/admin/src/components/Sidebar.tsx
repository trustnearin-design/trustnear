'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Bell,
  Megaphone,
  Tag,
  HelpCircle,
  FileText,
  AlertTriangle,
  MessageSquare,
  Wallet,
  Crown,
  UserCheck,
  type LucideIcon,
} from 'lucide-react';
import { clientFetch } from '@/lib/api-client';
import { LogoutButton } from './LogoutButton';
import { ThemeToggle } from './ThemeToggle';

type NavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  badgeKey?: AlertKey;
};

type AlertKey = 'kycPending' | 'disputes' | 'paymentFailed' | 'approvalsPending';
type AlertCounts = {
  kycPending: number;
  disputes: number;
  paymentFailed: number;
  approvalsPending?: number;
};

const PRIMARY_NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/approvals', label: 'Pro Approvals', Icon: UserCheck, badgeKey: 'approvalsPending' },
  { href: '/kyc', label: 'KYC Queue', Icon: ShieldCheck, badgeKey: 'kycPending' },
  { href: '/experts', label: 'Experts', Icon: Star },
  { href: '/bookings', label: 'Bookings', Icon: CalendarClock },
  { href: '/users', label: 'Users', Icon: Users },
];

const OPS_NAV: NavItem[] = [
  { href: '/disputes', label: 'Disputes', Icon: AlertTriangle, badgeKey: 'disputes' },
  { href: '/reviews', label: 'Reviews', Icon: MessageSquare },
  { href: '/payouts', label: 'Payouts', Icon: Wallet },
];

const CONTENT_NAV: NavItem[] = [
  { href: '/categories', label: 'Categories', Icon: FolderTree },
  { href: '/banners', label: 'Banners', Icon: Images },
  { href: '/cms/templates', label: 'Push Templates', Icon: Bell },
  { href: '/cms/announcements', label: 'Announcements', Icon: Megaphone },
  { href: '/cms/promos', label: 'Promo Codes', Icon: Tag },
  { href: '/cms/faqs', label: 'FAQs', Icon: HelpCircle },
  { href: '/cms/legal', label: 'Legal Pages', Icon: FileText },
];

const SECONDARY_NAV: NavItem[] = [
  { href: '/admins', label: 'Admin team', Icon: Crown },
  { href: '/config', label: 'Config', Icon: Settings },
  { href: '/audit', label: 'Audit log', Icon: ScrollText },
];

export function Sidebar({
  user,
}: {
  user: {
    fullName: string | null;
    phone: string;
    adminRole: 'super' | 'ops' | 'finance' | 'support';
  };
}) {
  const pathname = usePathname();

  // Alert counts feed the badges next to nav items. Refetches every 60s
  // so a fresh KYC submission or new dispute surfaces here without reload.
  const alerts = useQuery({
    queryKey: ['admin', 'alerts'],
    queryFn: () => clientFetch<AlertCounts>('/api/admin/alerts'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col bg-nav text-nav-fg">
      {/* Lockup */}
      <div className="border-b border-nav-border px-6 py-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon.png"
            alt="TrustNear"
            width={40}
            height={40}
            className="rounded-card shadow-[0_2px_12px_rgba(61,31,78,0.45)]"
          />
          <div>
            <p className="text-body font-bold leading-tight">TrustNear</p>
            <p className="text-caption text-nav-fg-muted">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <NavSection items={PRIMARY_NAV} currentPath={pathname} alerts={alerts.data} />
        <div className="my-4 border-t border-nav-border" />
        <p className="mb-2 px-3 text-caption font-semibold text-nav-fg-subtle">OPS</p>
        <NavSection items={OPS_NAV} currentPath={pathname} alerts={alerts.data} />
        <div className="my-4 border-t border-nav-border" />
        <p className="mb-2 px-3 text-caption font-semibold text-nav-fg-subtle">CONTENT</p>
        <NavSection items={CONTENT_NAV} currentPath={pathname} alerts={alerts.data} />
        <div className="my-4 border-t border-nav-border" />
        <p className="mb-2 px-3 text-caption font-semibold text-nav-fg-subtle">SETTINGS</p>
        <NavSection
          items={SECONDARY_NAV.filter((i) => i.href !== '/admins' || user.adminRole === 'super')}
          currentPath={pathname}
          alerts={alerts.data}
        />
      </nav>

      {/* User strip */}
      <div className="space-y-2 border-t border-nav-border p-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-caption font-semibold uppercase tracking-wider text-nav-fg-subtle">
            Theme
          </p>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3 rounded-card bg-nav-raised px-3 py-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-small font-semibold text-accent">
            {(user.fullName ?? user.phone).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-semibold text-nav-fg">
              {user.fullName ?? 'Admin'}
            </p>
            <p className="truncate text-caption text-nav-fg-muted">{user.phone}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}

function NavSection({
  items,
  currentPath,
  alerts,
}: {
  items: NavItem[];
  currentPath: string;
  alerts: AlertCounts | undefined;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active =
          currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
        const badge: number = item.badgeKey && alerts ? (alerts[item.badgeKey] ?? 0) : 0;
        return (
          <li key={item.href}>
            <Link
              href={item.href as never}
              prefetch
              className={
                'group flex items-center gap-3 rounded-card px-3 py-2.5 text-small font-medium transition ' +
                (active
                  ? 'bg-accent text-[#0B1F3A] shadow-[0_2px_8px_rgba(212,162,76,0.4)]'
                  : 'text-nav-fg-muted hover:bg-nav-raised hover:text-nav-fg')
              }
            >
              <item.Icon
                className={
                  'h-[18px] w-[18px] shrink-0 ' +
                  (active ? 'text-[#0B1F3A]' : 'text-nav-fg-subtle group-hover:text-accent')
                }
                strokeWidth={2}
              />
              <span className="flex-1">{item.label}</span>
              {badge > 0 && (
                <span
                  className={
                    'rounded-pill px-2 py-0.5 text-caption font-bold ' +
                    (active
                      ? 'bg-[#0B1F3A] text-accent'
                      : 'bg-accent text-[#0B1F3A] shadow-[0_1px_4px_rgba(212,162,76,0.5)]')
                  }
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
