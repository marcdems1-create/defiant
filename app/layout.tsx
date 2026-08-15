import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { MobileTabBar } from '@/components/MobileTabBar';
import { RiskFooter } from '@/components/RiskDisclaimer';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/config/site';

// wagmi/RainbowKit reach for browser-only APIs (indexedDB, WebSocket) at
// module-eval time, which crashes Next's Node-side static page-data
// collection if this is imported normally. ssr:false keeps the whole wallet
// stack out of the server bundle entirely.
const Providers = dynamic(() => import('./providers').then((m) => m.Providers), {
  ssr: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — non-custodial DeFi yield`,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — non-custodial DeFi yield`,
    description: SITE_DESCRIPTION,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: SITE_NAME,
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
          <NetworkBanner />
          <NavBar />
          <main className="max-w-6xl mx-auto px-6 py-10">{children}</main>
          <RiskFooter />
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
