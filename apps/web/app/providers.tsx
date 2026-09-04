'use client';

import { Component, type ReactNode } from 'react';
import { privyAppId } from '@/lib/config/privy';
import { RainbowAppProviders } from './providers-rainbow';
import { PrivyAppProviders } from './providers-privy';
import { WalletModeContext, type WalletMode } from '@/lib/walletMode';

/**
 * Wallet providers. Loaded only from `WalletApp` via a client `import()` in
 * useEffect — never from a server module and never as
 * `dynamic(..., { ssr: false })` wrapping page children (that bails `/` out
 * to client rendering and fails Transak KYB).
 *
 * Privy throws on an origin that is not in its dashboard allowlist (www vs
 * apex is the usual miss). That used to white-screen the whole public app.
 * Catch it and keep RainbowKit connect working.
 */
class WalletProviderBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.error('Privy failed to start; using RainbowKit only', error);
  }

  render() {
    const mode: WalletMode =
      privyAppId() && !this.state.failed ? 'privy' : 'rainbow';
    const inner =
      mode === 'privy' ? (
        <PrivyAppProviders>{this.props.children}</PrivyAppProviders>
      ) : (
        <RainbowAppProviders>{this.props.children}</RainbowAppProviders>
      );
    return <WalletModeContext.Provider value={mode}>{inner}</WalletModeContext.Provider>;
  }
}

export function Providers({ children }: { children: ReactNode }) {
  return <WalletProviderBoundary>{children}</WalletProviderBoundary>;
}
