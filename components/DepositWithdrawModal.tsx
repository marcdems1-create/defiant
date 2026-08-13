'use client';

import { useMemo, useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useBalance, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import type { Opportunity } from '@/lib/protocols/types';
import { erc20Abi } from '@/lib/abi/erc20';
import { aavePoolAbi } from '@/lib/abi/aavePool';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { stEthAbi, lidoWithdrawalQueueAbi } from '@/lib/abi/lido';
import { LIDO } from '@/lib/config/addresses';
import { getWagmiConfig } from '@/lib/wagmi';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { chainName, formatApy } from '@/lib/format';
import { LidoWithdrawalRequests } from './LidoWithdrawalRequests';

type Tab = 'deposit' | 'withdraw';
type Step = 'idle' | 'approving' | 'acting' | 'done' | 'error';

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

  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const wrongNetwork = currentChainId !== opportunity.chainId;
  const isNativeDeposit = opportunity.protocol === 'lido';

  const nativeBalance = useBalance({
    address,
    chainId: opportunity.chainId,
    query: { enabled: isNativeDeposit && Boolean(address) },
  });
  const erc20WalletBalance = useErc20Balance(
    isNativeDeposit ? undefined : opportunity.asset.address,
    address,
    opportunity.chainId,
  );
  const walletBalance = isNativeDeposit
    ? nativeBalance.data?.value ?? 0n
    : ((erc20WalletBalance.data as bigint | undefined) ?? 0n);

  const positionBalance = useErc20Balance(opportunity.positionToken, address, opportunity.chainId);
  const positionBalanceValue = (positionBalance.data as bigint | undefined) ?? 0n;

  const spender = opportunity.depositTarget;
  const allowance = useErc20Allowance(
    isNativeDeposit ? undefined : opportunity.asset.address,
    address,
    spender,
    opportunity.chainId,
  );
  const allowanceValue = (allowance.data as bigint | undefined) ?? 0n;

  const amountBig = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, opportunity.asset.decimals);
    } catch {
      return 0n;
    }
  }, [amount, opportunity.asset.decimals]);

  const maxAmount = tab === 'deposit' ? walletBalance : positionBalanceValue;
  const insufficientBalance = amountBig > 0n && amountBig > maxAmount;

  function setMax() {
    setAmount(formatUnits(maxAmount, opportunity.asset.decimals));
  }

  async function refreshBalances() {
    await Promise.all([
      nativeBalance.refetch(),
      erc20WalletBalance.refetch(),
      positionBalance.refetch(),
      allowance.refetch(),
    ]);
  }

  async function handleSwitchNetwork() {
    try {
      await switchChainAsync({ chainId: opportunity.chainId });
    } catch {
      // user rejected the switch — leave the button visible to retry
    }
  }

  async function handleDeposit() {
    if (!address || amountBig === 0n) return;
    setErrorMsg(null);
    try {
      if (opportunity.protocol === 'lido') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: stEthAbi,
          functionName: 'submit',
          args: [NULL_ADDRESS],
          value: amountBig,
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        setStep('done');
        await refreshBalances();
        return;
      }

      // Aave + Yearn: ERC-20 approve for the exact deposit amount, then act.
      // Deliberately not an unbounded approval — scoped to this deposit only.
      if (allowanceValue < amountBig) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: opportunity.asset.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, amountBig],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });
        await allowance.refetch();
      }

      setStep('acting');
      if (opportunity.protocol === 'aave-v3') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, amountBig, address, 0],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [amountBig, address],
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
      } else if (opportunity.protocol === 'yearn-v3') {
        setStep('acting');
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'redeem',
          args: [amountBig, address, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'lido') {
        const cfg = (LIDO as Record<number, (typeof LIDO)[keyof typeof LIDO]>)[opportunity.chainId];
        if (!cfg) throw new Error('Lido withdrawal queue not configured for this network');

        // We don't track a live stETH→WithdrawalQueue allowance (the shared
        // `allowance` hook above is scoped to the deposit-side spender), so
        // this always submits an approve tx before requesting withdrawal.
        // Harmless — a redundant approve to the same amount is a no-op spend
        // on gas, not a correctness issue — but a dedicated allowance read
        // would avoid the extra signature on repeat withdrawals.
        const stEthAllowance = 0n;
        if (stEthAllowance < amountBig) {
          setStep('approving');
          const approveHash = await writeContractAsync({
            // For Lido, asset.address and depositTarget are both the stETH token.
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

  const busy = step === 'approving' || step === 'acting';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md bg-paper border border-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-medium">{opportunity.protocolLabel}</div>
            <div className="text-sm text-ink/50">
              {chainName(opportunity.chainId)} · {formatApy(opportunity.apy)} APY
            </div>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        {opportunity.protocol === 'lido' && (
          <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2 mb-4">
            Lido withdrawals go through a request queue and typically take 1-5 days to
            finalize before you can claim ETH back. This is not instant.
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(['deposit', 'withdraw'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setStep('idle');
                setErrorMsg(null);
                setAmount('');
              }}
              className={`flex-1 py-1.5 rounded text-sm capitalize border ${
                tab === t
                  ? 'bg-accent text-paper border-accent'
                  : 'border-border text-ink/70'
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
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>Amount</span>
              <span>
                {tab === 'deposit' ? 'Wallet' : 'Deposited'}: {formatUnits(maxAmount, opportunity.asset.decimals)}{' '}
                {opportunity.asset.symbol}
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
                : step === 'approving'
                  ? 'Approving…'
                  : step === 'acting'
                    ? 'Confirming…'
                    : tab === 'deposit'
                      ? `Deposit ${opportunity.asset.symbol}`
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
