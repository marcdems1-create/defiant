'use client';

import { useMemo, useState } from 'react';
import { stockChainLabel } from '@/lib/config/lifi';
import { MIN_24H_VOLUME_USD, computeStockArbRows, type StockArbRow } from '@/lib/lifi/stockArb';
import type { StockToken } from '@/lib/lifi/stocks';

const PANEL_ROW_LIMIT = 15;

function formatUsd(n: number): string {
  return n.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return formatUsd(n);
}

/**
 * Cross-chain spread tape (BUILD_SPEC Phase 3). Same underlying stock, priced
 * differently by LI.FI on two chains. Not a recommendation, not an executed arb —
 * the app has no cross-chain atomic execution; the "Buy cheaper leg" action is a
 * same-chain swap into the lower-priced instance via the existing quote flow.
 */
export function StockArbPanel({
  tokens,
  onTrade,
}: {
  tokens: StockToken[];
  onTrade: (token: StockToken, side: 'buy' | 'sell') => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const rows = useMemo(() => computeStockArbRows(tokens), [tokens]);
  const visible = expanded ? rows.slice(0, PANEL_ROW_LIMIT) : rows.slice(0, 5);

  function tradeLowLeg(row: StockArbRow) {
    const token = tokens.find(
      (t) => t.cgeckoId === row.cgeckoId && t.chainId === row.lowLeg.chainId,
    );
    if (token) onTrade(token, 'buy');
  }

  if (rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-white/[0.02] p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-medium">Cross-chain spread</h3>
        <p className="text-xs text-ink/45 mt-1 leading-relaxed">
          Same tokenized stock, priced differently by LI.FI across chains — a reorder of
          live data, not a recommendation. Grouped by CoinGecko&apos;s coin id (Phase 1&apos;s
          matched identity), not by ticker, so this never mixes up two issuers&apos; products.
          Rows below {formatVolume(MIN_24H_VOLUME_USD)} in CoinGecko 24h volume are marked
          non-executable — that is a coarse proxy, not verified on-chain liquidity, so treat
          even &ldquo;executable&rdquo; rows as needing your own slippage check before sizing a
          trade.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {visible.map((row) => (
          <li key={row.cgeckoId} className="py-2.5 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm truncate">{row.symbol}</div>
              <div className="text-xs text-ink/45 truncate font-mono">
                {stockChainLabel(row.lowLeg.chainId)} {formatUsd(row.lowLeg.priceUsd)}
                {' → '}
                {stockChainLabel(row.highLeg.chainId)} {formatUsd(row.highLeg.priceUsd)}
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[4.5rem]">
              <div className="font-mono text-sm text-accent">+{row.spreadPct.toFixed(2)}%</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/35">
                {row.volume24hUsd !== undefined ? `Vol ${formatVolume(row.volume24hUsd)}` : 'No vol data'}
              </div>
            </div>
            {row.liquidityOk ? (
              <button
                type="button"
                onClick={() => tradeLowLeg(row)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
              >
                Buy cheaper leg
              </button>
            ) : (
              <span className="shrink-0 px-3 py-1.5 rounded-lg border border-warn/30 text-warn/80 text-[11px]">
                Non-executable
              </span>
            )}
          </li>
        ))}
      </ul>
      {rows.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-accent hover:underline self-start"
        >
          {expanded ? 'Show fewer' : `Show ${Math.min(rows.length, PANEL_ROW_LIMIT) - 5} more`}
        </button>
      )}
    </div>
  );
}
