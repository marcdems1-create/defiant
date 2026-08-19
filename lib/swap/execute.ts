import {
  readContract,
  sendTransaction,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import { erc20Abi } from '@/lib/abi/erc20';
import { getWagmiConfig } from '@/lib/wagmi';
import { estimateCappedGas, estimateCappedTxGas, formatTxError } from '@/lib/tx/gas';
import {
  DEFAULT_SWAP_SLIPPAGE_BPS,
  fetchSwapQuote,
} from '@/lib/swap/zeroex';

export type ConvertStep = 'quoting' | 'approving' | 'converting';

/**
 * Same-chain convert, wallet-signed — used inside the deposit flow so the
 * user never leaves the modal. Exact-amount approve (never unbounded).
 * Distinct from LI.FI: this does not move USDC across chains.
 */
export async function executeSameChainConvert(params: {
  account: `0x${string}`;
  chainId: number;
  sellToken: `0x${string}`;
  buyToken: `0x${string}`;
  sellAmount: bigint;
  onStep: (step: ConvertStep) => void;
}): Promise<{ ok: true; received: bigint } | { ok: false; error: string }> {
  const cfg = getWagmiConfig();

  params.onStep('quoting');
  const quote = await fetchSwapQuote({
    chainId: params.chainId,
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    sellAmount: params.sellAmount,
    taker: params.account,
    slippageBps: DEFAULT_SWAP_SLIPPAGE_BPS,
  });
  if (!quote) {
    return { ok: false, error: "Couldn't convert right now. Try again in a moment." };
  }

  try {
    const allowance = (await readContract(cfg, {
      address: params.sellToken,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [params.account, quote.allowanceTarget],
      chainId: params.chainId,
    })) as bigint;

    if (allowance < params.sellAmount) {
      params.onStep('approving');
      const gas = await estimateCappedGas({
        account: params.account,
        chainId: params.chainId,
        address: params.sellToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.allowanceTarget, params.sellAmount],
      });
      const approveHash = await writeContract(cfg, {
        address: params.sellToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.allowanceTarget, params.sellAmount],
        chainId: params.chainId,
        gas,
      });
      await waitForTransactionReceipt(cfg, { hash: approveHash, chainId: params.chainId });
    }

    params.onStep('converting');
    const before = (await readContract(cfg, {
      address: params.buyToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [params.account],
      chainId: params.chainId,
    })) as bigint;

    const swapGas = await estimateCappedTxGas({
      account: params.account,
      chainId: params.chainId,
      to: quote.to,
      data: quote.data,
      value: quote.value,
    });
    const hash = await sendTransaction(cfg, {
      to: quote.to,
      data: quote.data,
      value: quote.value,
      chainId: params.chainId,
      gas: swapGas,
    });
    await waitForTransactionReceipt(cfg, { hash, chainId: params.chainId });

    const after = (await readContract(cfg, {
      address: params.buyToken,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [params.account],
      chainId: params.chainId,
    })) as bigint;
    const received = after - before;
    if (received <= 0n) {
      return { ok: false, error: 'Convert produced nothing. Check your wallet activity.' };
    }
    return { ok: true, received };
  } catch (e) {
    return { ok: false, error: formatTxError(e) };
  }
}
