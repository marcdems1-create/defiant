'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  {
    href: '/',
    label: 'Collection',
    icon: '🃏',
    match: (path: string) => path === '/' || path.startsWith('/opportunities'),
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: '📈',
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
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                active ? 'text-accent' : 'text-ink/50'
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
