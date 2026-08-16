import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { getDb } from '@/lib/db';
import { REFERRAL_CONSENT_MESSAGE } from '@/lib/referrals';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Referral bindings. Mirrors app/api/preferences/route.ts exactly: a write is
 * only accepted with a valid wallet signature (proving the referee controls
 * referee_address) over a fixed consent message. Without it, 401 — nobody can
 * attribute a referral to a wallet they don't control.
 *
 * GET returns non-sensitive aggregate stats for a single address (how many
 * referees it referred, and who referred it) — counts only, never the graph.
 */

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { refereeAddress, referrerAddress, signature } = body as Record<string, unknown>;

  if (typeof refereeAddress !== 'string' || !WALLET_RE.test(refereeAddress)) {
    return NextResponse.json({ error: 'Invalid refereeAddress' }, { status: 400 });
  }
  if (typeof referrerAddress !== 'string' || !WALLET_RE.test(referrerAddress)) {
    return NextResponse.json({ error: 'Invalid referrerAddress' }, { status: 400 });
  }
  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  if (refereeAddress.toLowerCase() === referrerAddress.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot refer yourself' }, { status: 400 });
  }

  let validSignature: boolean;
  try {
    validSignature = await verifyMessage({
      address: refereeAddress as `0x${string}`,
      message: REFERRAL_CONSENT_MESSAGE,
      signature: signature as `0x${string}`,
    });
  } catch {
    validSignature = false;
  }
  if (!validSignature) {
    return NextResponse.json(
      { error: 'Signature does not match refereeAddress' },
      { status: 401 },
    );
  }

  try {
    const db = getDb();
    // One referrer per referee, immutable: if this referee already has a
    // binding, keep it (DO NOTHING) rather than letting a later link overwrite.
    await db.query(
      `INSERT INTO referrals (referee_address, referrer_address, consented_at, updated_at)
       VALUES (LOWER($1), LOWER($2), now(), now())
       ON CONFLICT (referee_address) DO NOTHING`,
      [refereeAddress, referrerAddress],
    );
    const { rows } = await db.query(
      `SELECT referrer_address FROM referrals WHERE referee_address = LOWER($1)`,
      [refereeAddress],
    );
    const boundTo: string | null = rows[0]?.referrer_address ?? null;
    const bound = boundTo?.toLowerCase() === referrerAddress.toLowerCase();
    return NextResponse.json({ ok: true, bound, referredBy: boundTo });
  } catch (e) {
    console.error('[api/referrals] DB write failed', e);
    return NextResponse.json(
      { error: 'Referral storage is unavailable right now' },
      { status: 503 },
    );
  }
}

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (typeof address !== 'string' || !WALLET_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    const db = getDb();
    const [{ rows: countRows }, { rows: refRows }] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::int AS n FROM referrals WHERE referrer_address = LOWER($1)`,
        [address],
      ),
      db.query(`SELECT referrer_address FROM referrals WHERE referee_address = LOWER($1)`, [
        address,
      ]),
    ]);
    return NextResponse.json({
      address: address.toLowerCase(),
      referrals: countRows[0]?.n ?? 0,
      referredBy: refRows[0]?.referrer_address ?? null,
    });
  } catch (e) {
    console.error('[api/referrals] DB read failed', e);
    return NextResponse.json(
      { error: 'Referral storage is unavailable right now' },
      { status: 503 },
    );
  }
}
