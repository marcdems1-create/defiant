'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { getSsrWagmiConfig } from '@/lib/wagmi';
import { WalletUiReadyContext } from '@/lib/walletMode';

/**
 * Wallet connectors (RainbowKit / Privy) cannot run during SSR. Query + a
 * connector-less wagmi config still wrap the tree so page HTML (opportunity
 * copy, headings) is in the first response. After mount we swap in the
 * real wallet providers without putting RainbowKit in the server graph.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const ssrConfig = useMemo(() => getSsrWagmiConfig(), []);
  const [BrowserWallets, setBrowserWallets] = useState<ComponentType<{
    children: ReactNode;
  }> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('./providers-browser').then((mod) => {
      if (!cancelled) setBrowserWallets(() => mod.WalletBrowserProviders);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WalletUiReadyContext.Provider value={Boolean(BrowserWallets)}>
        {BrowserWallets ? (
          <BrowserWallets>{children}</BrowserWallets>
        ) : (
          <WagmiProvider config={ssrConfig} reconnectOnMount={false}>
            {children}
          </WagmiProvider>
        )}
      </WalletUiReadyContext.Provider>
    </QueryClientProvider>
  );
}
