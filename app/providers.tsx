'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { useState } from 'react';
import { getWagmiConfig } from '@/lib/wagmi';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  // getWagmiConfig() also initializes AppKit (modal + web components) exactly
  // once. Runs here in the browser only — this module is loaded via
  // dynamic(ssr:false) from app/layout.tsx. See lib/wagmi.ts.
  const [config] = useState(() => getWagmiConfig());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
