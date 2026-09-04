import { NextResponse } from 'next/server';
import { CCTP_DOMAINS } from '@/lib/config/cctp';
import { fetchIrisAttestation, isCctpTxHash } from '@/lib/cctp/attestation';

export const dynamic = 'force-dynamic';

/**
 * Pass-through to Circle Iris. No wallet, no persistence — attestation is
 * public. Exists so the browser does not have to call iris-api.circle.com
 * (CORS) and so we never guess a message/attestation pair.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const domainRaw = url.searchParams.get('sourceDomain');
  const txHash = url.searchParams.get('transactionHash') ?? '';
  if (domainRaw === null || domainRaw === '') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const sourceDomain = Number(domainRaw);
  if (!Number.isInteger(sourceDomain) || !(CCTP_DOMAINS as readonly number[]).includes(sourceDomain)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!isCctpTxHash(txHash)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const attestation = await fetchIrisAttestation(sourceDomain, txHash);
  if (!attestation) {
    return NextResponse.json({ pending: true }, { status: 202 });
  }
  return NextResponse.json(attestation);
}
