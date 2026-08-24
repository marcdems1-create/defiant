import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { InstallAppBanner } from '@/components/InstallAppBanner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';
import { WalletApp } from '@/components/WalletApp';

/**
 * Server chrome. Page HTML is a slot through WalletApp, which does **not** wrap
 * children in `dynamic(..., { ssr: false })` — that bailout is what made
 * Transak KYB see a non-functional homepage.
 */
export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <WalletApp>
      <ServiceWorkerRegister />
      <div className="sticky top-0 z-40 bg-paper/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <NetworkBanner />
        <NavBar />
      </div>
      <main className="max-w-6xl mx-auto px-4 py-6 md:px-6 md:py-10">{children}</main>
      <InstallAppBanner />
      <MobileTabBar />
    </WalletApp>
  );
}
