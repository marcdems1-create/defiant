/**
 * CoinGecko tokenized-stock market caps, matched onto LI.FI catalog symbols.
 * LI.FI's /v1/tokens has priceUSD only — no market cap
 * (https://docs.li.fi/api-reference/fetch-all-known-tokens).
 * Skip on parse failure; never guess a cap.
 *
 * Caps are the *token's* CoinGecko market cap, not the listed company's equity cap.
 * https://docs.coingecko.com/v3.0.1/reference/coins-markets
 */
const COINGECKO_TOKENIZED_STOCKS =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=tokenized-stock&order=market_cap_desc&per_page=250&page=1';

function parseMarketCap(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return null;
  return raw;
}

export async function fetchTokenizedStockMarketCaps(): Promise<Map<string, number>> {
  const out = new Map<string, number>();
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
      if (prev === undefined || cap > prev) out.set(key, cap);
    }
  } catch {
    return out;
  }
  return out;
}
