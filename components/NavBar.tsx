'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButtonClient } from './ConnectButtonClient';

const links = [
  { href: '/', label: 'Collection' },
  { href: '/move', label: 'Move' },
  { href: '/swap', label: 'Swap' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border">
      <Link href="/" className="font-mono text-lg tracking-tight text-ink">
        openhand<span className="text-accent">.</span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        {links.map((link) => {
          const active = pathname === link.href;
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
