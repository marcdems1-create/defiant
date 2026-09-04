import { NextResponse } from 'next/server';
import { isAdminSession } from '@/lib/admin/auth';
import { fetchUncoveredCoingeckoStocks } from '@/lib/lifi/marketCap';
import { fetchStockCatalog, unmatchedStockRows, withStockMarketCaps } from '@/lib/lifi/stocks';

export const dynamic = 'force-dynamic';

/**
 * Phase 1 P0 (BUILD_SPEC): surface what the tokenized-stock tape is currently blind to,
 * instead of silently dropping rows. Two directions:
 *  - LI.FI catalog rows classified as a stock/ETF that CoinGecko has no address match for.
 *  - CoinGecko tokenized-stock coins with no contract address on a chain this app tracks.
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
    return NextResponse.json({
      totalClassified: withCaps.length,
      matched: withCaps.length - unmatched.length,
      unmatched,
      uncoveredCoingeckoStocks,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
