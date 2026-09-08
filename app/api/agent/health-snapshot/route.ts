import { NextRequest, NextResponse } from 'next/server';
import { getAgentPool } from '@/lib/agentDb';

export const dynamic = 'force-dynamic';

/**
 * Write-only ingest endpoint for `data_health_snapshot` rows (INFRA_PERSISTENCE_SPEC.md).
 * Called by `scripts/smoke-stock-market-data.mjs` (a standalone GitHub Actions script, no
 * app code, no `pg` dependency) after it computes its usual pass/fail numbers against the
 * public `/api/lifi/stocks` route.
 *
 * This is the resolution to the open design question logged in that spec's "Status" section:
 * the CI script gets a shared bearer token (`AGENT_INGEST_TOKEN`), never the database
 * connection string itself — matching how every other secret in this repo
 * (`TRANSAK_API_SECRET`, `ADMIN_PASSWORD`) stays server-side only and is never handed to a
 * CI script. `isAdminSession()`'s cookie-based auth doesn't apply here since this caller has
 * no browser session at all.
 */
export async function POST(req: NextRequest) {
  const token = process.env.AGENT_INGEST_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ingest not configured' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${token}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const pool = getAgentPool();
  if (!pool) {
    return NextResponse.json({ error: 'agent db not configured' }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const catalogRows = int(body.catalogRows);
  const matchedRows = int(body.matchedRows);
  const unmatchedRows = int(body.unmatchedRows);
  const staleRows = int(body.staleRows);
  const smokePassed = typeof body.smokePassed === 'boolean' ? body.smokePassed : null;
  if (
    catalogRows === null ||
    matchedRows === null ||
    unmatchedRows === null ||
    staleRows === null ||
    smokePassed === null
  ) {
    return NextResponse.json(
      { error: 'catalogRows, matchedRows, unmatchedRows, staleRows (integers) and smokePassed (boolean) are required' },
      { status: 400 },
    );
  }
  // Optional — the arb smoke script runs far less often (4h cron vs 30min), so a health
  // snapshot from the market-data script alone won't always have these.
  const arbCandidateRows = int(body.arbCandidateRows);
  const arbVerifiedRows = int(body.arbVerifiedRows);

  try {
    await pool.query(
      `INSERT INTO data_health_snapshot
         (catalog_rows, matched_rows, unmatched_rows, stale_rows, arb_candidate_rows, arb_verified_rows, smoke_passed)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [catalogRows, matchedRows, unmatchedRows, staleRows, arbCandidateRows, arbVerifiedRows, smokePassed],
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'insert failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function int(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}
