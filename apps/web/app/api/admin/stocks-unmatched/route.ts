import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin/auth';
import { fetchUncoveredCoingeckoStocks } from '@/lib/lifi/marketCap';
import {
  PRICE_DIVERGENCE_FLAG_PCT,
  fetchStockCatalog,
  unmatchedStockRows,
  withStockMarketCaps,
} from '@/lib/lifi/stocks';

export const dynamic = 'force-dynamic';

/**
 * Phase 1 P0 (BUILD_SPEC): surface what the tokenized-stock tape is currently blind to,
 * instead of silently dropping rows. Two directions:
 *  - LI.FI catalog rows classified as a stock/ETF that CoinGecko has no address match for.
 *  - CoinGecko tokenized-stock coins with no contract address on a chain this app tracks.
 * Also lists matched rows with the largest LI.FI-vs-CoinGecko price divergence (Phase 1
 * P1) — a run where every matched row diverges by a similar large amount is a sign the
 * join itself is wrong (e.g. a platform id mapped to the wrong chain), not that every
 * token individually mispriced.
 */
export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const catalog = await fetchStockCatalog();
    const withCaps = await withStockMarketCaps(catalog);
    const unmatched = unmatchedStockRows(withCaps).map((t) => ({
      id: t.id,
      symbol: t.symbol,
      name: t.name,
      chainId: t.chainId,
      address: t.address,
      issuer: t.issuer,
      priceUsd: t.priceUsd,
    }));
    const uncoveredCoingeckoStocks = await fetchUncoveredCoingeckoStocks();
    const divergent = withCaps
      .filter((t) => t.priceDivergencePct !== undefined && Math.abs(t.priceDivergencePct) >= PRICE_DIVERGENCE_FLAG_PCT)
      .map((t) => ({
        id: t.id,
        symbol: t.symbol,
        chainId: t.chainId,
        priceUsd: t.priceUsd,
        divergencePct: t.priceDivergencePct as number,
      }))
      .sort((a, b) => Math.abs(b.divergencePct) - Math.abs(a.divergencePct))
      .slice(0, 25);
    return NextResponse.json({
      totalClassified: withCaps.length,
      matched: withCaps.length - unmatched.length,
      unmatched,
      uncoveredCoingeckoStocks,
      divergent,
      divergenceThresholdPct: PRICE_DIVERGENCE_FLAG_PCT,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
