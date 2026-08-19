import { NextResponse } from 'next/server';
import { getAddress, verifyMessage } from 'viem';
import { getPool } from '@/lib/db';
import {
  REFERRAL_NONCE_PATTERN,
  buildReferralSignatureMessage,
  isReferralPayloadFresh,
  sanitizeReferralCode,
  sanitizeReferralSourcePath,
  type ReferralSignaturePayload,
} from '@/lib/referral/shared';

export const dynamic = 'force-dynamic';

type RegisterBody = {
  consent?: boolean;
  payload?: ReferralSignaturePayload;
  signature?: string;
  sourcePath?: string;
};

type ExistingRow = { ref_code: string };

export async function POST(request: Request) {
  const pool = getPool();
  if (!pool) {
    return NextResponse.json({ ok: false, configured: false, error: 'database not configured' }, { status: 503 });
  }

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid request body' }, { status: 400 });
  }

  if (body.consent !== true) {
    return NextResponse.json({ ok: false, error: 'consent required' }, { status: 400 });
  }
  if (!body.payload || typeof body.signature !== 'string' || body.signature.length < 10) {
    return NextResponse.json({ ok: false, error: 'payload and signature required' }, { status: 400 });
  }

  const refCode = sanitizeReferralCode(body.payload.refCode);
  if (!refCode) {
    return NextResponse.json({ ok: false, error: 'invalid referral code' }, { status: 400 });
  }
  if (body.payload.version !== 'v1') {
    return NextResponse.json({ ok: false, error: 'unsupported referral payload version' }, { status: 400 });
  }
  if (!isReferralPayloadFresh(body.payload.issuedAt)) {
    return NextResponse.json({ ok: false, error: 'expired signature payload' }, { status: 400 });
  }
  if (!REFERRAL_NONCE_PATTERN.test(body.payload.nonce)) {
    return NextResponse.json({ ok: false, error: 'invalid nonce' }, { status: 400 });
  }

  let normalizedAddress: `0x${string}`;
  try {
    normalizedAddress = getAddress(body.payload.address);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid wallet address' }, { status: 400 });
  }

  if (sanitizeReferralCode(body.payload.refCode) !== refCode) {
    return NextResponse.json({ ok: false, error: 'invalid referral code payload' }, { status: 400 });
  }

  const canonicalPayload: ReferralSignaturePayload = {
    version: 'v1',
    refCode,
    address: normalizedAddress,
    issuedAt: body.payload.issuedAt,
    nonce: body.payload.nonce,
  };
  const message = buildReferralSignatureMessage(canonicalPayload);

  const validSignature = await verifyMessage({
    address: normalizedAddress,
    message,
    signature: body.signature as `0x${string}`,
  });
  if (!validSignature) {
    return NextResponse.json({ ok: false, error: 'signature verification failed' }, { status: 401 });
  }

  const normalizedAddressLower = normalizedAddress.toLowerCase();
  const sourcePath = sanitizeReferralSourcePath(body.sourcePath);
  const issuedAt = new Date(body.payload.issuedAt);

  try {
    const existing = await pool.query<ExistingRow>(
      `SELECT ref_code
         FROM referral_attributions
        WHERE referred_address = $1
        LIMIT 1`,
      [normalizedAddressLower],
    );
    if (existing.rowCount) {
      const existingCode = existing.rows[0]?.ref_code;
      if (existingCode === refCode) {
        return NextResponse.json({ ok: true, status: 'already_linked' as const });
      }
      return NextResponse.json(
        { ok: false, error: 'wallet already linked to a different referral code' },
        { status: 409 },
      );
    }

    await pool.query(
      `INSERT INTO referral_attributions (
         ref_code, referred_address, consent_checked, signed_message, signature, nonce, issued_at, source_path
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [refCode, normalizedAddressLower, true, message, body.signature, body.payload.nonce, issuedAt, sourcePath],
    );

    return NextResponse.json({ ok: true, status: 'linked' as const });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'could not store referral attribution';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
