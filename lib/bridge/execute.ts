import {
  readContract,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
  writeContract,
} from 'wagmi/actions';
import { erc20Abi } from '@/lib/abi/erc20';
import { getWagmiConfig } from '@/lib/wagmi';
import { estimateCappedGas, estimateCappedTxGas, formatTxError } from '@/lib/tx/gas';
import { fetchBridgeQuote, fetchBridgeStatus, type BridgeQuote } from '@/lib/bridge/lifi';

export type MoveStep = 'quoting' | 'switching' | 'approving' | 'moving' | 'settling';

const POLL_INTERVAL_MS = 8_000;
const MAX_SETTLE_MS = 8 * 60_000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Quote + approve (exact amount) + send + poll until USDC lands on the
 * destination chain. Wallet-signed throughout — no Openhand custody hop.
 */
export async function executeUsdcMove(params: {
  account: `0x${string}`;
  fromChainId: number;
  toChainId: number;
  fromToken: `0x${string}`;
  toToken: `0x${string}`;
  amount: bigint;
  currentChainId: number;
  onStep: (step: MoveStep) => void;
}): Promise<{ ok: true; late?: boolean } | { ok: false; error: string }> {
  const cfg = getWagmiConfig();

  params.onStep('quoting');
  const quote = await fetchBridgeQuote({
    fromChainId: params.fromChainId,
    toChainId: params.toChainId,
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: params.amount,
    fromAddress: params.account,
  });
  if (!quote) {
    return { ok: false, error: "Couldn't move USDC right now. Try again in a moment." };
  }

  try {
    if (params.currentChainId !== params.fromChainId) {
      params.onStep('switching');
      await switchChain(cfg, { chainId: params.fromChainId });
    }

    const allowance = (await readContract(cfg, {
      address: params.fromToken,
      abi: erc20Abi,
      functionName: 'allowance',
      args: [params.account, quote.approvalAddress],
      chainId: params.fromChainId,
    })) as bigint;

    if (allowance < quote.fromAmount) {
      params.onStep('approving');
      const gas = await estimateCappedGas({
        account: params.account,
        chainId: params.fromChainId,
        address: params.fromToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.approvalAddress, quote.fromAmount],
      });
      const approveHash = await writeContract(cfg, {
        address: params.fromToken,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.approvalAddress, quote.fromAmount],
        chainId: params.fromChainId,
        gas,
      });
      await waitForTransactionReceipt(cfg, { hash: approveHash, chainId: params.fromChainId });
    }

    params.onStep('moving');
    const hash = await sendQuotedMove(quote, params.account);
    await waitForTransactionReceipt(cfg, { hash, chainId: params.fromChainId });

    params.onStep('settling');
    const landed = await waitForArrival(hash, quote);
    try {
      await switchChain(cfg, { chainId: params.toChainId });
    } catch {
      // Move already succeeded; deposit can switch later.
    }
    return { ok: true, late: !landed };
  } catch (e) {
    return { ok: false, error: formatTxError(e) };
  }
}

async function sendQuotedMove(quote: BridgeQuote, account: `0x${string}`): Promise<`0x${string}`> {
  const cfg = getWagmiConfig();
  const gas = await estimateCappedTxGas({
    account,
    chainId: quote.fromChainId,
    to: quote.to,
    data: quote.data,
    value: quote.value,
  });
  return sendTransaction(cfg, {
    to: quote.to,
    data: quote.data,
    value: quote.value,
    chainId: quote.fromChainId,
    gas,
  });
}

async function waitForArrival(txHash: `0x${string}`, quote: BridgeQuote): Promise<boolean> {
  const deadline = Date.now() + MAX_SETTLE_MS;
  while (Date.now() < deadline) {
    const s = await fetchBridgeStatus({
      txHash,
      fromChainId: quote.fromChainId,
      toChainId: quote.toChainId,
      tool: quote.tool || undefined,
    });
    if (s.status === 'DONE') return true;
    if (s.status === 'FAILED') {
      throw new Error('The move failed. Check your wallet activity.');
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return false;
}
