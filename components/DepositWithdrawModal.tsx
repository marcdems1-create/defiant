'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useBalance, useChainId, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import type { Opportunity } from '@/lib/protocols/types';
import { erc20Abi } from '@/lib/abi/erc20';
import { aavePoolAbi } from '@/lib/abi/aavePool';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { curvePoolAbi2Coin, curvePoolAbi3Coin } from '@/lib/abi/curvePool';
import { stEthAbi, lidoWithdrawalQueueAbi } from '@/lib/abi/lido';
import { crvDepositorAbi, cvxCrvRewardsAbi } from '@/lib/abi/convex';
import { compoundCometAbi } from '@/lib/abi/compoundComet';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { LIDO } from '@/lib/config/addresses';
import { getWagmiConfig } from '@/lib/wagmi';
import { computeFee, DEPOSIT_FEE_BPS, feesEnabled, WITHDRAW_FEE_BPS } from '@/lib/config/fees';
import { useSendFee } from '@/lib/hooks/useSendFee';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { apyCaption, chainName, formatApy, formatTokenAmount } from '@/lib/format';
import { ERC4626_PROTOCOLS } from '@/lib/protocols/types';
import { estimateCappedGas, formatTxError } from '@/lib/tx/gas';
import { track } from '@/lib/analytics/track';
import { LidoWithdrawalRequests } from './LidoWithdrawalRequests';
import { OnrampModal } from './OnrampModal';
import { ConnectButtonClient } from './ConnectButtonClient';
import { isStableDollarAsset } from '@/lib/firstRun';

