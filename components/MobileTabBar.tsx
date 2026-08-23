'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconCollection, IconDashboard, IconMove } from './AppChrome';

const tabs = [
  {
    href: '/',
    label: 'Collection',
    icon: IconCollection,
    match: (path: string) => path === '/' || path.startsWith('/opportunities'),
  },
  {
    href: '/move',
    label: 'Move',
    icon: IconMove,
    match: (path: string) => path.startsWith('/move'),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: IconDashboard,
    match: (path: string) => path.startsWith('/dashboard'),
  },
] as const;

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-paper/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Main"
    >
      <div className="flex">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium touch-manipulation transition-colors ${
                active ? 'text-accent' : 'text-ink/45'
              }`}
            >
              <Icon className="h-[22px] w-[22px]" />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
