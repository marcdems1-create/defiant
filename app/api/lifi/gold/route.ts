import { NextResponse } from 'next/server';
import { fetchGoldCatalog } from '@/lib/lifi/gold';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET() {
  try {
    const tokens = await fetchGoldCatalog();
    return NextResponse.json({ tokens });
  } catch {
    return NextResponse.json({ tokens: [] });
  }
}
