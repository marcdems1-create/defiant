import Link from 'next/link';
import { SITE_NAME } from '@/lib/config/site';
import { SiteFooter } from './SiteFooter';

/**
 * Header/footer for pages Transak KYB reviewers hit (terms, privacy, about).
 * No wallet providers — a Privy origin miss must not white-screen the legal
 * docs a partner review depends on.
 */
export function LegalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <nav className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-border">
          <Link href="/" className="font-mono text-lg tracking-tight text-ink">
            {SITE_NAME.toLowerCase()}
            <span className="text-accent">.</span>
          </Link>
          <Link href="/" className="text-sm text-ink/70 hover:text-ink">
            Collection
          </Link>
        </nav>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 md:px-6 md:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
