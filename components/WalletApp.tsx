'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';

/**
 * Wallet / RainbowKit / Privy must not wrap page HTML in `dynamic(..., { ssr: false })`.
 * That parent boundary makes Next bail the whole route out to client rendering, so
 * curl / no-JS / screenshot KYB reviews see an empty dark page + footer.
 *
 * Load providers in an effect so the first HTML still contains the product.
 * `useWalletReady()` is false until that client import mounts.
 */
const WalletReadyContext = createContext(false);

export function useWalletReady() {
  return useContext(WalletReadyContext);
}

type ProvidersComponent = ComponentType<{ children: ReactNode }>;

export function WalletApp({ children }: { children: ReactNode }) {
  const [Providers, setProviders] = useState<ProvidersComponent | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import('@/app/providers').then((mod) => {
      if (!cancelled) setProviders(() => mod.Providers);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Providers) {
    return <WalletReadyContext.Provider value={false}>{children}</WalletReadyContext.Provider>;
  }

  return (
    <WalletReadyContext.Provider value={true}>
      <Providers>{children}</Providers>
    </WalletReadyContext.Provider>
  );
}
