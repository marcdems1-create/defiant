'use client';

import { useMemo, useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import type { Opportunity } from '@/lib/protocols/types';
import { ERC4626_PROTOCOLS } from '@/lib/protocols/types';
import { erc20Abi } from '@/lib/abi/erc20';
import { aavePoolAbi } from '@/lib/abi/aavePool';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { stEthAbi, lidoWithdrawalQueueAbi } from '@/lib/abi/lido';
import { crvDepositorAbi, cvxCrvRewardsAbi } from '@/lib/abi/convex';
import { compoundCometAbi } from '@/lib/abi/compoundComet';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { LIDO } from '@/lib/config/addresses';
import { getWagmiConfig } from '@/lib/wagmi';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { chainName, formatApy } from '@/lib/format';
import { fetchSwapQuote } from '@/lib/swap/zeroex';
import { LidoWithdrawalRequests } from './LidoWithdrawalRequests';

type Tab = 'deposit' | 'withdraw';
type Step = 'idle' | 'swapping' | 'approving' | 'acting' | 'done' | 'error';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function DepositWithdrawModal({
  opportunity,
  onClose,
}: {
  opportunity: Opportunity;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();

  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // When true, the deposit input is denominated in opportunity.convertibleFrom (e.g. USDC)
  // instead of opportunity.asset, and a 0x swap runs before the protocol deposit call.
  const [convertFirst, setConvertFirst] = useState(false);

  const wrongNetwork = currentChainId !== opportunity.chainId;
  const isNativeDeposit = opportunity.protocol === 'lido';
  const isErc4626 = ERC4626_PROTOCOLS.includes(opportunity.protocol);
  const isConvex = opportunity.protocol === 'convex-cvxcrv';
  const canConvert = Boolean(opportunity.convertibleFrom) && tab === 'deposit';

  const inputAsset = convertFirst && opportunity.convertibleFrom ? opportunity.convertibleFrom : opportunity.asset;

  const nativeBalance = useBalance({
    address,
    chainId: opportunity.chainId,
    query: { enabled: isNativeDeposit && Boolean(address) },
  });
  const erc20WalletBalance = useErc20Balance(
    isNativeDeposit ? undefined : inputAsset.address,
    address,
    opportunity.chainId,
  );
  const walletBalance = isNativeDeposit
    ? nativeBalance.data?.value ?? 0n
    : ((erc20WalletBalance.data as bigint | undefined) ?? 0n);

  // Convex has no share token — its "position" balance lives in the cvxCRV Rewards pool,
  // read the same way as any other ERC-20-shaped balanceOf via the shared hook.
  const positionBalance = useErc20Balance(opportunity.positionToken, address, opportunity.chainId);
  const shareBalance = (positionBalance.data as bigint | undefined) ?? 0n;

  const erc4626Assets = useReadContract({
    address: opportunity.positionToken,
    abi: erc4626Abi,
    functionName: 'convertToAssets',
    args: [shareBalance],
    chainId: opportunity.chainId,
    query: { enabled: isErc4626 && Boolean(opportunity.positionToken) && shareBalance > 0n },
  });

  const moonwellRate = useReadContract({
    address: opportunity.positionToken,
    abi: moonwellMTokenAbi,
    functionName: 'exchangeRateStored',
    chainId: opportunity.chainId,
    query: { enabled: opportunity.protocol === 'moonwell' && Boolean(opportunity.positionToken) },
  });

  const positionBalanceValue = useMemo(() => {
    if (isErc4626) return (erc4626Assets.data as bigint | undefined) ?? 0n;
    if (opportunity.protocol === 'moonwell') {
      const rate = (moonwellRate.data as bigint | undefined) ?? 0n;
      return rate > 0n ? (shareBalance * rate) / 10n ** 18n : 0n;
    }
    return shareBalance;
  }, [isErc4626, opportunity.protocol, erc4626Assets.data, moonwellRate.data, shareBalance]);

  const spender = convertFirst ? undefined : opportunity.depositTarget;
  const allowance = useErc20Allowance(
    isNativeDeposit || convertFirst ? undefined : opportunity.asset.address,
    address,
    spender,
    opportunity.chainId,
  );
  const allowanceValue = (allowance.data as bigint | undefined) ?? 0n;

  const amountBig = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, inputAsset.decimals);
    } catch {
      return 0n;
    }
  }, [amount, inputAsset.decimals]);

  const maxAmount = tab === 'deposit' ? walletBalance : positionBalanceValue;
  const insufficientBalance = amountBig > 0n && amountBig > maxAmount;

  function setMax() {
    setAmount(formatUnits(maxAmount, inputAsset.decimals));
  }

  async function refreshBalances() {
    await Promise.all([
      nativeBalance.refetch(),
      erc20WalletBalance.refetch(),
      positionBalance.refetch(),
      allowance.refetch(),
      erc4626Assets.refetch(),
      moonwellRate.refetch(),
    ]);
  }

  async function handleSwitchNetwork() {
    try {
      await switchChainAsync({ chainId: opportunity.chainId });
    } catch {
      // user rejected the switch — leave the button visible to retry
    }
  }

  /** Runs the 0x conversion (approve → swap tx, both signed by the connected wallet) and
   * returns the resulting amount of opportunity.asset to deposit, or null if it failed.
   * Always submits a fresh approve for the exact sell amount rather than checking a live
   * convertibleFrom allowance first — same known tradeoff already accepted for Lido's
   * withdrawal approve below (redundant approve on repeat use, not a correctness issue). */
  async function runConversion(): Promise<bigint | null> {
    if (!address || !opportunity.convertibleFrom) return null;
    const quote = await fetchSwapQuote({
      chainId: opportunity.chainId,
      sellToken: opportunity.convertibleFrom.address,
      buyToken: opportunity.asset.address,
      sellAmount: amountBig,
      taker: address,
    });
    if (!quote) {
      setErrorMsg('Could not get a conversion quote right now — try again shortly.');
      return null;
    }

    // Approve the exact sell amount to whatever 0x's response says to approve — never
    // an unbounded allowance, same rule as every other approve in this file.
    setStep('approving');
    const approveHash = await writeContractAsync({
      address: opportunity.convertibleFrom.address,
      abi: erc20Abi,
      functionName: 'approve',
      args: [quote.allowanceTarget, quote.sellAmount],
      chainId: opportunity.chainId,
    });
    await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });

    setStep('swapping');
    const swapHash = await sendTransactionAsync({
      to: quote.to,
      data: quote.data,
      value: quote.value,
      chainId: opportunity.chainId,
    });
    await waitForTransactionReceipt(getWagmiConfig(), { hash: swapHash, chainId: opportunity.chainId });

    return quote.buyAmount;
  }

  async function handleDeposit() {
    if (!address || amountBig === 0n) return;
    setErrorMsg(null);
    try {
      let depositAmount = amountBig;

      if (convertFirst && opportunity.convertibleFrom) {
        const bought = await runConversion();
        if (bought === null) {
          setStep('error');
          return;
        }
        depositAmount = bought;
      }

      if (opportunity.protocol === 'lido') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: stEthAbi,
          functionName: 'submit',
          args: [NULL_ADDRESS],
          value: depositAmount,
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        setStep('done');
        await refreshBalances();
        return;
      }

      // Everything else (Aave, Yearn/Curve/Frax ERC-4626, Convex): ERC-20 approve for the
      // exact deposit amount, then act. Deliberately not an unbounded approval. If we just
      // converted, the asset didn't exist in the wallet a moment ago, so there's no live
      // allowance worth checking — always approve fresh in that case.
      if (convertFirst || allowanceValue < depositAmount) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: opportunity.asset.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [opportunity.depositTarget, depositAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });
      }

      setStep('acting');
      if (opportunity.protocol === 'aave-v3') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, depositAmount, address, 0],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'compound-v3') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: compoundCometAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, depositAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'moonwell') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: moonwellMTokenAbi,
          functionName: 'mint',
          args: [depositAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isErc4626) {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [depositAmount, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isConvex) {
        // Single call: converts CRV → cvxCRV and stakes it directly into the rewards
        // pool (positionToken). _lock=false takes Convex's swap-if-cheaper path instead
        // of an irreversible veCRV lock. See lib/abi/convex.ts — unverified ABI, smoke
        // test before trusting with real funds.
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: crvDepositorAbi,
          functionName: 'deposit',
          args: [depositAmount, false, opportunity.positionToken!],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      }
      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }

  async function handleWithdraw() {
    if (!address || amountBig === 0n) return;
    setErrorMsg(null);
    try {
      if (opportunity.protocol === 'aave-v3') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'withdraw',
          args: [opportunity.asset.address, amountBig, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'compound-v3') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: compoundCometAbi,
          functionName: 'withdraw',
          args: [opportunity.asset.address, amountBig],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'moonwell') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: moonwellMTokenAbi,
          functionName: 'redeemUnderlying',
          args: [amountBig],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isErc4626) {
        // Asset-denominated withdraw so the amount field stays in USDC units even when
        // vault share decimals differ (e.g. Morpho MetaMorpho often uses 18).
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'withdraw',
          args: [amountBig, address, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isConvex) {
        // Unstakes cvxCRV back to the wallet as cvxCRV — NOT back to CRV, the convert
        // step is one-way. `claim=true` also claims accrued CRV/CVX/crvUSD rewards.
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.positionToken!,
          abi: cvxCrvRewardsAbi,
          functionName: 'withdraw',
          args: [amountBig, true],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'lido') {
        const cfg = (LIDO as Record<number, (typeof LIDO)[keyof typeof LIDO]>)[opportunity.chainId];
        if (!cfg) throw new Error('Lido withdrawal queue not configured for this network');

        const stEthAllowance = 0n;
        if (stEthAllowance < amountBig) {
          setStep('approving');
          const approveHash = await writeContractAsync({
            address: opportunity.depositTarget,
            abi: erc20Abi,
            functionName: 'approve',
            args: [cfg.withdrawalQueue, amountBig],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });
          await allowance.refetch();
        }

        setStep('acting');
        const hash = await writeContractAsync({
          address: cfg.withdrawalQueue,
          abi: lidoWithdrawalQueueAbi,
          functionName: 'requestWithdrawals',
          args: [[amountBig], address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      }
      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }

  const busy = step === 'approving' || step === 'acting' || step === 'swapping';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-paper border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-medium flex items-center gap-2">
              {opportunity.protocolLabel}
              <span
                className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                  opportunity.risk === 'higher'
                    ? 'text-warn border-warn/40 bg-warn/10'
                    : opportunity.risk === 'medium'
                      ? 'text-ink/70 border-border'
                      : 'text-ink/50 border-border'
                }`}
              >
                {opportunity.risk === 'higher'
                  ? 'Higher risk'
                  : opportunity.risk === 'medium'
                    ? 'Medium risk'
                    : 'Lower risk'}
              </span>
            </div>
            <div className="text-sm text-ink/50">
              {chainName(opportunity.chainId)} · {formatApy(opportunity.apy)} APY
            </div>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="text-sm text-ink/60 leading-relaxed mb-4">{opportunity.description}</div>

        {(() => {
          const notes: string[] = [];
          if (opportunity.risk === 'higher' || opportunity.risk === 'medium') {
            notes.push(
              opportunity.risk === 'higher'
                ? 'This yield is layered on another protocol and/or a newer design — smart-contract and depeg risk compound with each layer. Higher APY is not the same thing as a safer number.'
                : 'Curated or newer venue — still DeFi risk (smart contract, liquidity, curator allocation). Not a bank deposit.',
            );
          }
          if (opportunity.protocol === 'lido') {
            notes.push(
              'Withdrawals go through a request queue and typically take 1-5 days to finalize before you can claim ETH back. This is not instant.',
            );
          }
          if (isConvex && tab === 'deposit') {
            notes.push(
              'Converting CRV to cvxCRV is irreversible — cvxCRV cannot be converted back to CRV. Withdrawing later returns cvxCRV, not CRV.',
            );
          }
          if (notes.length === 0) return null;
          return (
            <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2 mb-4 space-y-1.5">
              {notes.map((note, i) =>
                notes.length > 1 ? (
                  <div key={i} className="flex gap-1.5">
                    <span className="opacity-60">•</span>
                    <span>{note}</span>
                  </div>
                ) : (
                  <div key={i}>{note}</div>
                ),
              )}
            </div>
          );
        })()}

        <div className="flex gap-2 mb-4">
          {(['deposit', 'withdraw'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setStep('idle');
                setErrorMsg(null);
                setAmount('');
                setConvertFirst(false);
              }}
              className={`flex-1 py-1.5 rounded text-sm capitalize border ${
                tab === t ? 'bg-accent text-paper border-accent' : 'border-border text-ink/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {wrongNetwork ? (
          <button
            onClick={handleSwitchNetwork}
            disabled={switching}
            className="w-full py-2 rounded-md bg-warn text-paper font-medium text-sm disabled:opacity-50"
          >
            {switching ? 'Switching…' : `Switch to ${chainName(opportunity.chainId)}`}
          </button>
        ) : (
          <>
            {canConvert && opportunity.convertibleFrom && (
              <div
                className={`rounded-md border mb-3 transition-colors ${
                  convertFirst ? 'border-accent/40 bg-accent/5' : 'border-border'
                }`}
              >
                <label className="flex items-center gap-2 text-xs text-ink/70 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={convertFirst}
                    onChange={(e) => {
                      setConvertFirst(e.target.checked);
                      setAmount('');
                    }}
                  />
                  {`I don't hold ${opportunity.asset.symbol} — convert from ${opportunity.convertibleFrom.symbol} first`}
                </label>
                {convertFirst && (
                  <div className="text-xs text-ink/50 px-3 pb-2 border-t border-border/60 pt-2">
                    Swaps {opportunity.convertibleFrom.symbol} → {opportunity.asset.symbol}
                    right before depositing. A small fee applies on the conversion; you
                    sign both the swap and the deposit yourself, same as every other
                    transaction here. Expect up to 4 wallet confirmations in a row (swap
                    approval, swap, deposit approval, deposit) — that&apos;s normal for
                    this flow, not an error.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>Amount</span>
              <span>
                {tab === 'deposit' ? 'Wallet' : 'Deposited'}: {formatUnits(maxAmount, inputAsset.decimals)}{' '}
                {inputAsset.symbol}
              </span>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="flex-1 bg-transparent border border-border rounded px-3 py-2 text-sm font-mono outline-none focus:border-accent"
              />
              <button
                onClick={setMax}
                className="px-3 py-2 rounded border border-border text-xs text-ink/70 hover:text-ink"
              >
                Max
              </button>
            </div>

            {insufficientBalance && (
              <div className="text-xs text-danger mb-3">Amount exceeds available balance.</div>
            )}
            {errorMsg && <div className="text-xs text-danger mb-3 break-words">{errorMsg}</div>}
            {step === 'done' && (
              <div className="text-xs text-accent mb-3">
                {tab === 'withdraw' && opportunity.protocol === 'lido'
                  ? 'Withdrawal requested. It will appear below once claimable.'
                  : 'Transaction confirmed.'}
              </div>
            )}

            <button
              onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
              disabled={busy || amountBig === 0n || insufficientBalance || !address}
              className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {!address
                ? 'Connect wallet'
                : step === 'swapping'
                  ? 'Converting…'
                  : step === 'approving'
                    ? 'Approving…'
                    : step === 'acting'
                      ? 'Confirming…'
                      : tab === 'deposit'
                        ? `Deposit ${inputAsset.symbol}`
                        : opportunity.protocol === 'lido'
                          ? 'Request withdrawal'
                          : `Withdraw ${opportunity.asset.symbol}`}
            </button>

            {opportunity.protocol === 'lido' && tab === 'withdraw' && (
              <LidoWithdrawalRequests chainId={opportunity.chainId} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
