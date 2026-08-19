'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButtonClient } from './ConnectButtonClient';

const links = [
  { href: '/', label: 'Collection' },
  { href: '/move', label: 'Move' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/about', label: 'About' },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border">
      <Link href="/" className="flex items-baseline gap-2">
        <span className="font-mono text-lg tracking-tight text-ink">
          openhand<span className="text-accent">.</span>
        </span>
        <span className="hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-ink/40 font-mono">
          Non-custodial
        </span>
      </Link>
      <div className="flex items-center gap-5 md:gap-6 text-sm">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`hidden md:inline transition-colors ${active ? 'text-ink' : 'text-ink/70 hover:text-ink'}`}
            >
              {link.label}
            </Link>
          );
        })}
        <ConnectButtonClient showBalance={false} chainStatus="icon" />
      </div>
    </nav>
  );
}
