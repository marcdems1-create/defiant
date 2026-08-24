import { NextResponse } from 'next/server';
import { getAddress, isAddress } from 'viem';
import { isStockChainId, usdcOnStockChain } from '@/lib/config/lifi';
import { fetchCryptoCatalog } from '@/lib/lifi/crypto';
import { isAllowlistedGoldToken } from '@/lib/lifi/gold';
import { fetchLifiQuote, fetchStockCatalog, isUsdcOnChain } from '@/lib/lifi/stocks';

export const dynamic = 'force-dynamic';

/**
 * Builds a LI.FI swap quote for USDC ↔ a catalogued stock, gold, or spot-crypto token.
 * The connected wallet signs the returned tx — Openhand never does.
 * Restricted to those tapes + Circle USDC on that chain (not a generic swap proxy).
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
  const fromTokenRaw = typeof rec.fromToken === 'string' ? rec.fromToken : '';
  const toTokenRaw = typeof rec.toToken === 'string' ? rec.toToken : '';
  const fromAddressRaw = typeof rec.fromAddress === 'string' ? rec.fromAddress : '';
  const fromAmountRaw = typeof rec.fromAmount === 'string' ? rec.fromAmount : '';

  if (!isStockChainId(chainId)) {
    return NextResponse.json({ error: 'unsupported chain' }, { status: 400 });
  }
  if (!isAddress(fromTokenRaw) || !isAddress(toTokenRaw) || !isAddress(fromAddressRaw)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!/^[1-9]\d{0,76}$/.test(fromAmountRaw)) {
    return NextResponse.json({ error: 'invalid amount' }, { status: 400 });
  }

  let fromToken: `0x${string}`;
  let toToken: `0x${string}`;
  let fromAddress: `0x${string}`;
  try {
    fromToken = getAddress(fromTokenRaw);
    toToken = getAddress(toTokenRaw);
    fromAddress = getAddress(fromAddressRaw);
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const usdc = usdcOnStockChain(chainId);
  if (!usdc) return NextResponse.json({ error: 'unsupported chain' }, { status: 400 });

  const fromIsUsdc = isUsdcOnChain(chainId, fromToken);
  const toIsUsdc = isUsdcOnChain(chainId, toToken);
  if (fromIsUsdc === toIsUsdc) {
    return NextResponse.json({ error: 'quote must be USDC against a listed token' }, { status: 400 });
  }
  const listedAddress = fromIsUsdc ? toToken : fromToken;

  const [stocks, coins] = await Promise.all([fetchStockCatalog(), fetchCryptoCatalog()]);
  const listed =
    isAllowlistedGoldToken(chainId, listedAddress) ||
    stocks.some(
      (t) => t.chainId === chainId && t.address.toLowerCase() === listedAddress.toLowerCase(),
    ) ||
    coins.some(
      (t) => t.chainId === chainId && t.address.toLowerCase() === listedAddress.toLowerCase(),
    );
  if (!listed) {
    return NextResponse.json({ error: 'token is not in the LI.FI tape' }, { status: 400 });
  }

  const quote = await fetchLifiQuote({
    chainId,
    fromToken,
    toToken,
    fromAmount: BigInt(fromAmountRaw),
    fromAddress,
  });
  if (!quote) {
    return NextResponse.json({ error: 'No route for this pair right now' }, { status: 422 });
  }

  return NextResponse.json({
    chainId: quote.chainId,
    to: quote.to,
    data: quote.data,
    value: quote.value.toString(),
    gas: quote.gas?.toString(),
    approvalAddress: quote.approvalAddress,
    fromAmount: quote.fromAmount.toString(),
    toAmount: quote.toAmount.toString(),
    toAmountMin: quote.toAmountMin.toString(),
    toSymbol: quote.toSymbol,
    toDecimals: quote.toDecimals,
    tool: quote.tool,
    protocolFeeUsd: quote.protocolFeeUsd,
  });
}
