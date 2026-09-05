import { getAddress } from 'viem';
import { usdcOnStockChain, type StockChainId } from '@/lib/config/lifi';
import { fetchLifiQuote, fetchStockCatalog, withStockMarketCaps, type StockToken } from '@/lib/lifi/stocks';

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
 * signal here; it is Phase 1's divergence check instead (StockToken#priceDivergencePct),
 * which is cross-*source* (LI.FI vs CoinGecko, same chain), not cross-*chain*.
 *
 * Two-stage pipeline, per the spec's suggested sequencing:
 *   1. computeRawArbRows — sync, free, grouping + gross spread from data already fetched.
 *   2. enrichArbRows — async, fires a real LI.FI quote per candidate row (bounded to the
 *      top ARB_ENRICH_LIMIT by gross spread) to get a fee + price-impact based net spread
 *      and liquidity read. This is the only part of Phase 3 that makes new network calls,
 *      and the least-tested: it has never run against live LI.FI data (see CLAUDE.md).
 */

/** Below this gross spread, treat it as noise — not worth the cost of an enrichment quote. */
export const MIN_SPREAD_PCT = 0.5;

/** Only fire enrichment quotes for the top N raw rows by gross spread, to bound LI.FI calls. */
export const ARB_ENRICH_LIMIT = 12;

/** Notional size (whole USD) used to probe each low leg's buy-side price impact and fee. */
export const ARB_PROBE_NOTIONAL_USD = 1000;

/**
 * Above this price impact (probe notional vs. the leg's own listed spot price), treat the
 * leg as too thin to trust at meaningful size. This is a real quote-derived number, not a
 * proxy — but it is still only one quote at one size, not verified pool depth.
 */
export const MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY = 1.5;

/** Circle USDC is 6 decimals on every chain this app tracks — same assumption as lib/protocols/*.ts. */
const USDC_DECIMALS = 6;
const ARB_PROBE_USDC_RAW = BigInt(ARB_PROBE_NOTIONAL_USD) * 10n ** BigInt(USDC_DECIMALS);

/**
 * Well-known burn address, used only as the `fromAddress` LI.FI's quote endpoint requires.
 * Never signs or sends anything — enrichment only ever calls fetchLifiQuote (a GET), never
 * a transaction. getAddress() normalizes the checksum so a wrong-case literal here can't
 * silently cause every enrichment quote to fail on address validation.
 */
const ARB_QUOTE_PROBE_ADDRESS = getAddress('0x000000000000000000000000000000000000dead');

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
  /** (highLeg - lowLeg) / lowLeg, in percent. Raw, before fees or price impact. */
  grossSpreadPct: number;
  /**
   * grossSpreadPct minus the LI.FI-quoted fee and any adverse price impact buying the low
   * leg at ARB_PROBE_NOTIONAL_USD. Undefined until enrichment succeeds — never fabricated
   * as equal to gross, and never defaulted to 0 fees on a failed quote.
   */
  netSpreadPct?: number;
  /** Percent of the probe notional LI.FI quoted as fee, when enrichment succeeded. */
  feePctOfNotional?: number;
  /** Implied price impact vs. the leg's own listed price, when enrichment succeeded. Positive = adverse. */
  priceImpactPct?: number;
  /**
   * True only once enrichArbRows has run a real quote for this row. False means
   * netSpreadPct/priceImpactPct are unset and liquidityOk should be read as "unknown," not
   * "bad" — either the row wasn't in the top ARB_ENRICH_LIMIT, or the quote failed.
   */
  enrichmentVerified: boolean;
  /** True only when enrichmentVerified and priceImpactPct is within MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY. */
  liquidityOk: boolean;
  /** CoinGecko 24h volume for the matched coin, when parseable. Context only — does not gate liquidityOk. */
  volume24hUsd?: number;
  /** True when either leg's CoinGecko match is flagged stale (see MARKET_DATA_STALE_MINUTES). */
  matchStale: boolean;
}

/**
 * Sync grouping + gross spread from an already CoinGecko-matched catalog (i.e. the output
 * of `withStockMarketCaps`). Pass the full multi-chain catalog, not a chain-filtered or
 * `preferOneChainPerSymbol`-deduped view — the whole point is comparing chain instances
 * against each other. Rows are not yet fee/liquidity-verified — see enrichArbRows.
 */
