import { getAddress, isAddress } from 'viem';
import { type StockChainId } from '@/lib/config/lifi';

/**
 * Address-keyed CoinGecko tokenized-stock market data, matched onto LI.FI catalog
 * rows by {chain, contract address} rather than by symbol.
 *
 * Symbol-only matching (the original implementation) silently misattributes cap/price
 * when two issuers wrap the same underlying stock under the same ticker (e.g. multiple
 * wrapped TSLA products) — see BUILD_SPEC Phase 1. CoinGecko's `/coins/markets` endpoint
 * has no contract-address field, so the map is built from two calls:
 *   1. `/coins/markets?category=tokenized-stock` — cap, 24h %, and CoinGecko's own
 *      `last_updated` per coin id (used for the staleness flag below).
 *   2. `/coins/list?include_platform=true` — every CoinGecko coin id's contract address
 *      per chain (`platforms`), used only to look up the ids from (1).
 * Joining on CoinGecko's own id keeps this "maintained" without hand-typing a single
 * contract address into the codebase (non-negotiable #5 requires citing a source for
 * any address written into config — this map is built from CoinGecko's data at fetch
 * time, not authored here).
 *
 * https://docs.coingecko.com/v3.0.1/reference/coins-markets
 * https://docs.coingecko.com/v3.0.1/reference/coins-list
 */
const COINGECKO_TOKENIZED_STOCKS_CATEGORY =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=tokenized-stock&order=market_cap_desc&per_page=250&page=1';

const COINGECKO_COIN_LIST_WITH_PLATFORMS =
  'https://api.coingecko.com/api/v3/coins/list?include_platform=true';

/** CoinGecko asset-platform id -> the chain ids this app already tracks for stocks. */
const PLATFORM_TO_CHAIN_ID: Record<string, StockChainId> = {
  ethereum: 1,
  base: 8453,
  'arbitrum-one': 42161,
};

/** In-memory cache TTL — bounds CoinGecko calls as the catalog grows (Phase 1 P1). */
const MARKET_DATA_TTL_MS = 10 * 60 * 1000;

/** Beyond this age, a row's cap is flagged stale instead of shown as a live number. */
export const MARKET_DATA_STALE_MINUTES = 15;

export interface TokenizedStockMarketStats {
  cgeckoId: string;
  canonicalSymbol: string;
  marketCapUsd: number;
  changePct24h?: number;
  /** CoinGecko's own `last_updated` for this row — the real freshness signal, not our fetch time. */
  lastUpdatedAt: string;
  stale: boolean;
}

/** A CoinGecko tokenized-stock coin with no contract address on any chain this app tracks. */
export interface UncoveredCoingeckoStock {
  cgeckoId: string;
  symbol: string;
  marketCapUsd: number;
}

interface CoinGeckoMarketRow {
  id?: unknown;
  symbol?: unknown;
  market_cap?: unknown;
  price_change_percentage_24h?: unknown;
  last_updated?: unknown;
}

interface CoinGeckoListRow {
  id?: unknown;
  symbol?: unknown;
  platforms?: unknown;
}

