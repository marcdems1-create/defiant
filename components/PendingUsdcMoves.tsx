'use client';

import Link from 'next/link';
import { chainName, formatUsdcUsd, txExplorerUrl } from '@/lib/format';
import { usePendingUsdcMoves } from '@/lib/hooks/usePendingUsdcMoves';
import type { StoredUsdcMove } from '@/lib/bridge/pending';

function amountLabel(row: StoredUsdcMove): string {
  try {
    return formatUsdcUsd(BigInt(row.toAmount || row.fromAmount));
  } catch {
    return '0';
  }
}

function statusCopy(row: StoredUsdcMove): string {
  if (row.status === 'FAILED') {
    return 'This move failed. Your USDC should still be in the source wallet — check the transaction.';
  }
  if (row.status === 'DONE') {
    return row.protocolLabel
      ? `Arrived on ${chainName(row.toChainId)}. It is still in this wallet, not yet in ${row.protocolLabel}. Deposit to start earning.`
      : `Arrived on ${chainName(row.toChainId)}. It is still in this wallet — not a yield position until you deposit.`;
  }
  return `Moving to ${chainName(row.toChainId)}. This is not a yield deposit yet — USDC stays in your wallet when it arrives.`;
}

export function PendingUsdcMoves({ address }: { address: `0x${string}` }) {
  const { moves, dismiss } = usePendingUsdcMoves(address);
  if (moves.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {moves.map((row) => {
        const fromUrl = txExplorerUrl(row.fromChainId, row.txHash);
        const toUrl = row.receivingTxHash ? txExplorerUrl(row.toChainId, row.receivingTxHash) : null;
        const finishHref = row.opportunityId
          ? `/opportunities/${encodeURIComponent(row.opportunityId)}?deposit=1`
          : '/';
        return (
          <div
            key={row.txHash}
            className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
              row.status === 'FAILED'
                ? 'border-danger/30 bg-danger/5'
                : 'border-accent/25 bg-accent/5'
            }`}
          >
            <div className="font-medium">
              ${amountLabel(row)} USDC · {chainName(row.fromChainId)} → {chainName(row.toChainId)}
            </div>
            <p className="text-xs text-ink/65 mt-1">{statusCopy(row)}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs">
              {fromUrl && (
                <a href={fromUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Source tx
                </a>
              )}
              {toUrl && (
                <a href={toUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                  Arrival tx
                </a>
              )}
              <a
                href={`https://scan.li.fi/tx/${row.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Track route
              </a>
              {row.status !== 'FAILED' && (
                <Link href={finishHref} className="text-accent hover:underline">
                  {row.protocolLabel ? `Deposit into ${row.protocolLabel}` : 'Browse the collection'}
                </Link>
              )}
              {row.status !== 'PENDING' && (
                <button type="button" onClick={() => dismiss(row.txHash)} className="text-ink/45 hover:text-ink">
                  Dismiss
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
