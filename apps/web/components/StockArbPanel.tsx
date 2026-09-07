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
 * Cross-chain spread tape (BUILD_SPEC Phase 3 + Phase 3b). Every row here already
 * cleared a real round-trip verification (lib/lifi/stockArb.ts): a quote to buy the cheap
 * leg, then a second, cross-chain quote bridging those exact tokens to the expensive
 * chain and selling there. netSpreadPct nets out both legs' fees and price impact — it is
 * not the buy-only estimate Phase 3 shipped first (see CLAUDE.md 2026-09-05).
 *
 * Still true even for a verified row: this app only executes the BUY leg today.
 * "Buy cheaper leg" opens the existing same-chain swap flow (Phase 2). Completing the
 * round trip — bridging the tokens just bought and selling on the other chain — is not
 * yet a button here; the quote proves it's possible, not that this app will do it for you.
 *
 * `rows` come pre-verified server-side — this component is purely presentational.
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
          live data, not a recommendation. Grouped by CoinGecko&apos;s coin id (Phase
          1&apos;s matched identity), not by ticker, so this never mixes up two
          issuers&apos; products. Every row below passed a real round-trip check: a quote
          to buy the cheap leg, then a second quote to bridge those tokens to the
          expensive chain and sell there — the % is net of both legs&apos; fees and price
          impact. It is still two separate signed steps, not one atomic transaction, so the
          price can move between them, and <strong>this app only executes the buy step
          today</strong> — completing the bridge + sell happens outside the app for now.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-border/60">
        {visible.map((row) => (
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
                {row.bridgeTool ? ` · via ${row.bridgeTool}` : ''}
              </div>
            </div>
            <div className="text-right shrink-0 min-w-[5rem]">
              <div className="font-mono text-sm text-accent">{formatPct(row.netSpreadPct)}</div>
              <div className="text-[10px] uppercase tracking-wide text-ink/35">round-trip net</div>
            </div>
            <button
              type="button"
              onClick={() => tradeLowLeg(row)}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-accent text-paper text-xs font-medium"
            >
              Buy cheaper leg
            </button>
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
