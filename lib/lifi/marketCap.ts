/**
 * CoinGecko tokenized-stock market stats, matched onto LI.FI catalog symbols.
 * LI.FI's /v1/tokens has priceUSD only — no market cap or 24h change
 * (https://docs.li.fi/api-reference/fetch-all-known-tokens).
 * Skip on parse failure; never guess a cap or a change.
 *
 * Caps are the *token's* CoinGecko market cap, not the listed company's equity cap.
 * https://docs.coingecko.com/v3.0.1/reference/coins-markets
 */
const COINGECKO_TOKENIZED_STOCKS =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=tokenized-stock&order=market_cap_desc&per_page=250&page=1';

export interface TokenizedStockMarketStats {
  marketCapUsd: number;
  /** CoinGecko 24h price change in percent. Omitted when unparseable. */
  changePct24h?: number;
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

export async function fetchTokenizedStockMarketCaps(): Promise<
  Map<string, TokenizedStockMarketStats>
> {
  const out = new Map<string, TokenizedStockMarketStats>();
  try {
    const res = await fetch(COINGECKO_TOKENIZED_STOCKS, {
      headers: { Accept: 'application/json', 'User-Agent': 'openhand.online' },
      next: { revalidate: 120 },
    });
    if (!res.ok) return out;
    const json: unknown = await res.json();
    if (!Array.isArray(json)) return out;
    for (const row of json) {
      if (!row || typeof row !== 'object') continue;
      const rec = row as Record<string, unknown>;
      if (typeof rec.symbol !== 'string') continue;
      const cap = parseMarketCap(rec.market_cap);
      if (cap === null) continue;
      const key = rec.symbol.trim().toLowerCase();
      if (!key) continue;
      const prev = out.get(key);
      if (prev !== undefined && cap <= prev.marketCapUsd) continue;
      const stats: TokenizedStockMarketStats = { marketCapUsd: cap };
      const change = parseChangePct24h(rec.price_change_percentage_24h);
      if (change !== undefined) stats.changePct24h = change;
      out.set(key, stats);
    }
  } catch {
    return out;
  }
  return out;
}
