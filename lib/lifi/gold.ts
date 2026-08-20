import { getAddress, isAddress } from 'viem';
import {
  TOKENIZED_GOLD,
  type TokenizedGoldIssuer,
} from '@/lib/config/addresses';
import {
  LIFI_API_URL,
  STOCK_CHAIN_IDS,
  isStockChainId,
  lifiApiHeaders,
  type StockChainId,
} from '@/lib/config/lifi';

/**
 * Official PAXG and XAUt only. Skip if LI.FI has no parseable price.
 * Never guess a price, cap, or 24h %. No L2 lookalikes.
 */

export const GOLD_ISSUER_LABEL: Record<TokenizedGoldIssuer, string> = {
  paxos: 'Paxos',
  tether: 'Tether',
};

export interface GoldToken {
  id: string;
  chainId: StockChainId;
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  issuer: TokenizedGoldIssuer;
  priceUsd: number;
  marketCapUsd?: number;
  changePct24h?: number;
  logoURI?: string;
}

interface RawToken {
  address?: unknown;
  chainId?: unknown;
  symbol?: unknown;
  name?: unknown;
  decimals?: unknown;
  priceUSD?: unknown;
  logoURI?: unknown;
}

interface GeckoStats {
  marketCapUsd: number;
  changePct24h?: number;
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

const GOLD_BY_ADDRESS = new Map<string, (typeof TOKENIZED_GOLD)[number]>(
  TOKENIZED_GOLD.map((spec) => [`${spec.chainId}:${spec.address.toLowerCase()}`, spec]),
);

export function isAllowlistedGoldToken(chainId: number, token: `0x${string}`): boolean {
  if (!isStockChainId(chainId) || !isAddress(token)) return false;
  return GOLD_BY_ADDRESS.has(`${chainId}:${token.toLowerCase()}`);
}

function toGoldToken(raw: RawToken): GoldToken | null {
  const chainId = typeof raw.chainId === 'number' ? raw.chainId : Number(raw.chainId);
  if (!isStockChainId(chainId)) return null;
  if (typeof raw.address !== 'string' || !isAddress(raw.address)) return null;
  if (typeof raw.symbol !== 'string' || typeof raw.name !== 'string') return null;
  const spec = GOLD_BY_ADDRESS.get(`${chainId}:${raw.address.toLowerCase()}`);
  if (!spec) return null;
  const decimals = parseDecimals(raw.decimals);
  const priceUsd = parsePriceUsd(raw.priceUSD);
  if (decimals === null || priceUsd === null) return null;
  let address: `0x${string}`;
  try {
    address = getAddress(raw.address);
  } catch {
    return null;
  }
  const logoURI =
    typeof raw.logoURI === 'string' && raw.logoURI.startsWith('https://')
      ? raw.logoURI
      : undefined;
  return {
    id: `${spec.geckoId}-${chainId}-${address.toLowerCase()}`,
    chainId,
    address,
    symbol: raw.symbol.trim() || spec.symbol,
    name: raw.name.trim(),
    decimals,
    issuer: spec.issuer,
    priceUsd,
    logoURI,
  };
}

async function fetchGeckoGoldStats(): Promise<Map<string, GeckoStats>> {
  const ids = TOKENIZED_GOLD.map((s) => s.geckoId).join(',');
  const out = new Map<string, GeckoStats>();
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}`,
      {
        headers: { Accept: 'application/json', 'User-Agent': 'openhand.online' },
        next: { revalidate: 120 },
      },
    );
    if (!res.ok) return out;
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return out;
    for (const row of json) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.id !== 'string') continue;
      const cap = parseMarketCap(rec.market_cap);
      if (cap === null) continue;
      const stats: GeckoStats = { marketCapUsd: cap };
      const change = parseChangePct24h(rec.price_change_percentage_24h);
      if (change !== undefined) stats.changePct24h = change;
      out.set(rec.id, stats);
    }
  } catch {
    return out;
  }
  return out;
}

export function compareGoldTape(a: GoldToken, b: GoldToken): number {
  const aCap = a.marketCapUsd;
  const bCap = b.marketCapUsd;
  if (aCap !== undefined && bCap !== undefined && aCap !== bCap) return bCap - aCap;
  if (aCap !== undefined && bCap === undefined) return -1;
  if (aCap === undefined && bCap !== undefined) return 1;
  return a.symbol.localeCompare(b.symbol);
}

export async function fetchGoldCatalog(): Promise<GoldToken[]> {
  const qs = new URLSearchParams({
    chains: STOCK_CHAIN_IDS.join(','),
    chainTypes: 'EVM',
  });
  const res = await fetch(`${LIFI_API_URL}/v1/tokens?${qs.toString()}`, {
    headers: lifiApiHeaders(),
    next: { revalidate: 120 },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { tokens?: Record<string, RawToken[]> };
  const byChain = json?.tokens;
  if (!byChain || typeof byChain !== 'object') return [];

  const found = new Map<string, GoldToken>();
  for (const id of STOCK_CHAIN_IDS) {
    const rows = byChain[String(id)];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const token = toGoldToken({ ...row, chainId: id });
      if (!token) continue;
      found.set(token.id, token);
    }
  }

  const gecko = await fetchGeckoGoldStats();
  const out = [...found.values()].map((token) => {
    const spec = TOKENIZED_GOLD.find(
      (s) =>
        s.chainId === token.chainId && s.address.toLowerCase() === token.address.toLowerCase(),
    );
    if (!spec) return token;
    const stats = gecko.get(spec.geckoId);
    if (!stats) return token;
    return {
      ...token,
      marketCapUsd: stats.marketCapUsd,
      ...(stats.changePct24h !== undefined ? { changePct24h: stats.changePct24h } : {}),
    };
  });
  out.sort(compareGoldTape);
  return out;
}
