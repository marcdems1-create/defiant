'use client';

import Link from 'next/link';
import { ConnectButtonClient } from './ConnectButtonClient';

export function NavBar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
      <Link href="/" className="font-mono text-lg tracking-tight text-ink">
        openhand<span className="text-accent">.</span>
      </Link>
      <div className="flex items-center gap-6 text-sm">
        <Link href="/" className="text-ink/70 hover:text-ink transition-colors">
          Collection
        </Link>
        <Link href="/dashboard" className="text-ink/70 hover:text-ink transition-colors">
          Dashboard
        </Link>
        <ConnectButtonClient showBalance={false} chainStatus="icon" />
      </div>
    </nav>
  );
}