function parseMarketCap(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

function parseChangePct24h(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return undefined;
  if (Math.abs(raw) > 10_000) return undefined;
  return raw;
}

function parseLastUpdatedAt(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  return Number.isFinite(Date.parse(raw)) ? raw : null;
}

function isStale(lastUpdatedAt: string): boolean {
  const t = Date.parse(lastUpdatedAt);
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > MARKET_DATA_STALE_MINUTES * 60 * 1000;
}

interface MarketRow {
  symbol: string;
  marketCapUsd: number;
  changePct24h?: number;
  lastUpdatedAt: string;
}

interface CachedMarketData {
  /** Keyed `${chainId}-${address.toLowerCase()}`. */
  byAddress: Map<string, TokenizedStockMarketStats>;
  /** CoinGecko tokenized-stock coins whose `platforms` had no address on a tracked chain. */
  uncovered: UncoveredCoingeckoStock[];
  fetchedAt: number;
}

let cache: CachedMarketData | null = null;
let inflight: Promise<CachedMarketData> | null = null;

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'openhand.online' },
      // This module owns its own freshness via the in-memory cache below.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function buildMarketData(): Promise<CachedMarketData> {
  const [marketsJson, listJson] = await Promise.all([
    fetchJson(COINGECKO_TOKENIZED_STOCKS_CATEGORY),
    fetchJson(COINGECKO_COIN_LIST_WITH_PLATFORMS),
  ]);

  const marketsById = new Map<string, MarketRow>();
  if (Array.isArray(marketsJson)) {
    for (const row of marketsJson as CoinGeckoMarketRow[]) {
      if (!row || typeof row !== 'object') continue;
      if (typeof row.id !== 'string' || typeof row.symbol !== 'string') continue;
      const marketCapUsd = parseMarketCap(row.market_cap);
      const lastUpdatedAt = parseLastUpdatedAt(row.last_updated);
      if (marketCapUsd === null || !lastUpdatedAt) continue;
      marketsById.set(row.id, {
        symbol: row.symbol.trim(),
        marketCapUsd,
        changePct24h: parseChangePct24h(row.price_change_percentage_24h),
        lastUpdatedAt,
      });
    }
  }

  const byAddress = new Map<string, TokenizedStockMarketStats>();
  const matchedIds = new Set<string>();
  if (Array.isArray(listJson)) {
    for (const row of listJson as CoinGeckoListRow[]) {
      if (!row || typeof row !== 'object' || typeof row.id !== 'string') continue;
      const market = marketsById.get(row.id);
      if (!market) continue;
      const platforms = row.platforms;
      if (!platforms || typeof platforms !== 'object') continue;
      for (const [platformId, addrRaw] of Object.entries(platforms as Record<string, unknown>)) {
        const chainId = PLATFORM_TO_CHAIN_ID[platformId];
        if (!chainId || typeof addrRaw !== 'string' || !addrRaw || !isAddress(addrRaw)) continue;
        let address: string;
        try {
          address = getAddress(addrRaw).toLowerCase();
        } catch {
          continue;
        }
        byAddress.set(`${chainId}-${address}`, {
          cgeckoId: row.id,
          canonicalSymbol: market.symbol,
          marketCapUsd: market.marketCapUsd,
          changePct24h: market.changePct24h,
          lastUpdatedAt: market.lastUpdatedAt,
          stale: isStale(market.lastUpdatedAt),
        });
        matchedIds.add(row.id);
      }
    }
  }

  const uncovered: UncoveredCoingeckoStock[] = [...marketsById.entries()]
    .filter(([id]) => !matchedIds.has(id))
    .map(([cgeckoId, market]) => ({
      cgeckoId,
      symbol: market.symbol,
      marketCapUsd: market.marketCapUsd,
    }))
    .sort((a, b) => b.marketCapUsd - a.marketCapUsd);

  return { byAddress, uncovered, fetchedAt: Date.now() };
}

async function getMarketData(): Promise<CachedMarketData> {
  if (cache && Date.now() - cache.fetchedAt < MARKET_DATA_TTL_MS) return cache;
  if (inflight) return inflight;
  inflight = buildMarketData()
    .then((result) => {
      cache = result;
      return result;
    })
    .catch((error) => {
      if (cache) return cache;
      throw error;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Address-keyed CoinGecko stats for the tokenized-stock tape. Empty map on any failure. */
export async function fetchStockMarketStatsByAddress(): Promise<
  Map<string, TokenizedStockMarketStats>
> {
  try {
    return (await getMarketData()).byAddress;
  } catch {
    return new Map();
  }
}

/** CoinGecko tokenized-stock coins this app has no chain/address coverage for. For the admin view. */
export async function fetchUncoveredCoingeckoStocks(): Promise<UncoveredCoingeckoStock[]> {
  try {
    return (await getMarketData()).uncovered;
  } catch {
    return [];
  }
}
