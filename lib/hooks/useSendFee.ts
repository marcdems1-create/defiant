'use client';

import { useSendTransaction, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { erc20Abi } from '@/lib/abi/erc20';
import { getTreasuryAddress } from '@/lib/config/fees';
import { getWagmiConfig, type SupportedChainId } from '@/lib/wagmi';

/**
 * Sends the fee cut as its own wallet-signed transfer to the treasury
 * address — never skimmed inside the deposit/withdraw call itself. No-ops
 * (returns without prompting a signature) if the treasury isn't configured
 * or the fee amount is zero. See lib/config/fees.ts.
 */
export function useSendFee() {
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  async function sendFee(params: {
    isNative: boolean;
    tokenAddress?: `0x${string}`;
    amount: bigint;
    chainId: SupportedChainId;
  }): Promise<`0x${string}` | null> {
    const treasury = getTreasuryAddress();
    if (!treasury || params.amount === 0n) return null;

    let hash: `0x${string}`;
    if (params.isNative) {
      hash = await sendTransactionAsync({
        to: treasury,
        value: params.amount,
        chainId: params.chainId,
      });
    } else {
      if (!params.tokenAddress) {
        throw new Error('Missing token address for ERC-20 fee transfer');
      }
      hash = await writeContractAsync({
        address: params.tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [treasury, params.amount],
        chainId: params.chainId,
      });
    }

    await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: params.chainId });
    return hash;
  }

  return { sendFee };
}
