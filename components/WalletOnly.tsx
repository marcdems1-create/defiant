'use client';

import type { ReactNode } from 'react';
import { useWalletReady } from './WalletApp';

/** Render `children` only after wagmi/Privy providers exist. Children may call wagmi hooks. */
export function WalletOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const ready = useWalletReady();
  if (!ready) return <>{fallback}</>;
  return <>{children}</>;
}
