import { NextResponse } from 'next/server';
import { fetchCryptoCatalog } from '@/lib/lifi/crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 120;

export async function GET() {
  try {
    const tokens = await fetchCryptoCatalog();
    return NextResponse.json({ tokens });
  } catch {
    return NextResponse.json({ tokens: [] });
  }
}
