import { getAddress, isAddress, zeroAddress } from 'viem';
import {
  LIFI_API_URL,
  STOCK_CHAIN_IDS,
  isStockChainId,
  lifiApiHeaders,
  type StockChainId,
} from '@/lib/config/lifi';

/**
 * Spot crypto tape: CoinGecko's largest coins by market cap, matched onto
 * LI.FI tokens we can actually swap (USDC ↔ token). Default UI sort is 24h
 * change — a catalog reorder, not a featured pick or recommendation.
 *
 * Skip stables and unparseable rows. Never guess a price, cap, or 24h %.
 * https://docs.coingecko.com/v3.0.1/reference/coins-markets
 * https://docs.li.fi/api-reference/fetch-all-known-tokens
 */

export const CRYPTO_TAPE_SIZE = 50;

const CHAIN_PREFERENCE: StockChainId[] = [8453, 42161, 1];

const STABLE_SYMBOLS = new Set([
  'usdt',
  'usdc',
  'dai',
  'usds',
  'busd',
  'tusd',
  'fdusd',
  'usdp',
  'pyusd',
  'usde',
  'susde',
  'rlusd',
  'usd1',
  'frax',
  'frxusd',
]);

const COINGECKO_TOP =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1';

export interface CryptoToken {
  id: string;
  chainId: StockChainId;
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd: number;
  marketCapUsd: number;
  changePct24h?: number;
  logoURI?: string;
  native: boolean;
}

interface RawLifiToken {
  address?: unknown;
  chainId?: unknown;
  symbol?: unknown;
  name?: unknown;
  decimals?: unknown;
  priceUSD?: unknown;
  logoURI?: unknown;
  coinKey?: unknown;
  verificationStatus?: unknown;
}

interface GeckoRow {
  id: string;
  symbol: string;
  name: string;
  marketCapUsd: number;
  changePct24h?: number;
  image?: string;
}

export function isNativeLifiToken(address: `0x${string}`): boolean {
  return address.toLowerCase() === zeroAddress;
}

function parsePriceUsd(raw: unknown): number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null;
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return n;
}

function parseDecimals(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n < 0 || n > 18) return null;
  return n;
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

function aliases(geckoId: string, geckoSymbol: string): string[] {
  const s = geckoSymbol.toLowerCase();
  if (geckoId === 'bitcoin' || s === 'btc') return ['btc', 'wbtc', 'cbbtc', 'tbtc'];
  if (geckoId === 'ethereum' || s === 'eth') return ['eth'];
  return [s];
}

async function fetchGeckoTop(): Promise<GeckoRow[]> {
  const out: GeckoRow[] = [];
  try {
    const res = await fetch(COINGECKO_TOP, {
      headers: { Accept: 'application/json', 'User-Agent': 'openhand.online' },
      next: { revalidate: 120 },
    });
    if (!res.ok) return out;
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return out;
    for (const row of json) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.id !== 'string' || typeof rec.symbol !== 'string' || typeof rec.name !== 'string') {
        continue;
      }
      const symbol = rec.symbol.trim().toLowerCase();
      if (!symbol || STABLE_SYMBOLS.has(symbol)) continue;
      const cap = parseMarketCap(rec.market_cap);
      if (cap === null) continue;
      const item: GeckoRow = {
        id: rec.id,
        symbol,
        name: rec.name.trim(),
        marketCapUsd: cap,
      };
      const change = parseChangePct24h(rec.price_change_percentage_24h);
      if (change !== undefined) item.changePct24h = change;
      if (typeof rec.image === 'string' && rec.image.startsWith('https://')) item.image = rec.image;
      out.push(item);
    }
  } catch {
    return [];
  }
  return out;
}

async function fetchLifiRows(): Promise<RawLifiToken[]> {
  const qs = new URLSearchParams({
    chains: STOCK_CHAIN_IDS.join(','),
    chainTypes: 'EVM',
  });
  const res = await fetch(`${LIFI_API_URL}/v1/tokens?${qs.toString()}`, {
    headers: lifiApiHeaders(),
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { tokens?: Record<string, RawLifiToken[]> };
  const byChain = json?.tokens;
  if (!byChain || typeof byChain !== 'object') return [];
  const rows: RawLifiToken[] = [];
  for (const id of STOCK_CHAIN_IDS) {
    const list = byChain[String(id)];
    if (!Array.isArray(list)) continue;
    for (const row of list) rows.push({ ...row, chainId: id });
  }
  return rows;
}

function toCryptoToken(raw: RawLifiToken, gecko: GeckoRow): CryptoToken | null {
  const chainId = typeof raw.chainId === 'number' ? raw.chainId : Number(raw.chainId);
  if (!isStockChainId(chainId)) return null;
  if (typeof raw.address !== 'string' || !isAddress(raw.address)) return null;
  if (typeof raw.symbol !== 'string' || typeof raw.name !== 'string') return null;
  const decimals = parseDecimals(raw.decimals);
  const priceUsd = parsePriceUsd(raw.priceUSD);
  if (decimals === null || priceUsd === null) return null;
  if (raw.verificationStatus === 'unverified') return null;
  let address: `0x${string}`;
  try {
    address = getAddress(raw.address);
  } catch {
    return null;
  }
  const native = isNativeLifiToken(address);
  const logoURI =
    typeof raw.logoURI === 'string' && raw.logoURI.startsWith('https://')
      ? raw.logoURI
      : gecko.image;
  return {
    id: `${gecko.id}-${chainId}-${address.toLowerCase()}`,
    chainId,
    address,
    symbol: raw.symbol.trim(),
    name: raw.name.trim(),
    decimals,
    priceUsd,
    marketCapUsd: gecko.marketCapUsd,
    ...(gecko.changePct24h !== undefined ? { changePct24h: gecko.changePct24h } : {}),
    logoURI,
    native,
  };
}

function chainRank(chainId: StockChainId): number {
  const i = CHAIN_PREFERENCE.indexOf(chainId);
  return i === -1 ? 99 : i;
}

function betterCandidate(next: CryptoToken, prev: CryptoToken, geckoId: string): boolean {
  if (geckoId === 'ethereum') {
    if (next.native !== prev.native) return next.native;
  }
  const c = chainRank(next.chainId) - chainRank(prev.chainId);
  if (c !== 0) return c < 0;
  return false;
}

export function compareCryptoTape(a: CryptoToken, b: CryptoToken): number {
  const ac = a.changePct24h;
  const bc = b.changePct24h;
  if (ac !== undefined && bc !== undefined && ac !== bc) return bc - ac;
  if (ac !== undefined && bc === undefined) return -1;
  if (ac === undefined && bc !== undefined) return 1;
  return b.marketCapUsd - a.marketCapUsd;
}

export async function fetchCryptoCatalog(): Promise<CryptoToken[]> {
  const [gecko, lifi] = await Promise.all([fetchGeckoTop(), fetchLifiRows()]);
  if (gecko.length === 0 || lifi.length === 0) return [];

  const best = new Map<string, CryptoToken>();
  for (const g of gecko) {
    const names = aliases(g.id, g.symbol);
    for (const raw of lifi) {
      if (typeof raw.symbol !== 'string') continue;
      const sym = raw.symbol.trim().toLowerCase();
      if (!names.includes(sym)) continue;
      const token = toCryptoToken(raw, g);
      if (!token) continue;
      const prev = best.get(g.id);
      if (!prev || betterCandidate(token, prev, g.id)) best.set(g.id, token);
    }
  }

  const out = [...best.values()].sort(compareCryptoTape);
  return out.slice(0, CRYPTO_TAPE_SIZE);
}
