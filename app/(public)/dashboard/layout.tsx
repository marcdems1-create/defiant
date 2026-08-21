import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageMetadata } from '@/lib/config/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Dashboard',
  description:
    'Your on-chain positions, USDC across Ethereum, Base, and Arbitrum, and tokenized-stock or spot-crypto tapes. Openhand never holds your funds.',
  path: '/dashboard',
});

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
