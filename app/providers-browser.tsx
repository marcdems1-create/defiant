'use client';

import { Component, type ReactNode } from 'react';
import { privyAppId } from '@/lib/config/privy';
import { RainbowAppProviders } from './providers-rainbow';
import { PrivyAppProviders } from './providers-privy';
import { WalletModeContext, type WalletMode } from '@/lib/walletMode';

/**
 * Client-only wallet tree. Loaded after mount from `providers.tsx` so
 * RainbowKit / Privy never evaluate during Node page rendering.
 */
export function WalletBrowserProviders({ children }: { children: ReactNode }) {
  return <WalletProviderBoundary>{children}</WalletProviderBoundary>;
}

class WalletProviderBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Privy failed to start; using RainbowKit only', error);
  }

  render() {
    const mode: WalletMode = privyAppId() && !this.state.failed ? 'privy' : 'rainbow';
    const inner =
      mode === 'privy' ? (
        <PrivyAppProviders>{this.props.children}</PrivyAppProviders>
      ) : (
        <RainbowAppProviders>{this.props.children}</RainbowAppProviders>
      );
    return <WalletModeContext.Provider value={mode}>{inner}</WalletModeContext.Provider>;
  }
}
