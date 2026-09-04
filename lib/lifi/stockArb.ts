import type { StockChainId } from '@/lib/config/lifi';
import type { StockToken } from '@/lib/lifi/stocks';

/**
 * Cross-chain spread detection for tokenized stocks (BUILD_SPEC Phase 3).
 *
 * A token's chain instances are grouped by CoinGecko's `cgeckoId` — proven-same-asset
 * identity from Phase 1's address-keyed match — never by ticker symbol. Grouping by
 * symbol would reintroduce exactly the misattribution risk Phase 1 was built to remove
 * (two issuers can share a ticker; they do not share a cgeckoId). A token with no
 * CoinGecko match therefore cannot appear in this view — there is no verified identity
 * to group it by, so it is correctly excluded rather than guessed into a group.
 *
 * The spread itself compares LI.FI's own priceUSD across chains for the same asset —
 * CoinGecko has one global spot price per coin, not a per-chain one, so it is not the
 * signal here; it is Phase 1's divergence check instead (StockToken#priceDivergencePct).
 */

/**
 * Coarse liquidity gate: CoinGecko's global 24h trading volume for the matched coin.
 * This is NOT on-chain DEX depth on either leg's specific chain — it is the only
 * liquidity-shaped number already on hand without firing a LI.FI quote per row per
 * render. Treat "liquidityOk" as "not obviously illiquid," not as "verified executable."
 * Revisit with a real per-chain liquidity source before trusting this for sizing a trade.
 */
export const MIN_24H_VOLUME_USD = 50_000;

/** Below this spread, treat it as noise rather than a signal worth surfacing. */
export const MIN_SPREAD_PCT = 0.5;

export interface StockArbLeg {
  chainId: StockChainId;
  address: `0x${string}`;
  priceUsd: number;
}

export interface StockArbRow {
  cgeckoId: string;
  symbol: string;
  name: string;
  legs: StockArbLeg[];
  /** The more expensive chain instance. */
  highLeg: StockArbLeg;
  /** The cheaper chain instance — the actionable "buy" side given this app's single-chain swap flow. */
  lowLeg: StockArbLeg;
  spreadPct: number;
  /** CoinGecko 24h volume for the matched coin, when parseable. */
  volume24hUsd?: number;
  /** False when volume24hUsd is missing or below MIN_24H_VOLUME_USD — see the caveat above. */
  liquidityOk: boolean;
}

/**
 * Compute cross-chain spreads from an already CoinGecko-matched catalog (i.e. the output
 * of `withStockMarketCaps`). Pass the full multi-chain catalog, not a chain-filtered or
 * `preferOneChainPerSymbol`-deduped view — the whole point is comparing chain instances
 * against each other.
 */
export function computeStockArbRows(tokens: StockToken[]): StockArbRow[] {
  const groups = new Map<string, StockToken[]>();
  for (const token of tokens) {
    if (!token.cgeckoId) continue;
    if (!Number.isFinite(token.priceUsd) || token.priceUsd <= 0) continue;
    const group = groups.get(token.cgeckoId);
    if (group) group.push(token);
    else groups.set(token.cgeckoId, [token]);
  }

  const rows: StockArbRow[] = [];
  for (const [cgeckoId, group] of groups) {
    if (group.length < 2) continue;
    const legs: StockArbLeg[] = group.map((t) => ({
      chainId: t.chainId,
      address: t.address,
      priceUsd: t.priceUsd,
    }));
    const sorted = [...legs].sort((a, b) => b.priceUsd - a.priceUsd);
    const highLeg = sorted[0];
    const lowLeg = sorted[sorted.length - 1];
    if (lowLeg.priceUsd <= 0 || highLeg.chainId === lowLeg.chainId) continue;
    const spreadPct = ((highLeg.priceUsd - lowLeg.priceUsd) / lowLeg.priceUsd) * 100;
    if (spreadPct < MIN_SPREAD_PCT) continue;

    const sample = group[0];
    const volume24hUsd = group.reduce<number | undefined>((max, t) => {
      if (t.cgVolume24hUsd === undefined) return max;
      return max === undefined ? t.cgVolume24hUsd : Math.max(max, t.cgVolume24hUsd);
    }, undefined);

    rows.push({
      cgeckoId,
      symbol: sample.symbol,
      name: sample.name,
      legs,
      highLeg,
      lowLeg,
      spreadPct,
      volume24hUsd,
      liquidityOk: (volume24hUsd ?? 0) >= MIN_24H_VOLUME_USD,
    });
  }

  rows.sort((a, b) => b.spreadPct - a.spreadPct);
  return rows;
}
