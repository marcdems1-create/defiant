'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PrivyConnectButton({
  chainStatus = 'none',
}: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
}) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, chain } = useAccount();

  if (!ready) {
    return <span className="text-sm text-ink/40">…</span>;
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-2">
        {chainStatus !== 'none' && chain && (
          <span className="text-xs text-ink/50">{chain.name}</span>
        )}
        <span className="font-mono text-sm text-ink">{shortAddress(address)}</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="text-xs text-ink/50 hover:text-ink transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (authenticated && !address) {
    return <span className="text-sm text-ink/50">Creating wallet…</span>;
  }

  return (
    <button
      type="button"
      onClick={() => login()}
      className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90 transition-colors"
    >
      Connect
    </button>
  );
}
