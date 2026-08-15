'use client';

import { privyAppId } from '@/lib/config/privy';
import { RainbowAppProviders } from './providers-rainbow';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';

const PrivyAppProviders = dynamic(
  () => import('./providers-privy').then((m) => m.PrivyAppProviders),
  { ssr: false },
);

export function Providers({ children }: { children: ReactNode }) {
  if (privyAppId()) {
    return <PrivyAppProviders>{children}</PrivyAppProviders>;
  }
  return <RainbowAppProviders>{children}</RainbowAppProviders>;
}
