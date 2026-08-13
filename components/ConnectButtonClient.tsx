'use client';

import dynamic from 'next/dynamic';

// RainbowKit/wagmi touch browser-only APIs at module-eval time (indexedDB,
// WebSocket) which crashes Next's Node-side static page-data collection if
// this ends up in any server-evaluated module graph. Isolating it behind its
// own ssr:false dynamic import keeps that entirely out of server chunks,
// independent of how the importing component is itself rendered.
const RainbowConnectButton = dynamic(
  () => import('@rainbow-me/rainbowkit').then((m) => m.ConnectButton),
  { ssr: false },
);

export function ConnectButtonClient(props: { showBalance?: boolean; chainStatus?: 'icon' | 'full' | 'none' }) {
  return <RainbowConnectButton {...props} />;
}
