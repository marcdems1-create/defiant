'use client';

import { useState } from 'react';
import { useAccount, useReadContract, useSendTransaction, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { createPublicClient, http } from 'viem';
import type { Opportunity } from '@/lib/protocols/types';
import { hasTokenEmissions } from '@/lib/protocols/types';
import { erc20Abi } from '@/lib/abi/erc20';
import { cvxCrvRewardsAbi } from '@/lib/abi/convex';
import { moonwellComptrollerAbi } from '@/lib/abi/moonwell';
import { CONVEX, MOONWELL, AAVE_V3 } from '@/lib/config/addresses';
import { chains, getWagmiConfig } from '@/lib/wagmi';
import { fetchSwapQuote } from '@/lib/swap/zeroex';
import { estimateCappedGas, formatTxError } from '@/lib/tx/gas';
import { formatTokenAmount } from '@/lib/format';

type Step = 'idle' | 'claiming' | 'selling' | 'done' | 'error';

function rewardTokensFor(opportunity: Opportunity): { address: `0x${string}`; symbol: string }[] {
  if (opportunity.protocol === 'moonwell') {
    const cfg = (MOONWELL as Record<number, { well?: `0x${string}` }>)[opportunity.chainId];
    return cfg?.well ? [{ address: cfg.well, symbol: 'WELL' }] : [];
  }
  if (opportunity.protocol === 'convex-cvxcrv') {
    const cfg = (CONVEX as Record<number, { crv: `0x${string}`; cvx: `0x${string}` }>)[opportunity.chainId];
    if (!cfg) return [];
    return [
      { address: cfg.crv, symbol: 'CRV' },
      { address: cfg.cvx, symbol: 'CVX' },
    ];
  }
  return [];
}

function harvestLabel(step: Step, sellPct: number, busy: boolean): string {
  if (step === 'claiming') return 'Claiming…';
  if (step === 'selling') return `Selling ${sellPct}% to USDC…`;
  if (busy) return 'Working…';
  if (sellPct === 100) return 'Harvest to USDC';
  if (sellPct === 0) return 'Harvest and hold';
  return `Harvest · sell ${sellPct}%`;
}

/**
 * Claim protocol emissions, then optionally sell a chosen percent of *just-claimed*
 * tokens to USDC via 0x. Every step is signed by the connected wallet — there is
 * no backend seller or keeper. Default is 100% sell; 0% keeps the tokens.
 */
export function HarvestRewards({
  opportunity,
  compact = false,
}: {
  opportunity: Opportunity;
  compact?: boolean;
}) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [sellPct, setSellPct] = useState(100);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tokens = rewardTokensFor(opportunity);
  const usdc = AAVE_V3[opportunity.chainId]?.usdc;
  const moonwellCfg = (MOONWELL as Record<number, { comptroller?: `0x${string}` }>)[opportunity.chainId];
  const canHarvest = hasTokenEmissions(opportunity.protocol);
  const zeroexConfigured = Boolean(process.env.NEXT_PUBLIC_ZEROEX_API_KEY);
  const rewardTicker = tokens.map((t) => t.symbol).join('/');

  const earned = useReadContract({
    address: opportunity.positionToken,
    abi: cvxCrvRewardsAbi,
    functionName: 'earned',
    args: address ? [address] : undefined,
    chainId: opportunity.chainId,
    query: { enabled: opportunity.protocol === 'convex-cvxcrv' && Boolean(address) },
  });

  if (!canHarvest || !address) return null;

  async function readBalances(): Promise<bigint[]> {
    const chain = chains.find((c) => c.id === opportunity.chainId);
    if (!chain || !address) return tokens.map(() => 0n);
    const client = createPublicClient({ chain, transport: http() });
    return Promise.all(
      tokens.map((t) =>
        client.readContract({
          address: t.address,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        }),
      ),
    );
  }

  async function writeTx(params: {
    address: `0x${string}`;
    abi: readonly { type?: string }[];
    functionName: string;
    args?: readonly unknown[];
    value?: bigint;
    chainId: number;
  }) {
    if (!address) throw new Error('Connect a wallet first');
    const gas = await estimateCappedGas({ ...params, account: address });
    return writeContractAsync({ ...params, gas } as never);
  }

  async function sellClaimed(deltas: { token: `0x${string}`; amount: bigint; symbol: string }[]) {
    if (!address || !usdc) return;
    const toSell = deltas
      .map((d) => ({ ...d, amount: (d.amount * BigInt(sellPct)) / 100n }))
      .filter((d) => d.amount > 0n);
    if (toSell.length === 0) return;

    setStep('selling');
    for (const row of toSell) {
      const quote = await fetchSwapQuote({
        chainId: opportunity.chainId,
        sellToken: row.token,
        buyToken: usdc,
        sellAmount: row.amount,
        taker: address,
      });
      if (!quote) {
        throw new Error(
          `Claimed ${row.symbol}, but could not build a USDC swap quote. The tokens are in your wallet. A 0x API key is required to sell on harvest.`,
        );
      }
      const allowanceHash = await writeTx({
        address: row.token,
        abi: erc20Abi,
        functionName: 'approve',
        args: [quote.allowanceTarget, quote.sellAmount],
        chainId: opportunity.chainId,
      });
      await waitForTransactionReceipt(getWagmiConfig(), {
        hash: allowanceHash,
        chainId: opportunity.chainId,
      });
      const swapHash = await sendTransactionAsync({
        to: quote.to,
        data: quote.data,
        value: quote.value,
        chainId: opportunity.chainId,
      });
      await waitForTransactionReceipt(getWagmiConfig(), {
        hash: swapHash,
        chainId: opportunity.chainId,
      });
    }
  }

  async function harvest() {
    if (!address) return;
    setErrorMsg(null);
    try {
      const before = await readBalances();
      setStep('claiming');
      if (opportunity.protocol === 'moonwell') {
        if (!moonwellCfg?.comptroller) throw new Error('Moonwell comptroller not configured');
        const hash = await writeTx({
          address: moonwellCfg.comptroller,
          abi: moonwellComptrollerAbi,
          functionName: 'claimReward',
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else {
        const hash = await writeTx({
          address: opportunity.positionToken!,
          abi: cvxCrvRewardsAbi,
          functionName: 'getReward',
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      }

      const after = await readBalances();
      const deltas = tokens.flatMap((t, i) => {
        const amount = after[i] > before[i] ? after[i] - before[i] : 0n;
        return amount > 0n ? [{ token: t.address, amount, symbol: t.symbol }] : [];
      });

      if (sellPct > 0 && deltas.length > 0) {
        await sellClaimed(deltas);
      }
      setStep('done');
    } catch (e) {
      setStep('error');
      setErrorMsg(formatTxError(e));
    }
  }

  const earnedValue = typeof earned.data === 'bigint' ? earned.data : 0n;
  const busy = step === 'claiming' || step === 'selling';
  const copy =
    opportunity.protocol === 'moonwell'
      ? `${rewardTicker || 'WELL'} rewards sit unclaimed until you harvest. They are not in this card’s APY.`
      : 'CRV/CVX rewards accrue while staked. Harvest claims them to this wallet.';

  return (
    <div className={compact ? 'text-left' : 'border border-border rounded-xl px-3 py-3 mb-3'}>
      {!compact && <div className="text-sm font-medium mb-1">Token emissions</div>}
      <p className={`${compact ? 'text-[11px]' : 'text-xs'} text-ink/50 leading-relaxed mb-2.5`}>
        {copy} You sign the claim{sellPct > 0 ? ', then any sell' : ''}.
      </p>
      {opportunity.protocol === 'convex-cvxcrv' && earnedValue > 0n && (
        <div className="text-xs font-mono text-ink/70 mb-2">
          ~{formatTokenAmount(earnedValue, 18)} CRV claimable (plus any extra rewards)
        </div>
      )}

      {compact ? (
        <div className="inline-flex rounded-full border border-border p-0.5 mb-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() => setSellPct(100)}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              sellPct === 100 ? 'bg-accent text-paper' : 'text-ink/55 hover:text-ink'
            }`}
          >
            To USDC
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSellPct(0)}
            className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              sellPct === 0 ? 'bg-ink/10 text-ink' : 'text-ink/55 hover:text-ink'
            }`}
          >
            Keep {rewardTicker || 'tokens'}
          </button>
        </div>
      ) : (
        <label className="flex flex-col gap-2 mb-3">
          <span className="text-[11px] text-ink/50 font-mono tracking-wide">
            {sellPct === 100
              ? 'Sell all claimed tokens to USDC'
              : sellPct === 0
                ? 'Keep claimed tokens in this wallet'
                : `Sell ${sellPct}% to USDC · keep ${100 - sellPct}%`}
          </span>
          <span className="relative flex items-center h-5">
            <span className="absolute inset-x-0 h-1 rounded-full bg-border" aria-hidden />
            <span
              className="absolute left-0 h-1 rounded-full bg-accent"
              style={{ width: `${sellPct}%` }}
              aria-hidden
            />
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={sellPct}
              onChange={(e) => setSellPct(Number(e.target.value))}
              className="oh-slider relative w-full"
              disabled={busy}
            />
          </span>
        </label>
      )}

      {errorMsg && <div className="text-xs text-danger mb-2 break-words">{errorMsg}</div>}
      {step === 'done' && (
        <div className="text-xs text-accent mb-2">
          {sellPct === 0 ? 'Claimed to your wallet.' : 'Harvest finished.'}
        </div>
      )}
      <button
        type="button"
        onClick={() => void harvest()}
        disabled={busy}
        className={
          compact
            ? 'text-[11px] text-accent hover:text-accent/80 disabled:opacity-40'
            : 'w-full py-1.5 rounded-lg border border-border text-xs text-ink/80 hover:text-ink disabled:opacity-40'
        }
      >
        {harvestLabel(step, sellPct, busy)}
      </button>
      {!zeroexConfigured && sellPct > 0 && (
        <p className="text-[11px] text-ink/40 mt-1">
          Sell needs a 0x API key. Without it, harvest still claims tokens to this wallet.
        </p>
      )}
    </div>
  );
}
