'use client';

import dynamic from 'next/dynamic';
import { track } from '@/lib/analytics/track';
import { useWalletMode, useWalletUiReady } from '@/lib/walletMode';

// RainbowKit / Privy touch browser-only APIs at module-eval time (indexedDB,
// WebSocket) which crashes Next's Node-side static page-data collection if
// this ends up in any server-evaluated module graph. Isolating the button
// behind ssr:false keeps that entirely out of server chunks.
const PrivyWalletButton = dynamic(
  () => import('./PrivyConnectButton').then((m) => m.PrivyConnectButton),
  { ssr: false },
);
const RainbowWalletButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
);

export function ConnectButtonClient(props: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
  label?: string;
}) {
  const mode = useWalletMode();
  const walletUiReady = useWalletUiReady();
  const WalletButton = mode === 'privy' ? PrivyWalletButton : RainbowWalletButton;
  if (!walletUiReady) {
    return <span className="inline-block h-9 w-[7.5rem]" aria-hidden />;
  }
  return (
    <span
      onClick={() => {
        track('connect_open');
      }}
    >
      <WalletButton {...props} />
    </span>
  );
}
