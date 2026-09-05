'use client';

import { useState } from 'react';
import { stockChainLabel } from '@/lib/config/lifi';
import type { StockArbRow } from '@/lib/lifi/stockArb';
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

function formatPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

/**
 * Cross-chain spread tape (BUILD_SPEC Phase 3). Same underlying stock, priced
 * differently by LI.FI on two chains. Not a recommendation, not an executed arb —
 * the app has no cross-chain atomic execution; the "Buy cheaper leg" action is a
 * same-chain swap into the lower-priced instance via the existing quote flow.
 *
 * `rows` come pre-computed (grouping + gross spread) and fee/liquidity-enriched
 * server-side (lib/lifi/stockArb.ts) — this component is purely presentational.
 */
export function StockArbPanel({
  rows,
  tokens,
  onTrade,
}: {
  rows: StockArbRow[];
  tokens: StockToken[];
  onTrade: (token: StockToken, side: 'buy' | 'sell') => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
          Net % is gross spread minus a real LI.FI quote&apos;s fee and price impact on a
          $1,000 probe buy of the cheaper leg — not just the raw quote. Rows marked
          &ldquo;unverified&rdquo; couldn&apos;t get that quote; treat their number as gross
          only. There is no cross-chain auto-execution here — buying the cheap leg is the
          actionable step, not a guaranteed round trip.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {visible.map((row) => {
          const displayPct = row.netSpreadPct ?? row.grossSpreadPct;
          const executable = row.enrichmentVerified && row.liquidityOk;
          return (
            <li key={row.cgeckoId} className="py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {row.symbol}
                  {row.matchStale && (
                    <span className="ml-1.5 text-[10px] uppercase tracking-wide text-warn/80">
                      stale match
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink/45 truncate font-mono">
                  {stockChainLabel(row.lowLeg.chainId)} {formatUsd(row.lowLeg.priceUsd)}
                  {' → '}
                  {stockChainLabel(row.highLeg.chainId)} {formatUsd(row.highLeg.priceUsd)}
                </div>
              </div>
              <div className="text-right shrink-0 min-w-[5rem]">
                <div className="font-mono text-sm text-accent">{formatPct(displayPct)}</div>
                <div className="text-[10px] uppercase tracking-wide text-ink/35">
                  {row.enrichmentVerified ? 'net' : 'gross · unverified'}
                </div>
              </div>
              {executable ? (
                <button
                  type="button"
                  onClick={() => tradeLowLeg(row)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
                >
                  Buy cheaper leg
                </button>
              ) : (
                <span className="shrink-0 px-3 py-1.5 rounded-lg border border-warn/30 text-warn/80 text-[11px]">
                  {row.enrichmentVerified ? 'Non-executable' : 'Unverified'}
                </span>
              )}
            </li>
          );
        })}
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