export function computeRawArbRows(tokens: StockToken[]): StockArbRow[] {
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
    const grossSpreadPct = ((highLeg.priceUsd - lowLeg.priceUsd) / lowLeg.priceUsd) * 100;
    if (grossSpreadPct < MIN_SPREAD_PCT) continue;

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
      grossSpreadPct,
      enrichmentVerified: false,
      liquidityOk: false,
      volume24hUsd,
      matchStale: group.some((t) => t.capStale === true),
    });
  }

  rows.sort((a, b) => b.grossSpreadPct - a.grossSpreadPct);
  return rows;
}

async function enrichArbRow(row: StockArbRow): Promise<StockArbRow> {
  const usdc = usdcOnStockChain(row.lowLeg.chainId);
  if (!usdc) return row;
  try {
    const quote = await fetchLifiQuote({
      chainId: row.lowLeg.chainId,
      fromToken: usdc,
      toToken: row.lowLeg.address,
      fromAmount: ARB_PROBE_USDC_RAW,
      fromAddress: ARB_QUOTE_PROBE_ADDRESS,
    });
    if (!quote) return row;
    const toAmountFloat = Number(quote.toAmount) / 10 ** quote.toDecimals;
    if (!Number.isFinite(toAmountFloat) || toAmountFloat <= 0) return row;

    const impliedPriceUsd = ARB_PROBE_NOTIONAL_USD / toAmountFloat;
    const priceImpactPct = ((impliedPriceUsd - row.lowLeg.priceUsd) / row.lowLeg.priceUsd) * 100;
    const feePctOfNotional =
      quote.protocolFeeUsd !== undefined ? (quote.protocolFeeUsd / ARB_PROBE_NOTIONAL_USD) * 100 : 0;
    const netSpreadPct = row.grossSpreadPct - feePctOfNotional - Math.max(0, priceImpactPct);

    return {
      ...row,
      netSpreadPct,
      feePctOfNotional,
      priceImpactPct,
      enrichmentVerified: true,
      liquidityOk: priceImpactPct <= MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY,
    };
  } catch {
    return row;
  }
}

/**
 * Fee/liquidity-verify the top ARB_ENRICH_LIMIT raw rows by gross spread. Rows beyond that
 * limit, or whose quote failed, come back unchanged (enrichmentVerified: false) rather than
 * guessed — the UI must treat those as "not verified," not "bad." A row with a *verified*
 * net spread at or below zero is dropped entirely: at that point it is not an opportunity,
 * just noise (per the spec's acceptance criteria — unverified rows are not held to this,
 * since we don't yet know their real net spread).
 */
export async function enrichArbRows(rows: StockArbRow[]): Promise<StockArbRow[]> {
  const toEnrich = rows.slice(0, ARB_ENRICH_LIMIT);
  const rest = rows.slice(ARB_ENRICH_LIMIT);
  const enriched = await Promise.all(toEnrich.map(enrichArbRow));
  const combined = [...enriched, ...rest].filter(
    (row) => !(row.enrichmentVerified && row.netSpreadPct !== undefined && row.netSpreadPct <= 0),
  );
  combined.sort((a, b) => (b.netSpreadPct ?? b.grossSpreadPct) - (a.netSpreadPct ?? a.grossSpreadPct));
  return combined;
}

const ARB_CACHE_TTL_MS = 5 * 60 * 1000;
let arbCache: { rows: StockArbRow[]; fetchedAt: number } | null = null;
let arbInflight: Promise<StockArbRow[]> | null = null;

async function buildArbRows(): Promise<StockArbRow[]> {
  const catalog = await withStockMarketCaps(await fetchStockCatalog());
  return enrichArbRows(computeRawArbRows(catalog));
}

/**
 * Cached, enriched cross-chain spread rows. 5-minute TTL (shorter than the catalog's own
 * cache — this fires real LI.FI quotes, which are more expensive/rate-limit-sensitive than
 * a catalog read) with an in-flight guard and stale-cache fallback, same pattern as
 * lib/lifi/marketCap.ts.
 */
export async function fetchStockArbRows(): Promise<StockArbRow[]> {
  if (arbCache && Date.now() - arbCache.fetchedAt < ARB_CACHE_TTL_MS) return arbCache.rows;
  if (arbInflight) return arbInflight;
  arbInflight = buildArbRows()
    .then((rows) => {
      arbCache = { rows, fetchedAt: Date.now() };
      return rows;
    })
    .catch((error) => {
      if (arbCache) return arbCache.rows;
      throw error;
    })
    .finally(() => {
      arbInflight = null;
    });
  return arbInflight;
}
