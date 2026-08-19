'use client';

import dynamic from 'next/dynamic';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { RiskFooter } from '@/components/RiskDisclaimer';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { ReferralAttributionPrompt } from '@/components/ReferralAttributionPrompt';
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
      <ReferralAttributionPrompt />
      <main className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">{children}</main>
      <RiskFooter />
      <InstallAppBanner />
      <MobileTabBar />
    </Providers>
  );
}
