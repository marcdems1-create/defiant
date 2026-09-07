import { NextResponse } from 'next/server';
import { fetchStockArbRows } from '@/lib/lifi/stockArb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await fetchStockArbRows();
    return NextResponse.json({ rows });
  } catch {
    return NextResponse.json({ rows: [] });
  }
}
