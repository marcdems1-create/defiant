import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { ReferralCapture } from '@/components/ReferralCapture';

// wagmi/RainbowKit reach for browser-only APIs (indexedDB, WebSocket) at
// module-eval time, which crashes Next's Node-side static page-data
// collection if this is imported normally. ssr:false keeps the whole wallet
// stack out of the server bundle entirely.
const Providers = dynamic(() => import('./providers').then((m) => m.Providers), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Defiant — non-custodial DeFi yield',
  description:
    'Connect your own wallet, compare on-chain USDC yield on Base and Arbitrum, deposit and withdraw with your own keys. Defiant never holds your funds.',
  applicationName: 'Defiant',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Defiant',
  },
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b0e11',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink font-sans pb-20 md:pb-0">
        <Providers>
          <ReferralCapture />
          <NetworkBanner />
          <NavBar />
          <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
