import { getAddress } from 'viem';
import { usdcOnStockChain, type StockChainId } from '@/lib/config/lifi';
import { fetchLifiQuote, fetchStockCatalog, withStockMarketCaps, type StockToken } from '@/lib/lifi/stocks';

/**
 * Cross-chain spread detection for tokenized stocks (BUILD_SPEC Phase 3 + Phase 3b).
 *
 * A token's chain instances are grouped by CoinGecko's `cgeckoId` — proven-same-asset
 * identity from Phase 1's address-keyed match — never by ticker symbol. Grouping by
 * symbol would reintroduce exactly the misattribution risk Phase 1 was built to remove
 * (two issuers can share a ticker; they do not share a cgeckoId). A token with no
 * CoinGecko match therefore cannot appear in this view — there is no verified identity
 * to group it by, so it is correctly excluded rather than guessed into a group.
 *
 * Three-stage pipeline:
 *   1. computeRawArbRows — sync, free, grouping + gross spread from data already fetched.
 *      Output: StockArbCandidate[] (a raw, unverified price signal only).
 *   2. enrichArbRows — async. For each candidate (bounded to the top ARB_ENRICH_LIMIT by
 *      gross spread), fires a real LI.FI quote to BUY the low leg with a $1,000 probe,
 *      then — Phase 3b — a second, *cross-chain* LI.FI quote that bridges the tokens that
 *      quote would actually produce from the low leg's chain to USDC on the high leg's
 *      chain. That second quote's own routing already accounts for bridge fees and
 *      sell-side slippage in one number, so `netSpreadPct` below is a genuine round-trip
 *      figure — not the buy-only estimate Phase 3 shipped first (see CLAUDE.md
 *      2026-09-05 for why that shipped mislabeled and got fixed before this).
 *   3. Only candidates that clear BOTH legs' liquidity/impact threshold and end up with a
 *      positive net spread become a StockArbRow at all — anything else is dropped, not
 *      marked. This is a deliberate departure from Phase 1's "never silently drop a row"
 *      stance: a half-verified round-trip number is not a smaller version of the real
 *      thing, it is a different, misleading claim (see Phase 3b's acceptance criteria —
 *      "a verified buy leg with an unverified sell leg is not enough to show a number").
 *
 * What this still does NOT do: execute the second leg. `StockSwapModal` (Phase 2) only
 * ever signs a same-chain swap. After buying the cheap leg, actually bridging it to the
 * expensive chain and selling there is not yet a button in this app — see the "Buy
 * cheaper leg" copy in StockArbPanel.tsx. The number here is a verified quote, not a
 * verified user flow end-to-end.
 */

/** Below this gross spread, treat it as noise — not worth the cost of two probe quotes. */
export const MIN_SPREAD_PCT = 0.5;

/**
 * Only fire probe quotes for the top N raw candidates by gross spread. Phase 3b doubled
 * the external calls per candidate (a buy quote, then — only if that clears the liquidity
 * bar — a cross-chain bridge/sell quote), so this was tightened from Phase 3's original 12.
 */
export const ARB_ENRICH_LIMIT = 8;

/** Notional size (whole USD) used to probe both legs' price impact and fees. */
export const ARB_PROBE_NOTIONAL_USD = 1000;

/**
 * Above this price impact (a probe quote's implied price vs. that leg's own listed spot
 * price), treat the leg as too thin to trust at meaningful size. Applied to both the buy
 * leg and the bridge/sell leg independently — either one failing this bar drops the row.
 * This is a real quote-derived number, not a proxy, but it is still only one quote at one
 * size on one snapshot in time, not verified pool depth.
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

/** Raw, unverified grouping output — stage 1. Never shown to users directly. */
export interface StockArbCandidate {
  cgeckoId: string;
  symbol: string;
  name: string;
  legs: StockArbLeg[];
  highLeg: StockArbLeg;
  lowLeg: StockArbLeg;
  /** (highLeg - lowLeg) / lowLeg, in percent. Raw, before any quote/fee/impact verification. */
  grossSpreadPct: number;
  volume24hUsd?: number;
  matchStale: boolean;
}

/**
 * A fully round-trip-verified spread — every row that made it out of `enrichArbRows` has
 * already cleared both legs' liquidity gate and has a positive `netSpreadPct`. There is no
 * "unverified" or "non-executable" variant of this type; a candidate that doesn't qualify
 * is dropped before it ever becomes one of these (see the module doc comment for why).
 */
export interface StockArbRow extends StockArbCandidate {
  /**
   * True round-trip spread in percent: buy the low leg with $ARB_PROBE_NOTIONAL_USD of
   * USDC, then bridge the tokens that quote actually returns to the high leg's chain and
   * swap to USDC there in a single cross-chain LI.FI quote. (proceeds - notional) /
   * notional. Always positive on a returned row.
   */
  netSpreadPct: number;
  /** Implied price impact vs. the low leg's listed price on the buy quote. Positive = adverse. Diagnostic. */
  buyLegPriceImpactPct: number;
  /** Implied price impact vs. the high leg's listed price on the bridge/sell quote. Positive = adverse. Diagnostic. */
  bridgeLegPriceImpactPct: number;
  /** LI.FI's chosen route for the bridge/sell leg (e.g. "across", "stargate"), when reported. Diagnostic. */
  bridgeTool?: string;
}

/**
 * Sync grouping + gross spread from an already CoinGecko-matched catalog (i.e. the output
 * of `withStockMarketCaps`). Pass the full multi-chain catalog, not a chain-filtered or
 * `preferOneChainPerSymbol`-deduped view — the whole point is comparing chain instances
 * against each other. Output is unverified — see enrichArbRows.
 */
