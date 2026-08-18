import { NextResponse } from 'next/server';
import { fetchStockCatalog } from '@/lib/lifi/stocks';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET() {
  try {
    const tokens = await fetchStockCatalog();
    return NextResponse.json({ tokens });
  } catch {
    return NextResponse.json({ tokens: [] });
  }
}
