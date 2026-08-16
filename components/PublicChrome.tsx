'use client';

import dynamic from 'next/dynamic';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { RiskFooter } from '@/components/RiskDisclaimer';

// RainbowKit/Privy touch browser-only APIs at module-eval time. ssr:false
// keeps that out of Next's Node page-data collection.
const Providers = dynamic(() => import('@/app/providers').then((m) => m.Providers), {
  ssr: false,
});

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <NetworkBanner />
      <NavBar />
      <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
      <RiskFooter />
      <MobileTabBar />
    </Providers>
  );
}
