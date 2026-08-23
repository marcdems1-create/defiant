'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { formatUsdcUsd } from '@/lib/format';
import { useCrossChainUsdc } from '@/lib/hooks/useCrossChainUsdc';
import { usePendingUsdcMoves } from '@/lib/hooks/usePendingUsdcMoves';
import { NETWORK_MODE } from '@/lib/wagmi';
import { OnrampModal } from './OnrampModal';
import { PendingUsdcMoves } from './PendingUsdcMoves';

export function UsdcCashPanel() {
  const { address, isConnected } = useAccount();
  const { balances, total, isLoading } = useCrossChainUsdc(address);
  const { inTransit } = usePendingUsdcMoves(address);
  const [product, setProduct] = useState<'BUY' | 'SELL' | null>(null);
  const mainnet = NETWORK_MODE === 'mainnet';
  const displayTotal = total + inTransit;

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
    <section className="flex flex-col gap-4 md:rounded-2xl md:border md:border-border md:bg-white/[0.02] md:p-6">
      <div>
        <p className="text-xs text-ink/45 mb-1">USDC in this wallet</p>
        <h2 className="text-[34px] md:text-3xl font-semibold font-mono text-ink tracking-tight leading-none">
          {isLoading ? '…' : `$${formatUsdcUsd(displayTotal)}`}
        </h2>
        {inTransit > 0n && (
          <p className="text-xs text-accent mt-1.5 font-mono">
            ${formatUsdcUsd(inTransit)} moving between networks
          </p>
        )}
        <p className="md:hidden text-xs text-ink/40 mt-2">
          In your wallet · not a yield position. Cash out is Transak.
        </p>
        <p className="hidden md:block text-sm text-ink/50 mt-2 leading-relaxed max-w-xl">
          Native USDC on Ethereum, Base, and Arbitrum. Openhand never holds it. Cash out is Transak
          (CAD / Interac) — they process the fiat, not us. Idle USDC here is not a yield position.
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

      {address && <PendingUsdcMoves address={address} />}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setProduct('BUY')}
          className="min-h-11 rounded-xl bg-accent text-paper font-medium text-sm touch-manipulation"
        >
          Buy
        </button>
        <button
          type="button"
          onClick={() => setProduct('SELL')}
          disabled={mainnet && total === 0n}
          className="min-h-11 rounded-xl border border-border text-sm touch-manipulation disabled:opacity-40"
        >
          Cash out
        </button>
        <Link
          href="/move"
          className="min-h-11 rounded-xl border border-border text-sm flex items-center justify-center touch-manipulation"
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