export function computeRawArbRows(tokens: StockToken[]): StockArbCandidate[] {
  const groups = new Map<string, StockToken[]>();
  for (const token of tokens) {
    if (!token.cgeckoId) continue;
    if (!Number.isFinite(token.priceUsd) || token.priceUsd <= 0) continue;
    const group = groups.get(token.cgeckoId);
    if (group) group.push(token);
    else groups.set(token.cgeckoId, [token]);
  }

  const rows: StockArbCandidate[] = [];
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
      volume24hUsd,
      matchStale: group.some((t) => t.capStale === true),
    });
  }

  rows.sort((a, b) => b.grossSpreadPct - a.grossSpreadPct);
  return rows;
}

async function verifyArbCandidate(candidate: StockArbCandidate): Promise<StockArbRow | null> {
  const buyUsdc = usdcOnStockChain(candidate.lowLeg.chainId);
  const sellUsdc = usdcOnStockChain(candidate.highLeg.chainId);
  if (!buyUsdc || !sellUsdc) return null;

  try {
    // Leg 1: buy the cheap leg on its own chain with a $1,000 USDC probe.
    const buyQuote = await fetchLifiQuote({
      chainId: candidate.lowLeg.chainId,
      fromToken: buyUsdc,
      toToken: candidate.lowLeg.address,
      fromAmount: ARB_PROBE_USDC_RAW,
      fromAddress: ARB_QUOTE_PROBE_ADDRESS,
    });
    if (!buyQuote || buyQuote.toAmount <= 0n) return null;

    const tokensBoughtFloat = Number(buyQuote.toAmount) / 10 ** buyQuote.toDecimals;
    if (!Number.isFinite(tokensBoughtFloat) || tokensBoughtFloat <= 0) return null;

    // Paying more per token than the leg's own listed price is adverse — positive = worse.
    const buyImpliedPriceUsd = ARB_PROBE_NOTIONAL_USD / tokensBoughtFloat;
    const buyLegPriceImpactPct =
      ((buyImpliedPriceUsd - candidate.lowLeg.priceUsd) / candidate.lowLeg.priceUsd) * 100;
    if (buyLegPriceImpactPct > MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY) return null;

    // Leg 2 (Phase 3b): bridge the tokens leg 1 would actually produce to the expensive
    // chain and swap to USDC there, in one cross-chain quote — this is what makes
    // netSpreadPct a real round-trip figure instead of a buy-only estimate.
    const bridgeQuote = await fetchLifiQuote({
      chainId: candidate.lowLeg.chainId,
      toChainId: candidate.highLeg.chainId,
      fromToken: candidate.lowLeg.address,
      toToken: sellUsdc,
      fromAmount: buyQuote.toAmount,
      fromAddress: ARB_QUOTE_PROBE_ADDRESS,
    });
    if (!bridgeQuote || bridgeQuote.toAmount <= 0n) return null;

    const proceedsUsd = Number(bridgeQuote.toAmount) / 10 ** bridgeQuote.toDecimals;
    if (!Number.isFinite(proceedsUsd) || proceedsUsd <= 0) return null;

    // Receiving less per token than the leg's own listed price is adverse here — same
    // "positive = worse" convention as the buy leg, against the same listed-price basis.
    const bridgeImpliedSellPriceUsd = proceedsUsd / tokensBoughtFloat;
    const bridgeLegPriceImpactPct =
      ((candidate.highLeg.priceUsd - bridgeImpliedSellPriceUsd) / candidate.highLeg.priceUsd) * 100;
    if (bridgeLegPriceImpactPct > MAX_PRICE_IMPACT_PCT_FOR_LIQUIDITY) return null;

    const netSpreadPct = ((proceedsUsd - ARB_PROBE_NOTIONAL_USD) / ARB_PROBE_NOTIONAL_USD) * 100;
    if (netSpreadPct <= 0) return null;

    return {
      ...candidate,
      netSpreadPct,
      buyLegPriceImpactPct,
      bridgeLegPriceImpactPct,
      bridgeTool: bridgeQuote.tool,
    };
  } catch {
    return null;
  }
}

/**
 * Round-trip-verify the top ARB_ENRICH_LIMIT raw candidates by gross spread. A candidate
 * that fails either leg's quote, either leg's liquidity gate, or ends up net non-positive
 * is dropped entirely — see the module doc comment for why this departs from Phase 1's
 * "mark, don't hide" stance. Candidates beyond the limit are dropped too, unverified.
 */
export async function enrichArbRows(candidates: StockArbCandidate[]): Promise<StockArbRow[]> {
  const toVerify = candidates.slice(0, ARB_ENRICH_LIMIT);
  const settled = await Promise.all(toVerify.map(verifyArbCandidate));
  const rows = settled.filter((row): row is StockArbRow => row !== null);
  rows.sort((a, b) => b.netSpreadPct - a.netSpreadPct);
  return rows;
}

const ARB_CACHE_TTL_MS = 10 * 60 * 1000;
let arbCache: { rows: StockArbRow[]; fetchedAt: number } | null = null;
let arbInflight: Promise<StockArbRow[]> | null = null;

async function buildArbRows(): Promise<StockArbRow[]> {
  const catalog = await withStockMarketCaps(await fetchStockCatalog());
  return enrichArbRows(computeRawArbRows(catalog));
}

/**
 * Cached, round-trip-verified cross-chain spread rows. 10-minute TTL — longer than
 * Phase 3's original 5 minutes, since Phase 3b roughly doubled the external LI.FI calls
 * per build (a buy quote, then a bridge quote, per candidate) — with an in-flight guard
 * and stale-cache fallback, same pattern as lib/lifi/marketCap.ts.
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
