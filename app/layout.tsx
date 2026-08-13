import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { NavBar } from '@/components/NavBar';
import { NetworkBanner } from '@/components/NetworkBanner';

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
    'Connect your own wallet, compare the best on-chain yield across DeFi, deposit and withdraw with your own keys. Defiant never holds your funds.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink font-sans">
        <Providers>
          <NetworkBanner />
          <NavBar />
          <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
