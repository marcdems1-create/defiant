'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function PrivyConnectButton({
  chainStatus = 'none',
  label = 'Deposit',
}: {
  showBalance?: boolean;
  chainStatus?: 'icon' | 'full' | 'none';
  label?: string;
}) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { address, chain } = useAccount();

  if (!ready) {
    return <span className="text-sm text-ink/40">…</span>;
  }

  if (authenticated && address) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-border bg-white/[0.04] pl-2.5 pr-1 py-0.5">
        {chainStatus !== 'none' && chain && (
          <span className="hidden sm:inline text-[11px] text-ink/45">{chain.name}</span>
        )}
        <span className="font-mono text-xs text-ink">{shortAddress(address)}</span>
        <button
          type="button"
          onClick={() => void logout()}
          className="min-h-8 px-2 rounded-full text-[11px] text-ink/45 hover:text-ink touch-manipulation"
        >
          Out
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
      {label}
    </button>
  );
}
