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
    return padded > MAX_TX_GAS ? MAX_TX_GAS : padded < 21_000n ? FALLBACK_GAS : padded;
  } catch {
    return FALLBACK_GAS;
  }
}

export function formatTxError(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Transaction failed';
  if (/exceeds max transaction gas limit/i.test(msg)) {
    return 'Network rejected the transaction (gas limit too high). Try again.';
  }
  if (/user rejected|denied|rejected the request/i.test(msg)) {
    return 'Transaction rejected in wallet.';
  }
  const reason = msg.match(/reverted with the following reason:\s*([^\n]+)/i);
  if (reason?.[1] && reason[1].length < 160 && !/viem@|Docs:/i.test(reason[1])) {
    return reason[1].trim();
  }
  if (msg.length > 180) return 'Transaction failed. Check your wallet and try again.';
  return msg;
}
