'use client';

import dynamic from 'next/dynamic';
import { privyAppId } from '@/lib/config/privy';

// RainbowKit / Privy touch browser-only APIs at module-eval time (indexedDB,
// WebSocket) which crashes Next's Node-side static page-data collection if
// this ends up in any server-evaluated module graph. Isolating the button
// behind ssr:false keeps that entirely out of server chunks.
const usePrivyButton = Boolean(privyAppId());

const WalletButton = dynamic(
  () =>
    usePrivyButton
      ? import('./PrivyConnectButton').then((m) => m.PrivyConnectButton)
      : import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
);

export function ConnectButtonClient(props: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
  label?: string;
}) {
  return <WalletButton {...props} />;
}
