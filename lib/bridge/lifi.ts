/**
 * Non-custodial cross-chain USDC router via LI.FI (li.quest).
 *
 * This is the engine behind Openhand's "move your USDC to the chain you need it
 * on" flow (see components/BridgeCard.tsx and the deposit-modal auto-source
 * hint). LI.FI is a bridge AGGREGATOR: given a source chain, a destination
 * chain, and an amount, it picks the best underlying route (Circle CCTP, Across,
 * Stargate, etc.) itself and returns ONE ready-to-sign transaction. We never
 * surface which bridge it chose — the user just sees "moving your USDC, ~N min".
 *
 * Non-custodial, same as the 0x swap surface: LI.FI builds the transaction here,
 * but it is always signed and sent by the connected wallet. Funds never route
 * through an Openhand-controlled address or a backend signer. The optional
 * integrator fee (NEXT_PUBLIC_LIFI_FEE_BPS) is collected by LI.FI's own
 * fee-collection step INSIDE the same transaction and paid out to the registered
 * integrator — it is not a custody hop.
 *
 * VERIFIED 2026-08-18 against LI.FI's own API docs (docs.li.fi) for every field
 * and param name used below:
 *   - GET /v1/quote params: fromChain, toChain, fromToken, toToken, fromAmount,
 *     fromAddress, toAddress, slippage (decimal, 0.005 = 0.5%), integrator, fee
 *     (decimal fraction, 0.003 = 0.3%; REQUIRES a verified/allowlisted integrator).
 *   - Response is a Step object: estimate.{toAmount,toAmountMin,approvalAddress,
 *     executionDuration} and transactionRequest.{to,data,value,gasLimit,gasPrice,
 *     chainId} where value/gasLimit/gasPrice are HEX strings.
 *   - GET /v1/status params: txHash (required), fromChain, toChain, bridge (tool).
 *     Response: status ∈ NOT_FOUND|PENDING|DONE|FAILED (+ substatus, receiving).
 * Still NOT a live authenticated call (no LI.FI key in this environment) — parse
 * defensively and return null on anything unexpected rather than guessing. Run
 * one real quote after setting the integrator key before trusting it with funds.
 */

const LIFI_BASE = 'https://li.quest/v1';

/** Default cross-chain slippage tolerance (0.5%), as a decimal fraction. */
export const DEFAULT_BRIDGE_SLIPPAGE = 0.005;

export interface BridgeQuote {
  /** Transaction the wallet signs on the SOURCE chain. */
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  /** Spender the source-token `approve` must target (LI.FI diamond). */
  approvalAddress: `0x${string}`;
  fromAmount: bigint;
  /** Expected amount received on the destination chain (optimistic). */
  toAmount: bigint;
  /** Guaranteed minimum received after slippage. */
  toAmountMin: bigint;
  /** Underlying bridge LI.FI selected (e.g. "cctp", "across") — kept internal, needed for /status. */
  tool: string;
  /** Estimated end-to-end settlement time, seconds. */
  durationSec: number;
  fromChainId: number;
  toChainId: number;
}

interface FetchBridgeQuoteParams {
  fromChainId: number;
  toChainId: number;
  fromToken: `0x${string}`;
  toToken: `0x${string}`;
  fromAmount: bigint;
  fromAddress: `0x${string}`;
  /** Destination recipient — defaults to fromAddress (same wallet on the other chain). */
  toAddress?: `0x${string}`;
  slippage?: number;
}

/**
 * Whether the cross-chain router is configured. The integrator string is what
 * gates it: LI.FI quotes technically work keyless (rate-limited), but taking the
 * integrator fee — the whole point of turning this on as a revenue source —
 * requires a registered integrator, so we treat that as the on/off switch. The
 * optional NEXT_PUBLIC_LIFI_API_KEY just raises rate limits. NEXT_PUBLIC_* vars
 * are inlined at build time, so this is safe to call in the browser.
 */
export function bridgeConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_LIFI_INTEGRATOR);
}

function lifiHeaders(): HeadersInit {
  const key = process.env.NEXT_PUBLIC_LIFI_API_KEY;
  return key ? { 'x-lifi-api-key': key } : {};
}

function toBigInt(hexOrDec: unknown): bigint {
  if (typeof hexOrDec !== 'string' || hexOrDec.length === 0) return 0n;
  try {
    return BigInt(hexOrDec); // handles both "0x…" and decimal strings
  } catch {
    return 0n;
  }
}

export async function fetchBridgeQuote(
  params: FetchBridgeQuoteParams,
): Promise<BridgeQuote | null> {
  const integrator = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR;
  if (!integrator) return null;

  const qs = new URLSearchParams({
    fromChain: String(params.fromChainId),
    toChain: String(params.toChainId),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.fromAmount.toString(),
    fromAddress: params.fromAddress,
    toAddress: params.toAddress ?? params.fromAddress,
    slippage: String(params.slippage ?? DEFAULT_BRIDGE_SLIPPAGE),
    integrator,
  });

  // Integrator fee is opt-in and OFF unless a bps value is set — same posture as
  // the treasury/swap fees. LI.FI takes it atomically inside the route tx via its
  // own fee-collection step; never a custody hop. `fee` is a decimal fraction.
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

export interface BridgeStatusResult {
  status: BridgeStatus;
  substatus?: string;
  /** Destination-chain transaction hash once the funds have landed. */
  receivingTxHash?: `0x${string}`;
}

/**
 * Poll the settlement status of a bridge transaction. Cross-chain transfers are
 * NOT instant — waiting on the source-chain receipt alone is not enough, which is
 * exactly why LI.FI exposes this endpoint. Callers should poll until DONE/FAILED.
 */
export async function fetchBridgeStatus(args: {
  txHash: `0x${string}`;
  fromChainId: number;
  toChainId: number;
  tool?: string;
}): Promise<BridgeStatusResult> {
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
      substatus: typeof json?.substatus === 'string' ? json.substatus : undefined,
      receivingTxHash:
        typeof json?.receiving?.txHash === 'string'
          ? (json.receiving.txHash as `0x${string}`)
          : undefined,
    };
  } catch {
    return { status: 'UNKNOWN' };
  }
}
