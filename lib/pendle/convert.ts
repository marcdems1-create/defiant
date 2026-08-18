import { PENDLE_API, PENDLE_SLIPPAGE } from '@/lib/config/pendle';

export interface PendleConvertQuote {
  to: `0x${string}`;
  data: `0x${string}`;
  value: bigint;
  buyAmount: bigint;
  approvals: { token: `0x${string}`; amount: bigint }[];
  action: string;
}

function asAddr(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(value)) return null;
  return value as `0x${string}`;
}

function asHexData(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !value.startsWith('0x') || value.length < 10) return null;
  return value as `0x${string}`;
}

function asAmount(value: unknown): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  try {
    const n = BigInt(value);
    return n >= 0n ? n : null;
  } catch {
    return null;
  }
}

export function parsePendleConvert(json: unknown): PendleConvertQuote | null {
  if (!json || typeof json !== 'object') return null;
  const root = json as Record<string, unknown>;
  const action = typeof root.action === 'string' ? root.action : '';
  const routes = Array.isArray(root.routes) ? root.routes : [];
  const route = routes[0];
  if (!route || typeof route !== 'object') return null;
  const rec = route as Record<string, unknown>;
  const tx = rec.tx;
  if (!tx || typeof tx !== 'object') return null;
  const txRec = tx as Record<string, unknown>;
  const to = asAddr(txRec.to);
  const data = asHexData(txRec.data);
  if (!to || !data) return null;
  const value = asAmount(txRec.value) ?? 0n;

  const outputs = Array.isArray(rec.outputs) ? rec.outputs : [];
  let buyAmount = 0n;
  for (const row of outputs) {
    if (!row || typeof row !== 'object') continue;
    const amt = asAmount((row as Record<string, unknown>).amount);
    if (amt !== null && amt > buyAmount) buyAmount = amt;
  }
  if (buyAmount <= 0n) return null;

  const approvals: { token: `0x${string}`; amount: bigint }[] = [];
  const required = Array.isArray(root.requiredApprovals) ? root.requiredApprovals : [];
  for (const row of required) {
    if (!row || typeof row !== 'object') continue;
    const recA = row as Record<string, unknown>;
    const token = asAddr(recA.token);
    const amount = asAmount(recA.amount);
    if (!token || amount === null || amount === 0n) continue;
    approvals.push({ token, amount });
  }

  return { to, data, value, buyAmount, approvals, action };
}

export interface PendleConvertRequest {
  chainId: number;
  receiver: `0x${string}`;
  tokenIn: `0x${string}`;
  amountIn: bigint;
  tokenOut: `0x${string}`;
  enableAggregator: boolean;
}

/**
 * Pendle Hosted SDK Convert — POST /v3/sdk/{chainId}/convert
 * (https://docs.pendle.finance/pendle-v2-dev/Backend/HostedSdk), 2026-08-18.
 * Parse-failure → null, never a guessed calldata.
 */
export async function fetchPendleConvertFromIris(
  req: PendleConvertRequest,
): Promise<PendleConvertQuote | null> {
  try {
    const res = await fetch(`${PENDLE_API}/v3/sdk/${req.chainId}/convert`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': 'Openhand/1.0',
      },
      body: JSON.stringify({
        receiver: req.receiver,
        slippage: PENDLE_SLIPPAGE,
        enableAggregator: req.enableAggregator,
        aggregators: req.enableAggregator ? ['kyberswap'] : [],
        inputs: [{ token: req.tokenIn, amount: req.amountIn.toString() }],
        outputs: [req.tokenOut],
        redeemRewards: false,
        needScale: false,
        useLimitOrder: true,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parsePendleConvert(await res.json());
  } catch {
    return null;
  }
}

/** Browser wrapper — same-origin so we do not depend on Pendle CORS. */
export async function fetchPendleConvert(
  req: PendleConvertRequest,
): Promise<PendleConvertQuote | null> {
  try {
    const res = await fetch('/api/pendle/convert', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chainId: req.chainId,
        receiver: req.receiver,
        tokenIn: req.tokenIn,
        amountIn: req.amountIn.toString(),
        tokenOut: req.tokenOut,
        enableAggregator: req.enableAggregator,
      }),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return parsePendleConvert(await res.json());
  } catch {
    return null;
  }
}
