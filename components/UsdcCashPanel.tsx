'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatUsdcUsd } from '@/lib/format';
import { useCrossChainUsdc } from '@/lib/hooks/useCrossChainUsdc';
import { NETWORK_MODE } from '@/lib/wagmi';
import { OnrampModal } from './OnrampModal';

export function UsdcCashPanel() {
  const { address, isConnected } = useAccount();
  const { balances, total, isLoading } = useCrossChainUsdc(address);
  const [product, setProduct] = useState<'BUY' | 'SELL' | null>(null);
  const mainnet = NETWORK_MODE === 'mainnet';

  const sellChainId = useMemo(() => {
    const funded = [...balances].sort((a, b) => (a.balance < b.balance ? 1 : a.balance > b.balance ? -1 : 0));
    return (funded.find((b) => b.balance > 0n) ?? balances[0])?.chainId;
  }, [balances]);

  const buyChainId = useMemo(() => {
    return balances.find((b) => b.label === 'Base')?.chainId ?? sellChainId;
  }, [balances, sellChainId]);

  if (!isConnected || !address) return null;

  const modalChainId = product === 'SELL' ? sellChainId : buyChainId;

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
          USDC in this wallet
        </p>
        <h2 className="text-3xl font-mono text-accent tracking-tight">
          {isLoading ? '…' : `$${formatUsdcUsd(total)}`}
        </h2>
        <p className="text-sm text-ink/50 mt-1 leading-relaxed max-w-xl">
          Native USDC on Ethereum, Base, and Arbitrum. Openhand never holds it. Cash out is Transak
          (CAD / Interac) — they process the fiat, not us.
        </p>
        {!mainnet && (
          <p className="text-xs text-warn mt-2">
            Practice mode. Live USDC totals and cash out need mainnet.
          </p>
        )}
      </div>

      {!isLoading && total > 0n && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/50 font-mono">
          {balances.map((b) => (
            <li key={b.chainId}>
              {b.label} ${formatUsdcUsd(b.balance)}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setProduct('BUY')}
          className="rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90"
        >
          Buy USDC
        </button>
        <button
          type="button"
          onClick={() => setProduct('SELL')}
          disabled={mainnet && total === 0n}
          className="rounded-xl border border-border text-sm px-4 py-2 hover:border-ink/40 disabled:opacity-40"
        >
          Cash out
        </button>
        <Link
          href="/move"
          className="rounded-xl border border-border text-sm px-4 py-2 hover:border-ink/40"
        >
          Move
        </Link>
      </div>

      {product && modalChainId && (
        <OnrampModal
          address={address}
          chainId={modalChainId}
          product={product}
          onClose={() => setProduct(null)}
        />
      )}
    </section>
  );
}
