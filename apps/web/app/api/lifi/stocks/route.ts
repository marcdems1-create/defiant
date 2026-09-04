import { NextResponse } from 'next/server';
import { fetchStockCatalog, withStockMarketCaps } from '@/lib/lifi/stocks';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET() {
  try {
    const tokens = await withStockMarketCaps(await fetchStockCatalog());
    return NextResponse.json({ tokens });
  } catch {
    return NextResponse.json({ tokens: [] });
  }
}
