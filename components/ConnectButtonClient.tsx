'use client';

import dynamic from 'next/dynamic';
import { track } from '@/lib/analytics/track';
import { useWalletMode } from '@/lib/walletMode';
import { useWalletReady } from './WalletApp';

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
  const ready = useWalletReady();
  if (!ready) {
    return (
      <span className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm text-ink/50">
        {props.label ?? 'Connect'}
      </span>
    );
  }
  return <ConnectButtonLive {...props} />;
}

function ConnectButtonLive(props: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
  label?: string;
}) {
  const mode = useWalletMode();
  const WalletButton = mode === 'privy' ? PrivyWalletButton : RainbowWalletButton;
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
