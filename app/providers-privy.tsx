'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { useState } from 'react';
import { getPrivyClientConfig } from '@/lib/config/privyClient';
import { privyAppId } from '@/lib/config/privy';
import { chains, getWagmiTransports, setWagmiConfig } from '@/lib/wagmi';

function buildPrivyWagmiConfig() {
  const chainTuple = chains as unknown as readonly [
    (typeof chains)[number],
    ...(typeof chains)[number][],
  ];
  const config = createConfig({
    chains: chainTuple,
    transports: getWagmiTransports() as never,
  });
  setWagmiConfig(config);
  return config;
}

export function PrivyAppProviders({ children }: { children: React.ReactNode }) {
  const [wagmiConfig] = useState(() => buildPrivyWagmiConfig());
  const appId = privyAppId();
  if (!appId) {
    throw new Error('PrivyAppProviders rendered without NEXT_PUBLIC_PRIVY_APP_ID');
  }

  return (
    <PrivyProvider appId={appId} config={getPrivyClientConfig()}>
      <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
    </PrivyProvider>
  );
}
