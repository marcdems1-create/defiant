/**
 * Non-custodial cross-chain USDC move via LI.FI (li.quest).
 *
 * LI.FI is a bridge aggregator: given source, destination, and amount, it
 * picks a route (Circle CCTP, Across, …) and returns one wallet-signed tx.
 * The UI never names the route — the user just moves USDC to the chain they
 * need. Funds never pass through an Openhand address or backend signer.
 *
 * Optional NEXT_PUBLIC_LIFI_FEE_BPS is collected by LI.FI inside that same
 * tx (requires a verified integrator). Unset = no fee, quotes still work.
 *
 * Field names verified 2026-08-18 against docs.li.fi. Parse defensively —
 * return null rather than guess.
 */

const LIFI_BASE = 'https://li.quest/v1';

/** Default cross-chain slippage (0.5%). */
export const DEFAULT_BRIDGE_SLIPPAGE = 0.005;

export interface BridgeQuote {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  /** Spender the source-token approve must target (LI.FI diamond). */
  approvalAddress: `0x${string}`;
  fromAmount: bigint;
  toAmount: bigint;
  toAmountMin: bigint;
  /** Underlying tool — kept internal, needed for /status. */
  tool: string;
  durationSec: number;
  fromChainId: number;
  toChainId: number;
}

function lifiIntegrator(): string {
  return process.env.NEXT_PUBLIC_LIFI_INTEGRATOR?.trim() || 'openhand';
}

function lifiHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_LIFI_API_KEY?.trim();
  return key ? { 'x-lifi-api-key': key } : {};
}

function toBigInt(hexOrDec: unknown): bigint {
  if (typeof hexOrDec !== 'string' || hexOrDec.length === 0) return 0n;
  try {
    return BigInt(hexOrDec);
  } catch {
    return 0n;
  }
}

export async function fetchBridgeQuote(params: {
  fromChainId: number;
  toChainId: number;
  fromToken: `0x${string}`;
  toToken: `0x${string}`;
  fromAmount: bigint;
  fromAddress: `0x${string}`;
  toAddress?: `0x${string}`;
  slippage?: number;
}): Promise<BridgeQuote | null> {
  const qs = new URLSearchParams({
    fromChain: String(params.fromChainId),
    toChain: String(params.toChainId),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount.toString(),
    fromAddress: params.fromAddress,
    toAddress: params.toAddress ?? params.fromAddress,
    slippage: String(params.slippage ?? DEFAULT_BRIDGE_SLIPPAGE),
    integrator: lifiIntegrator(),
  });

  const feeBps = process.env.NEXT_PUBLIC_LIFI_FEE_BPS;
  if (feeBps && Number(feeBps) > 0) {
    qs.set('fee', String(Number(feeBps) / 10_000));
  }

  try {
    const res = await fetch(`${LIFI_BASE}/quote?${qs.toString()}`, {
      headers: lifiHeaders(),
    });
    if (!res.ok) return null;
    const json = await res.json();

    const to = json?.transactionRequest?.to;
    const data = json?.transactionRequest?.data;
    const approvalAddress = json?.estimate?.approvalAddress;
    const toAmount = json?.estimate?.toAmount;
    const toAmountMin = json?.estimate?.toAmountMin;

    if (
      typeof to !== 'string' ||
      typeof data !== 'string' ||
      typeof approvalAddress !== 'string' ||
      typeof toAmount !== 'string' ||
      typeof toAmountMin !== 'string'
    ) {
      return null;
    }

    return {
      to: to as `0x${string}`,
      data: data as `0x${string}`,
      value: toBigInt(json?.transactionRequest?.value),
      approvalAddress: approvalAddress as `0x${string}`,
      fromAmount: toBigInt(json?.estimate?.fromAmount) || params.fromAmount,
      toAmount: toBigInt(toAmount),
      toAmountMin: toBigInt(toAmountMin),
      tool: typeof json?.tool === 'string' ? json.tool : '',
      durationSec:
        typeof json?.estimate?.executionDuration === 'number'
          ? json.estimate.executionDuration
          : 0,
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
    };
  } catch {
    return null;
  }
}

export type BridgeStatus = 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND' | 'UNKNOWN';

export async function fetchBridgeStatus(args: {
  txHash: `0x${string}`;
  fromChainId: number;
  toChainId: number;
  tool?: string;
}): Promise<{ status: BridgeStatus; receivingTxHash?: `0x${string}` }> {
  const qs = new URLSearchParams({
    txHash: args.txHash,
    fromChain: String(args.fromChainId),
    toChain: String(args.toChainId),
  });
  if (args.tool) qs.set('bridge', args.tool);

  try {
    const res = await fetch(`${LIFI_BASE}/status?${qs.toString()}`, {
      headers: lifiHeaders(),
    });
    if (!res.ok) return { status: 'UNKNOWN' };
    const json = await res.json();
    const status = json?.status;
    const valid: BridgeStatus[] = ['PENDING', 'DONE', 'FAILED', 'NOT_FOUND'];
    return {
      status: valid.includes(status) ? status : 'UNKNOWN',
      receivingTxHash:
        typeof json?.receiving?.txHash === 'string'
          ? (json.receiving.txHash as `0x${string}`)
          : undefined,
    };
  } catch {
    return { status: 'UNKNOWN' };
  }
}
