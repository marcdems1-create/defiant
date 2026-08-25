import { getPublicClient } from 'wagmi/actions';
import { getWagmiConfig } from '@/lib/wagmi';

/** Base (and EIP-7825) reject any tx with gas limit above 2^24. */
export const MAX_TX_GAS = 16_777_216n;
const FALLBACK_GAS = 1_500_000n;

/**
 * Estimate gas, pad 25%, and clamp to the per-tx cap.
 * If estimation fails (wallet showed "fee unavailable"), use a fallback
 * under the cap — sending the block gas limit is what triggered
 * `exceeds max transaction gas limit` on Moonwell mint.
 */
export async function estimateCappedGas(params: {
  account: `0x${string}`;
  chainId: number;
  address: `0x${string}`;
  abi: readonly { type?: string }[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
}): Promise<bigint> {
  try {
    const client = getPublicClient(getWagmiConfig(), { chainId: params.chainId });
    if (!client) return FALLBACK_GAS;
    const estimated = await client.estimateContractGas({
      account: params.account,
      address: params.address,
      abi: params.abi,
      functionName: params.functionName,
      args: params.args,
      ...(params.value !== undefined ? { value: params.value } : {}),
    } as never);
    const padded = (estimated * 125n) / 100n;
    return clampGas(padded);
  } catch {
    return FALLBACK_GAS;
  }
}

export async function estimateCappedTxGas(params: {
  account: `0x${string}`;
  chainId: number;
  to: `0x${string}`;
  data?: `0x${string}`;
  value?: bigint;
}): Promise<bigint> {
  try {
    const client = getPublicClient(getWagmiConfig(), { chainId: params.chainId });
    if (!client) return FALLBACK_GAS;
    const estimated = await client.estimateGas({
      account: params.account,
      to: params.to,
      ...(params.data ? { data: params.data } : {}),
      ...(params.value !== undefined ? { value: params.value } : {}),
    });
    return clampGas((estimated * 125n) / 100n);
  } catch {
    return FALLBACK_GAS;
  }
}

function clampGas(padded: bigint): bigint {
  return padded > MAX_TX_GAS ? MAX_TX_GAS : padded < 21_000n ? FALLBACK_GAS : padded;
}

/** Dust ETH that still covers a couple of Base/Arbitrum ERC-20 txs. */
export const MIN_GAS_WEI = 40_000_000_000_000n; // 0.00004 ETH

function collectErrorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  const walk = (value: unknown, depth: number) => {
    if (!value || depth > 8 || seen.has(value)) return;
    seen.add(value);
    if (typeof value === 'string') {
      parts.push(value);
      return;
    }
    if (typeof value !== 'object') return;
    const o = value as Record<string, unknown>;
    for (const key of ['shortMessage', 'details', 'reason', 'message'] as const) {
      if (typeof o[key] === 'string') parts.push(o[key]);
    }
    walk(o.cause, depth + 1);
    walk(o.data, depth + 1);
  };
  walk(error, 0);
  return parts.join('\n');
}

function tidyMessage(raw: string): string {
  return raw
    .replace(/Version: viem@[\s\S]*$/i, '')
    .replace(/Docs: https?:\S+/gi, '')
    .replace(/Contract Call:[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTxError(error: unknown): string {
  const blob = collectErrorText(error);
  if (/exceeds max transaction gas limit/i.test(blob)) {
    return 'Network rejected the transaction (gas limit too high). Try again.';
  }
  if (/user rejected|denied|rejected the request/i.test(blob)) {
    return 'Transaction rejected in wallet.';
  }
  if (
    /insufficient funds|exceeds the balance of the account|insufficient .*balance/i.test(blob) &&
    /gas|fee|intrinsic/i.test(blob)
  ) {
    return 'This wallet does not have enough ETH to pay gas. USDC cannot pay the network fee — send a little ETH on this chain and try again.';
  }
  if (/insufficient funds|exceeds the balance of the account/i.test(blob)) {
    return 'Not enough balance in this wallet for that transaction.';
  }
  if (/insufficient allowance|ERC20: transfer amount exceeds allowance/i.test(blob)) {
    return 'Token allowance is too low. Approve the deposit amount and try again.';
  }
  const reason = blob.match(/reverted with the following reason:\s*([^\n]+)/i);
  if (reason?.[1] && reason[1].length < 160 && !/viem@|Docs:/i.test(reason[1])) {
    return reason[1].trim();
  }
  const custom = blob.match(/\b([A-Za-z][A-Za-z0-9]+(?:__[A-Za-z0-9]+)+)\b/);
  if (custom?.[1] && custom[1].length < 80) {
    return `Protocol rejected the transaction (${custom[1]}).`;
  }
  const short = typeof (error as { shortMessage?: unknown })?.shortMessage === 'string'
    ? tidyMessage((error as { shortMessage: string }).shortMessage)
    : '';
  if (short && short.length < 180 && !/viem@|Docs:/i.test(short)) return short;
  const msg = error instanceof Error ? tidyMessage(error.message) : '';
  if (msg && msg.length < 180 && !/viem@|https?:/i.test(msg)) return msg;
  return 'Transaction failed. Check your wallet and try again.';
}
