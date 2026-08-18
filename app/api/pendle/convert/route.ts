import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { chains } from '@/lib/wagmi';
import { PENDLE_NATIVE_ETH } from '@/lib/config/pendle';
import { fetchPendleConvertFromIris } from '@/lib/pendle/convert';

export const dynamic = 'force-dynamic';

/**
 * Pass-through to Pendle Hosted SDK Convert. Builds a tx the connected wallet
 * will sign — Openhand never broadcasts and never stores the receiver.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const rec = body as Record<string, unknown>;
  const chainId = typeof rec.chainId === 'number' ? rec.chainId : Number(rec.chainId);
  const receiver = typeof rec.receiver === 'string' ? rec.receiver : '';
  const tokenIn = typeof rec.tokenIn === 'string' ? rec.tokenIn : '';
  const tokenOut = typeof rec.tokenOut === 'string' ? rec.tokenOut : '';
  const amountRaw = rec.amountIn;
  const enableAggregator = rec.enableAggregator === true;
  if (!chains.some((c) => c.id === chainId)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const tokenOk = (value: string) =>
    isAddress(value) || value.toLowerCase() === PENDLE_NATIVE_ETH.toLowerCase();
  if (!isAddress(receiver) || !tokenOk(tokenIn) || !tokenOk(tokenOut)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  let amountIn: bigint;
  try {
    amountIn = BigInt(typeof amountRaw === 'string' || typeof amountRaw === 'number' ? amountRaw : '');
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (amountIn <= 0n) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const quote = await fetchPendleConvertFromIris({
    chainId,
    receiver: receiver as `0x${string}`,
    tokenIn: tokenIn as `0x${string}`,
    tokenOut: tokenOut as `0x${string}`,
    amountIn,
    enableAggregator,
  });
  if (!quote) {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
  return NextResponse.json({
    action: quote.action,
    requiredApprovals: quote.approvals.map((a) => ({
      token: a.token,
      amount: a.amount.toString(),
    })),
    routes: [
      {
        tx: {
          to: quote.to,
          data: quote.data,
          value: quote.value.toString(),
        },
        outputs: [{ token: tokenOut, amount: quote.buyAmount.toString() }],
      },
    ],
  });
}