type Tab = 'deposit' | 'withdraw';
type Step = 'idle' | 'sendingFee' | 'approving' | 'acting' | 'done' | 'error';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export function DepositWithdrawModal({
  opportunity,
  onClose,
  initialTab = 'deposit',
}: {
  opportunity: Opportunity;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const [switchFailed, setSwitchFailed] = useState(false);
  const autoSwitchKey = useRef('');
  const { writeContractAsync } = useWriteContract();
  const { sendFee } = useSendFee();

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

  const [tab, setTab] = useState<Tab>(initialTab);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [buyOpen, setBuyOpen] = useState(false);
  const dollarInput = isStableDollarAsset(opportunity.asset.symbol, opportunity.asset.decimals);

  useEffect(() => {
    track(tab === 'withdraw' ? 'withdraw_open' : 'deposit_open', {
      opportunityId: opportunity.id,
      chainId: opportunity.chainId,
    });
  }, [tab, opportunity.id, opportunity.chainId]);

  const prevStep = useRef<Step>('idle');
  useEffect(() => {
    if (step === 'done' && prevStep.current !== 'done') {
      track(tab === 'withdraw' ? 'withdraw_done' : 'deposit_done', {
        opportunityId: opportunity.id,
        chainId: opportunity.chainId,
      });
    }
    prevStep.current = step;
  }, [step, tab, opportunity.id, opportunity.chainId]);

  const wrongNetwork = currentChainId !== opportunity.chainId;
  const isNativeDeposit = opportunity.protocol === 'lido';
  const isCurve = opportunity.protocol === 'curve';
  const isConvex = opportunity.protocol === 'convex-cvxcrv';
  const isMoonwell = opportunity.protocol === 'moonwell';
  // Lido withdrawal fee is charged at claim time (funds aren't in the
  // wallet yet at request time) — see LidoWithdrawalRequests.
  const feeAppliesHere = feesEnabled() && !(opportunity.protocol === 'lido' && tab === 'withdraw');

  // Curve LP shares (and Morpho vault shares) aren't 1:1 with the underlying,
  // so those withdraw tabs enter an amount of positionToken. Moonwell's
  // redeemUnderlying takes USDC — mUSDC is only a receipt the contract burns.
  // If we labeled that field mUSDC, users would think they need a second
  // conversion step, and Max would parse 8-decimal shares into a 6-decimal
  // redeemUnderlying call.
  const positionDecimals = opportunity.positionDecimals ?? opportunity.asset.decimals;
  const positionSymbol = opportunity.positionSymbol ?? opportunity.asset.symbol;
  const withdrawInPositionUnits = tab === 'withdraw' && !isMoonwell;
  const amountDecimals = withdrawInPositionUnits
    ? positionDecimals
    : opportunity.asset.decimals;
  const amountSymbol = withdrawInPositionUnits ? positionSymbol : opportunity.asset.symbol;

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
      return parseUnits(amount, amountDecimals);
    } catch {
      return 0n;
    }
  }, [amount, amountDecimals]);

  // Curve-only pool shape (see CurvePoolConfig in lib/config/addresses.ts).
  // `numCoins` picks which add_liquidity/calc_token_amount ABI variant
  // applies (their amounts array is sized to the pool's coin count);
  // `coinIndex` is USDC's position in that array and doubles as `i` for
  // remove_liquidity_one_coin/calc_withdraw_one_coin, which take a plain
  // index regardless of pool size.
  const curveNumCoins = opportunity.curve?.numCoins ?? 2;
  const curveCoinIndexNum = opportunity.curve?.coinIndex ?? 0;
  const curveCoinIndex = BigInt(curveCoinIndexNum);
  function curveAmounts2(amount: bigint): [bigint, bigint] {
    const arr: [bigint, bigint] = [0n, 0n];
    arr[curveCoinIndexNum] = amount;
    return arr;
  }
  function curveAmounts3(amount: bigint): [bigint, bigint, bigint] {
    const arr: [bigint, bigint, bigint] = [0n, 0n, 0n];
    arr[curveCoinIndexNum] = amount;
    return arr;
  }

  // Curve-only: preview the actual USDC amount a withdrawal will produce, so
  // (a) the fee below is based on real USDC out rather than the LP-share
  // amount typed into the withdraw tab (a different unit entirely), and (b)
  // remove_liquidity_one_coin's tx (below) can carry a real min-out instead
  // of 0 — unlike Aave/Yearn's fixed-rate mechanics, this behaves like a
  // swap and a 0 min-out is a real sandwich-attack surface.
  // remove_liquidity_one_coin/calc_withdraw_one_coin are byte-identical
  // between the 2-coin and 3-coin ABI variants, so either works here.
  const curveWithdrawPreview = useReadContract({
    address: opportunity.depositTarget,
    abi: curvePoolAbi2Coin,
    functionName: 'calc_withdraw_one_coin',
    args: [amountBig, curveCoinIndex],
    chainId: opportunity.chainId,
    query: { enabled: isCurve && tab === 'withdraw' && amountBig > 0n },
  });
  const CURVE_SLIPPAGE_BPS = 100n; // 1% tolerance on Curve's own previewed amounts
  const curveMinOut = (preview: bigint | undefined) =>
    preview ? (preview * (10_000n - CURVE_SLIPPAGE_BPS)) / 10_000n : 0n;

  const feeBps = tab === 'deposit' ? DEPOSIT_FEE_BPS : WITHDRAW_FEE_BPS;
  // For a Curve withdrawal, amountBig is LP shares (18 decimals, not 1:1
  // with USDC) — the fee must be computed on the previewed USDC output
  // instead, or it comes out wildly wrong (off by orders of magnitude).
  // Aave/Yearn keep using amountBig directly: their share/aToken amounts
  // are a close enough proxy for the underlying that this is fine there.
  const feeBasisAmount =
    isCurve && tab === 'withdraw' ? ((curveWithdrawPreview.data as bigint | undefined) ?? 0n) : amountBig;
  const feeAmount = feeAppliesHere ? computeFee(feeBasisAmount, feeBps) : 0n;
  // Deposit: fee comes out of what you send in, so less reaches the protocol.
  // Withdraw: the protocol pays out the full gross amount first, then the
  // fee is taken from what lands in your wallet — see handleWithdraw.
  const netAmount = feeBasisAmount - feeAmount;

  // Preview add_liquidity's LP output for exactly `netAmount` — the amount
  // that actually reaches the pool after any deposit fee — so the min-out
  // below matches what's really being deposited, not the pre-fee amount.
  // Both hooks always run (Rules of Hooks) but only the one matching this
  // pool's coin count is `enabled`, so only it issues an actual RPC read.
  const curveDepositPreview2 = useReadContract({
    address: opportunity.depositTarget,
    abi: curvePoolAbi2Coin,
    functionName: 'calc_token_amount',
    args: [curveAmounts2(netAmount), true],
    chainId: opportunity.chainId,
    query: { enabled: isCurve && curveNumCoins === 2 && tab === 'deposit' && netAmount > 0n },
  });
  const curveDepositPreview3 = useReadContract({
    address: opportunity.depositTarget,
    abi: curvePoolAbi3Coin,
    functionName: 'calc_token_amount',
    args: [curveAmounts3(netAmount), true],
    chainId: opportunity.chainId,
    query: { enabled: isCurve && curveNumCoins === 3 && tab === 'deposit' && netAmount > 0n },
  });
  const curveDepositPreviewData = (curveNumCoins === 3 ? curveDepositPreview3.data : curveDepositPreview2.data) as
    | bigint
    | undefined;

  const moonwellRate = useReadContract({
    address: opportunity.depositTarget,
    abi: moonwellMTokenAbi,
    functionName: 'exchangeRateStored',
    chainId: opportunity.chainId,
    query: { enabled: isMoonwell },
  });
  const moonwellExchangeRate =
    typeof moonwellRate.data === 'bigint' && moonwellRate.data > 0n ? moonwellRate.data : 0n;
  const moonwellMintTokens =
    isMoonwell && moonwellExchangeRate > 0n ? (netAmount * 10n ** 18n) / moonwellExchangeRate : 0n;
  // Same conversion as usePositions: underlying = shares * exchangeRate / 1e18.
  const moonwellUnderlyingBalance =
    isMoonwell && moonwellExchangeRate > 0n
      ? (positionBalanceValue * moonwellExchangeRate) / 10n ** 18n
      : 0n;

  const maxAmount =
    tab === 'deposit' ? walletBalance : isMoonwell ? moonwellUnderlyingBalance : positionBalanceValue;
  const insufficientBalance = amountBig > 0n && amountBig > maxAmount;

  function setMax() {
    setAmount(formatUnits(maxAmount, amountDecimals));
  }

  async function refreshBalances() {
    await Promise.all([
      nativeBalance.refetch(),
      erc20WalletBalance.refetch(),
      positionBalance.refetch(),
      allowance.refetch(),
    ]);
  }

  async function ensureChain() {
    if (currentChainId === opportunity.chainId) return;
    await switchChainAsync({ chainId: opportunity.chainId });
  }

  useEffect(() => {
    if (!address || currentChainId === opportunity.chainId) {
      autoSwitchKey.current = '';
      setSwitchFailed(false);
      return;
    }
    const key = `${address}:${opportunity.chainId}`;
    if (autoSwitchKey.current === key) return;
    autoSwitchKey.current = key;
    setSwitchFailed(false);
    switchChainAsync({ chainId: opportunity.chainId }).catch(() => {
      setSwitchFailed(true);
    });
  }, [address, currentChainId, opportunity.chainId, switchChainAsync]);

  async function handleDeposit() {
    if (!address || amountBig === 0n) return;
    setErrorMsg(null);
    try {
      await ensureChain();
      if (feeAmount > 0n) {
        setStep('sendingFee');
        await sendFee({
          isNative: isNativeDeposit,
          tokenAddress: isNativeDeposit ? undefined : opportunity.asset.address,
          amount: feeAmount,
          chainId: opportunity.chainId,
        });
      }

      if (opportunity.protocol === 'lido') {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: stEthAbi,
          functionName: 'submit',
          args: [NULL_ADDRESS],
          value: netAmount,
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        setStep('done');
        await refreshBalances();
        return;
      }

      // Aave, Yearn, and Curve: ERC-20 approve for the exact net deposit
      // amount, then act. Deliberately not an unbounded approval — scoped
      // to this deposit only, and scoped to the post-fee amount since
      // that's all that actually reaches the protocol.
      if (allowanceValue < netAmount) {
        setStep('approving');
        const approveHash = await writeTx({
          address: opportunity.asset.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender, netAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });
        await allowance.refetch();
      }

      setStep('acting');
      if (opportunity.protocol === 'aave-v3') {
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, netAmount, address, 0],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'curve') {
        const minMintAmount = curveMinOut(curveDepositPreviewData);
        if (curveNumCoins === 3) {
          const hash = await writeTx({
            address: opportunity.depositTarget,
            abi: curvePoolAbi3Coin,
            functionName: 'add_liquidity',
            args: [curveAmounts3(netAmount), minMintAmount],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        } else {
          const hash = await writeTx({
            address: opportunity.depositTarget,
            abi: curvePoolAbi2Coin,
            functionName: 'add_liquidity',
            args: [curveAmounts2(netAmount), minMintAmount],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        }
      } else if (opportunity.protocol === 'compound-v3') {
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: compoundCometAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, netAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'moonwell') {
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: moonwellMTokenAbi,
          functionName: 'mint',
          args: [netAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isConvex) {
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: crvDepositorAbi,
          functionName: 'deposit',
          args: [netAmount, false, opportunity.positionToken!],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else {
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [netAmount, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      }
      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(formatTxError(e));
    }
  }

  async function handleWithdraw() {
    if (!address || amountBig === 0n) return;
    setErrorMsg(null);
    try {
      await ensureChain();
      if (opportunity.protocol === 'aave-v3') {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'withdraw',
          args: [opportunity.asset.address, amountBig, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'compound-v3') {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: compoundCometAbi,
          functionName: 'withdraw',
          args: [opportunity.asset.address, amountBig],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'moonwell') {
        setStep('acting');
        // Max burns every mUSDC share (redeem) so rounding in redeemUnderlying
        // cannot leave a dust receipt behind. Partial exits stay in USDC.
        const redeemAll =
          positionBalanceValue > 0n &&
          moonwellUnderlyingBalance > 0n &&
          amountBig >= moonwellUnderlyingBalance;
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: moonwellMTokenAbi,
          functionName: redeemAll ? 'redeem' : 'redeemUnderlying',
          args: [redeemAll ? positionBalanceValue : amountBig],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isConvex) {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.positionToken!,
          abi: cvxCrvRewardsAbi,
          functionName: 'withdraw',
          args: [amountBig, true],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (
        ERC4626_PROTOCOLS.includes(opportunity.protocol) &&
        opportunity.protocol !== 'yearn-v3'
      ) {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'redeem',
          args: [amountBig, address, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'yearn-v3') {
        setStep('acting');
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'redeem',
          args: [amountBig, address, address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'curve') {
        setStep('acting');
        const minReceived = curveMinOut(curveWithdrawPreview.data as bigint | undefined);
        const hash = await writeTx({
          address: opportunity.depositTarget,
          abi: curvePoolAbi2Coin,
          functionName: 'remove_liquidity_one_coin',
          args: [amountBig, curveCoinIndex, minReceived],
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
          const approveHash = await writeTx({
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
        const hash = await writeTx({
          address: cfg.withdrawalQueue,
          abi: lidoWithdrawalQueueAbi,
          functionName: 'requestWithdrawals',
          args: [[amountBig], address],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        setStep('done');
        await refreshBalances();
        return;
      }

      // Funds are now in the wallet (Aave/Yearn only — Lido returns above).
      // Fee comes out of what just landed, as its own transfer.
      if (feeAmount > 0n) {
        setStep('sendingFee');
        await sendFee({
          isNative: false,
          tokenAddress: opportunity.asset.address,
          amount: feeAmount,
          chainId: opportunity.chainId,
        });
      }

      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(formatTxError(e));
    }
  }

  const busy = step === 'sendingFee' || step === 'approving' || step === 'acting' || switching;
  const waitingOnSwitch = wrongNetwork && !switchFailed;

  return (
    <>
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="w-full max-w-md bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-lg p-6 max-h-[min(92dvh,100%)] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-medium">{opportunity.protocolLabel}</div>
            <div className="text-sm text-ink/50">
              {chainName(opportunity.chainId)} · {formatApy(opportunity.apy)}{' '}
              {apyCaption(opportunity)}
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

        {address && (
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
        )}

        {!address ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/65 leading-relaxed">
              Get a wallet first — email or a passkey. Then you can deposit. Openhand never holds
              your keys.
            </p>
            <ConnectButtonClient label="Deposit" />
          </div>
        ) : (
          <>
            {wrongNetwork && (
              <div className="text-xs text-ink/50 mb-3">
                {switching || !switchFailed
                  ? `Switching to ${chainName(opportunity.chainId)}…`
                  : `Confirm ${chainName(opportunity.chainId)} in your wallet to continue.`}
              </div>
            )}
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>Amount{dollarInput && tab === 'deposit' ? ' (USD)' : ''}</span>
              <span>
                {tab === 'deposit' ? 'Wallet' : 'Deposited'}:{' '}
                {dollarInput && tab === 'deposit' ? '$' : ''}
                {formatUnits(maxAmount, amountDecimals)}{' '}
                {dollarInput && tab === 'deposit' ? 'USDC' : amountSymbol}
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center border border-border rounded px-3 focus-within:border-accent">
                {dollarInput && tab === 'deposit' && (
                  <span className="text-ink/45 font-mono text-sm mr-1">$</span>
                )}
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={dollarInput && tab === 'deposit' ? '50' : '0.0'}
                  className="flex-1 bg-transparent py-2 text-sm font-mono outline-none"
                />
              </div>
              <button
                onClick={setMax}
                className="px-3 py-2 rounded border border-border text-xs text-ink/70 hover:text-ink"
              >
                Max
              </button>
            </div>
            {dollarInput && tab === 'deposit' && (
              <div className="flex gap-2 mb-4">
                {['25', '50', '100'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className="px-3 py-1 rounded-full border border-border text-xs text-ink/70 hover:text-ink"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            )}

            {feeAppliesHere && amountBig > 0n && (
              <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Fee ({(feeBps / 100).toFixed(2)}%)</span>
                  <span>
                    {formatUnits(feeAmount, opportunity.asset.decimals)} {opportunity.asset.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70">
                  <span>{tab === 'deposit' ? "You'll deposit" : "You'll receive"}</span>
                  <span>
                    {formatUnits(netAmount, opportunity.asset.decimals)} {opportunity.asset.symbol}
                  </span>
                </div>
              </div>
            )}
            {isMoonwell && tab === 'deposit' && moonwellMintTokens > 0n && (
              <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3">
                You receive ~{formatTokenAmount(moonwellMintTokens, positionDecimals)} mUSDC as a
                receipt. It is not 1:1 with USDC — your claim on the pool grows as interest
                accrues. Withdrawing burns the receipt and returns USDC to this wallet.
              </div>
            )}
            {isMoonwell && tab === 'withdraw' && (
              <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3">
                Withdrawal returns USDC to this wallet. mUSDC is Moonwell&apos;s receipt — the
                contract burns it in the same transaction, so you don&apos;t convert it
                afterwards.
                {amountBig > 0n && !feeAppliesHere && (
                  <>
                    {' '}
                    You receive {formatUnits(netAmount, opportunity.asset.decimals)} USDC.
                  </>
                )}
              </div>
            )}
            {opportunity.protocol === 'lido' && tab === 'withdraw' && feesEnabled() && (
              <div className="text-xs text-ink/50 mb-3">
                Withdrawal fee ({(WITHDRAW_FEE_BPS / 100).toFixed(2)}%) is taken when you claim
                below, not now.
              </div>
            )}

            {insufficientBalance && (
              <div className="text-xs text-danger mb-3">Amount exceeds available balance.</div>
            )}
            {errorMsg && <div className="text-xs text-danger mb-3 break-words">{errorMsg}</div>}
            {step === 'done' && (
              <div className="text-xs text-accent mb-3">
                {tab === 'withdraw' && opportunity.protocol === 'lido'
                  ? 'Withdrawal requested. It will appear below once claimable.'
                  : tab === 'withdraw' && isMoonwell
                    ? 'USDC is back in your wallet.'
                    : tab === 'deposit' && dollarInput
                      ? `Your $${amount || '0'} is in ${opportunity.protocolLabel} on ${chainName(opportunity.chainId)}.`
                      : 'Transaction confirmed.'}
              </div>
            )}

            {tab === 'deposit' && address && walletBalance === 0n ? (
              <button
                type="button"
                onClick={() => setBuyOpen(true)}
                className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm"
              >
                {dollarInput ? 'Buy USDC first' : `Get ${opportunity.asset.symbol} first`}
              </button>
            ) : (
              <button
                onClick={tab === 'deposit' ? handleDeposit : handleWithdraw}
                disabled={busy || waitingOnSwitch || amountBig === 0n || insufficientBalance || !address}
                className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {!address
                  ? 'Deposit'
                  : switching || waitingOnSwitch
                    ? `Switching to ${chainName(opportunity.chainId)}…`
                    : step === 'sendingFee'
                    ? 'Sending fee…'
                    : step === 'approving'
                      ? dollarInput && amount
                        ? `Approve $${amount} ${opportunity.asset.symbol}`
                        : 'Approving…'
                      : step === 'acting'
                        ? 'Confirming…'
                        : tab === 'deposit'
                          ? dollarInput && amount
                            ? `Deposit $${amount}`
                            : `Deposit ${opportunity.asset.symbol}`
                          : opportunity.protocol === 'lido'
                            ? 'Request withdrawal'
                            : `Withdraw ${opportunity.asset.symbol}`}
              </button>
            )}

            <p className="text-[11px] text-ink/40 text-center mt-3 leading-relaxed">
              Yield is not insured or guaranteed. You can lose capital. Openhand never holds your
              funds.
            </p>

            {opportunity.protocol === 'lido' && tab === 'withdraw' && (
              <LidoWithdrawalRequests chainId={opportunity.chainId} />
            )}
          </>
        )}
      </div>
    </div>
    {buyOpen && address && (
      <OnrampModal
        address={address}
        chainId={opportunity.chainId}
        onClose={() => setBuyOpen(false)}
      />
    )}
    </>
  );
}
