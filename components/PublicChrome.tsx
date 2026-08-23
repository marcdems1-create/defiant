'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

// RainbowKit/Privy touch browser-only APIs at module-eval time. ssr:false
// keeps that out of Next's Node page-data collection.
const Providers = dynamic(() => import('@/app/providers').then((m) => m.Providers), {
  ssr: false,
});

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <ServiceWorkerRegister />
      <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <NetworkBanner />
        <NavBar />
      </div>
      <main className="max-w-6xl mx-auto px-4 py-4 md:px-6 md:py-10">{children}</main>
      <p className="md:hidden px-4 pb-3 text-[11px] text-ink/35 text-center">
        <Link href="/terms" className="hover:text-ink/55">Terms</Link>
        {' · '}
        <Link href="/privacy" className="hover:text-ink/55">Privacy</Link>
        {' · '}
        <Link href="/risk" className="hover:text-ink/55">Risk</Link>
      </p>
      <InstallAppBanner />
      <MobileTabBar />
    </Providers>
  );
}
