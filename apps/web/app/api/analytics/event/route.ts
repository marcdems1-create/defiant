import { NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { visitorHash } from '@/lib/admin/auth';
import {
  isAnalyticsEvent,
  sanitizeOpportunityId,
  sanitizePath,
} from '@/lib/analytics/events';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const pool = getPool();
  if (!pool) return NextResponse.json({ ok: true });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  if (typeof record.event !== 'string' || !isAnalyticsEvent(record.event)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const path = sanitizePath(record.path);
  const opportunityId = sanitizeOpportunityId(record.opportunityId);
  const chainId =
    typeof record.chainId === 'number' && Number.isInteger(record.chainId) ? record.chainId : null;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || undefined;
  const hash = visitorHash(ip);

  try {
    await pool.query(
      `INSERT INTO site_events (event, path, opportunity_id, chain_id, visitor_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [record.event, path, opportunityId, chainId, hash],
    );
  } catch {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
