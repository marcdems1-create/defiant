import { NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { getDb } from '@/lib/db';
import { CONSENT_MESSAGE } from '@/lib/preferences';

const WALLET_RE = /^0x[a-fA-F0-9]{40}$/;
const LIQUIDITY_VALUES = ['immediate', 'flexible'];
const RISK_VALUES = ['established', 'open'];
const PRIORITY_VALUES = ['yield', 'risk'];

/**
 * Stores questionnaire answers linked to a wallet address — ONLY reachable
 * with a valid signature proving control of that address over a fixed
 * consent message. Without this, anyone could POST arbitrary answers
 * attributed to someone else's public wallet address with no proof they
 * actually own it, which would make the "consent" meaningless. This is the
 * one place in the app that writes to a database — see README "Data
 * collection" before changing anything here.
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

  const { walletAddress, signature, liquidityNeed, riskComfort, priority } = body as Record<
    string,
    unknown
  >;

  if (typeof walletAddress !== 'string' || !WALLET_RE.test(walletAddress)) {
    return NextResponse.json({ error: 'Invalid walletAddress' }, { status: 400 });
  }
  if (typeof signature !== 'string' || !signature.startsWith('0x')) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  if (typeof liquidityNeed !== 'string' || !LIQUIDITY_VALUES.includes(liquidityNeed)) {
    return NextResponse.json({ error: 'Invalid liquidityNeed' }, { status: 400 });
  }
  if (typeof riskComfort !== 'string' || !RISK_VALUES.includes(riskComfort)) {
    return NextResponse.json({ error: 'Invalid riskComfort' }, { status: 400 });
  }
  if (typeof priority !== 'string' || !PRIORITY_VALUES.includes(priority)) {
    return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
  }

  let validSignature: boolean;
  try {
    validSignature = await verifyMessage({
      address: walletAddress as `0x${string}`,
      message: CONSENT_MESSAGE,
      signature: signature as `0x${string}`,
    });
  } catch {
    validSignature = false;
  }
  if (!validSignature) {
    return NextResponse.json({ error: 'Signature does not match walletAddress' }, { status: 401 });
  }

  try {
    const db = getDb();
    await db.query(
      `INSERT INTO questionnaire_responses
         (wallet_address, liquidity_need, risk_comfort, priority, consented_at, updated_at)
       VALUES (LOWER($1), $2, $3, $4, now(), now())
       ON CONFLICT (wallet_address) DO UPDATE SET
         liquidity_need = EXCLUDED.liquidity_need,
         risk_comfort = EXCLUDED.risk_comfort,
         priority = EXCLUDED.priority,
         consented_at = EXCLUDED.consented_at,
         updated_at = now()`,
      [walletAddress, liquidityNeed, riskComfort, priority],
    );
  } catch (e) {
    console.error('[api/preferences] DB write failed', e);
    return NextResponse.json({ error: 'Could not save filter settings right now' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
