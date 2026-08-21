'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { getWagmiConfig } from '@/lib/wagmi';

export function RainbowAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={getWagmiConfig()}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#3ecf8e',
          accentColorForeground: '#0b0e11',
          borderRadius: 'medium',
        })}
      >
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  );
}
