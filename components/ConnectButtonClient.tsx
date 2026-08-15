'use client';

import dynamic from 'next/dynamic';

// RainbowKit / Privy touch browser-only APIs at module-eval time (indexedDB,
// WebSocket) which crashes Next's Node-side static page-data collection if
// this ends up in any server-evaluated module graph. Isolating the button
// behind ssr:false keeps that entirely out of server chunks.
const WalletButton = dynamic(
  () =>
    process.env.NEXT_PUBLIC_PRIVY_APP_ID
      ? import('./PrivyConnectButton').then((m) => m.PrivyConnectButton)
      : import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
);

export function ConnectButtonClient(props: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
}) {
  return <WalletButton {...props} />;
}
