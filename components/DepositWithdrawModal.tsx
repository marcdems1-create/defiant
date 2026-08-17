'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useBalance, useChainId, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { readContract, sendTransaction, waitForTransactionReceipt } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { fetchSwapQuote, swapConfigured } from '@/lib/swap/zeroex';
import type { Opportunity } from '@/lib/protocols/types';
import { erc20Abi } from '@/lib/abi/erc20';
import { aavePoolAbi } from '@/lib/abi/aavePool';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { curvePoolAbi2Coin, curvePoolAbi3Coin, curvePoolAbiNg } from '@/lib/abi/curvePool';
import { sparkPsmAbi } from '@/lib/abi/sparkPsm';
import { stEthAbi, lidoWithdrawalQueueAbi } from '@/lib/abi/lido';
import { crvDepositorAbi, cvxCrvRewardsAbi } from '@/lib/abi/convex';
import { compoundCometAbi } from '@/lib/abi/compoundComet';
import { moonwellMTokenAbi } from '@/lib/abi/moonwell';
import { LIDO } from '@/lib/config/addresses';
import { getWagmiConfig } from '@/lib/wagmi';
import { computeFee, feeBpsFor, feesEnabled, STANDARD_FEE_BPS } from '@/lib/config/fees';
import { useSendFee } from '@/lib/hooks/useSendFee';
import { reportReferralFeePaid, useReferralFee } from '@/lib/hooks/useReferralFee';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { chainName, formatApy } from '@/lib/format';
import { ERC4626_PROTOCOLS } from '@/lib/protocols/types';
import { LidoWithdrawalRequests } from './LidoWithdrawalRequests';

type Tab = 'deposit' | 'withdraw';
type Step = 'idle' | 'sendingFee' | 'approving' | 'swapping' | 'acting' | 'done' | 'error';

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
  const { sendFee } = useSendFee();
  const refFee = useReferralFee(address);

  const [tab, setTab] = useState<Tab>('deposit');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // "Pay with USDC (auto-convert)" — on by default for opportunities whose
  // deposit asset isn't USDC (Convex/Frax) so a USDC-only user can one-tap in.
  const [payWithUsdc, setPayWithUsdc] = useState(true);

  const wrongNetwork = currentChainId !== opportunity.chainId;
  const isNativeDeposit = opportunity.protocol === 'lido';
  const isCurve = opportunity.protocol === 'curve';
  const isConvex = opportunity.protocol === 'convex-cvxcrv';
  // Sky Savings (sUSDS) via the Spark PSM: USDC <-> sUSDS in a single
  // swapExactIn call (no slippage/fees beyond gas). Deposit token is USDC
  // (asset), position is sUSDS (positionToken), and the PSM is depositTarget.
  const isSpark = opportunity.protocol === 'spark-susds';
  // Lido withdrawal fee is charged at claim time (funds aren't in the
  // wallet yet at request time) — see LidoWithdrawalRequests.
  const feeAppliesHere = feesEnabled() && !(opportunity.protocol === 'lido' && tab === 'withdraw');

  // Auto-zap: for opportunities whose deposit asset isn't USDC (they set
  // `convertibleFrom` = USDC), offer to pay with USDC and swap→deposit in one
  // flow. Requires the 0x swap engine to be configured; when it isn't, the UI
  // falls back to the guided /swap link instead (no regression).
  const convertible = opportunity.convertibleFrom;
  const zapAvailable = Boolean(convertible) && swapConfigured() && tab === 'deposit';
  const zapping = zapAvailable && payWithUsdc && Boolean(convertible);
  // The token the user actually enters/pays on the deposit tab.
  const depositInputToken = zapping && convertible ? convertible : opportunity.asset;
  // Token the fee is denominated in for display (USDC when zapping a deposit).
  const feeToken = tab === 'deposit' ? depositInputToken : opportunity.asset;

  // Curve LP shares aren't 1:1 with the underlying asset the way Aave's
  // aTokens or Yearn's vault shares are — different decimals AND a virtual
  // price that isn't 1. The withdraw tab enters an amount of positionToken
  // (LP shares), not asset (USDC), so it needs its own decimals/symbol.
  // Unset for every other protocol, where position and asset match.
  const positionDecimals = opportunity.positionDecimals ?? opportunity.asset.decimals;
  const positionSymbol = opportunity.positionSymbol ?? opportunity.asset.symbol;
  const amountDecimals = tab === 'withdraw' ? positionDecimals : depositInputToken.decimals;
  const amountSymbol = tab === 'withdraw' ? positionSymbol : depositInputToken.symbol;

  const nativeBalance = useBalance({
    address,
    chainId: opportunity.chainId,
    query: { enabled: isNativeDeposit && Boolean(address) },
  });
  const erc20WalletBalance = useErc20Balance(
    isNativeDeposit ? undefined : depositInputToken.address,
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
  // Newer StableSwap-NG pools (every Curve L2 pool here) take a dynamic
  // uint256[] amounts array on add_liquidity/calc_token_amount; the older
  // mainnet factory pool + 3pool take a fixed uint256[N]. Same coin index and
  // withdraw-side shape either way — only the add side's ABI/array differ.
  const curveDynamic = opportunity.curve?.amountsEncoding === 'dynamic';
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
  function curveAmountsDynamic(amount: bigint): bigint[] {
    const arr = new Array<bigint>(curveNumCoins).fill(0n);
    arr[curveCoinIndexNum] = amount;
    return arr;
  }

  // Curve-only: preview the actual USDC amount a withdrawal will produce, so
  // (a) the fee below is based on real USDC out rather than the LP-share
  // amount typed into the withdraw tab (a different unit entirely), and (b)
  // remove_liquidity_one_coin's tx (below) can carry a real min-out instead
  // of 0 — unlike Aave/Yearn's fixed-rate mechanics, this behaves like a
  // swap and a 0 min-out is a real sandwich-attack surface.
  // remove_liquidity_one_coin/calc_withdraw_one_coin take the same
  // (uint256, int128[, uint256]) shape across all three ABI variants (2-coin,
  // 3-coin, and dynamic NG — the last verified on-chain against the live L2
  // pools), so curvePoolAbi2Coin works here regardless of the pool's add-side
  // array encoding.
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

  // Spark PSM (sUSDS): like Curve, the withdraw tab enters sUSDS (18 decimals),
  // not USDC — so preview the USDC the PSM will return, both to base the fee on
  // real USDC out and to carry a min-out on the swap. The PSM is fixed-rate
  // (no AMM slippage); the 1% tolerance only guards against the savings rate
  // ticking between preview and mining.
  const sparkWithdrawPreview = useReadContract({
    address: opportunity.depositTarget,
    abi: sparkPsmAbi,
    functionName: 'previewSwapExactIn',
    args: [opportunity.positionToken ?? NULL_ADDRESS, opportunity.asset.address, amountBig],
    chainId: opportunity.chainId,
    query: { enabled: isSpark && tab === 'withdraw' && amountBig > 0n },
  });
  // sUSDS must be approved to the PSM before a withdraw swap (the PSM pulls it
  // via transferFrom). The shared `allowance` hook is scoped to the deposit
  // side (USDC -> PSM), so the withdraw side needs its own read.
  const sparkWithdrawAllowance = useErc20Allowance(
    isSpark ? opportunity.positionToken : undefined,
    address,
    opportunity.depositTarget,
    opportunity.chainId,
  );

  // Effective fee bps after any referral discount (referee coupon and/or the
  // wallet's own referrer rank discount). Same schedule for deposit + withdraw.
  const feeBps = feeBpsFor({
    isReferee: refFee.isReferee,
    referrerRankIndex: refFee.referrerRankIndex,
  });
  const feeDiscounted = feeBps < STANDARD_FEE_BPS;
  // For a Curve withdrawal, amountBig is LP shares (18 decimals, not 1:1
  // with USDC) — the fee must be computed on the previewed USDC output
  // instead, or it comes out wildly wrong (off by orders of magnitude).
  // Aave/Yearn keep using amountBig directly: their share/aToken amounts
  // are a close enough proxy for the underlying that this is fine there.
  const feeBasisAmount =
    tab === 'withdraw' && isCurve
      ? ((curveWithdrawPreview.data as bigint | undefined) ?? 0n)
      : tab === 'withdraw' && isSpark
        ? ((sparkWithdrawPreview.data as bigint | undefined) ?? 0n)
        : amountBig;
  const feeAmount = feeAppliesHere ? computeFee(feeBasisAmount, feeBps) : 0n;
  // Deposit: fee comes out of what you send in, so less reaches the protocol.
  // Withdraw: the protocol pays out the full gross amount first, then the
  // fee is taken from what lands in your wallet — see handleWithdraw.
  const netAmount = feeBasisAmount - feeAmount;

  // Auto-zap preview: quote how much of the deposit asset `netAmount` USDC buys
  // via 0x, so the modal can show an estimate before the user commits. Only
  // runs when zapping with a positive net amount.
  const zapQuote = useQuery({
    queryKey: [
      'zapQuote',
      opportunity.chainId,
      convertible?.address,
      opportunity.asset.address,
      netAmount.toString(),
      address,
    ],
    queryFn: () =>
      fetchSwapQuote({
        chainId: opportunity.chainId,
        sellToken: convertible!.address,
        buyToken: opportunity.asset.address,
        sellAmount: netAmount,
        taker: address!,
        slippageBps: 100,
      }),
    enabled: Boolean(zapping && convertible && address && netAmount > 0n),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });

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
    query: { enabled: isCurve && !curveDynamic && curveNumCoins === 2 && tab === 'deposit' && netAmount > 0n },
  });
  const curveDepositPreview3 = useReadContract({
    address: opportunity.depositTarget,
    abi: curvePoolAbi3Coin,
    functionName: 'calc_token_amount',
    args: [curveAmounts3(netAmount), true],
    chainId: opportunity.chainId,
    query: { enabled: isCurve && !curveDynamic && curveNumCoins === 3 && tab === 'deposit' && netAmount > 0n },
  });
  const curveDepositPreviewNg = useReadContract({
    address: opportunity.depositTarget,
    abi: curvePoolAbiNg,
    functionName: 'calc_token_amount',
    args: [curveAmountsDynamic(netAmount), true],
    chainId: opportunity.chainId,
    query: { enabled: isCurve && curveDynamic && tab === 'deposit' && netAmount > 0n },
  });
  // Spark deposit: preview how much sUSDS `netAmount` USDC buys through the PSM,
  // so the swap can carry a real min-out.
  const sparkDepositPreview = useReadContract({
    address: opportunity.depositTarget,
    abi: sparkPsmAbi,
    functionName: 'previewSwapExactIn',
    args: [opportunity.asset.address, opportunity.positionToken ?? NULL_ADDRESS, netAmount],
    chainId: opportunity.chainId,
    query: { enabled: isSpark && tab === 'deposit' && netAmount > 0n },
  });
  const curveDepositPreviewData = (
    curveDynamic
      ? curveDepositPreviewNg.data
      : curveNumCoins === 3
        ? curveDepositPreview3.data
        : curveDepositPreview2.data
  ) as bigint | undefined;

  const maxAmount = tab === 'deposit' ? walletBalance : positionBalanceValue;
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

  async function handleSwitchNetwork() {
    try {
      await switchChainAsync({ chainId: opportunity.chainId });
    } catch {
      // user rejected the switch — leave the button visible to retry
    }
  }

  // One-tap zap: pay with USDC, swap to the deposit asset via 0x, then deposit
  // — all wallet-signed, no router contract (non-custodial). Only Convex/Frax
  // set `convertibleFrom`, so the final deposit step handles just those two.
  // NOTE: the swap+deposit write path needs the 0x key + a funded wallet to run
  // end-to-end; it isn't transaction-tested (same caveat as every tx flow here).
  async function handleZapDeposit() {
    if (!address || amountBig === 0n || !convertible) return;
    setErrorMsg(null);
    const cfg = getWagmiConfig();
    const chainId = opportunity.chainId;
    try {
      // 1) optional app fee on the USDC you put in
      let netUsdc = amountBig;
      if (feeAmount > 0n) {
        setStep('sendingFee');
        const feeHash = await sendFee({
          isNative: false,
          tokenAddress: convertible.address,
          amount: feeAmount,
          chainId,
        });
        netUsdc = amountBig - feeAmount;
        if (feeHash && refFee.isReferee) reportReferralFeePaid(address, chainId, feeHash);
      }

      // 2) quote USDC -> deposit asset for the net amount
      const quote =
        zapQuote.data ??
        (await fetchSwapQuote({
          chainId,
          sellToken: convertible.address,
          buyToken: opportunity.asset.address,
          sellAmount: netUsdc,
          taker: address,
          slippageBps: 100,
        }));
      if (!quote) {
        throw new Error(`No swap route for ${convertible.symbol} → ${opportunity.asset.symbol}`);
      }

      // 3) approve USDC to 0x's allowance target (exact net, never unbounded)
      const usdcAllowance = (await readContract(cfg, {
        address: convertible.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, quote.allowanceTarget],
      })) as bigint;
      if (usdcAllowance < netUsdc) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: convertible.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [quote.allowanceTarget, netUsdc],
          chainId,
        });
        await waitForTransactionReceipt(cfg, { hash: approveHash, chainId });
      }

      // 4) swap — measure the asset actually received (deposit exactly that)
      setStep('swapping');
      const assetBefore = (await readContract(cfg, {
        address: opportunity.asset.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint;
      const swapHash = await sendTransaction(cfg, {
        to: quote.to,
        data: quote.data,
        value: quote.value,
        chainId,
      });
      await waitForTransactionReceipt(cfg, { hash: swapHash, chainId });
      const assetAfter = (await readContract(cfg, {
        address: opportunity.asset.address,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
      })) as bigint;
      const received = assetAfter - assetBefore;
      if (received <= 0n) throw new Error(`Swap produced no ${opportunity.asset.symbol}`);

      // 5) approve the received asset to the protocol
      const assetAllowance = (await readContract(cfg, {
        address: opportunity.asset.address,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, opportunity.depositTarget],
      })) as bigint;
      if (assetAllowance < received) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: opportunity.asset.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [opportunity.depositTarget, received],
          chainId,
        });
        await waitForTransactionReceipt(cfg, { hash: approveHash, chainId });
      }

      // 6) deposit the received asset (Convex convert-and-stake, or Frax ERC-4626)
      setStep('acting');
      if (isConvex) {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: crvDepositorAbi,
          functionName: 'deposit',
          args: [received, false, opportunity.positionToken!],
          chainId,
        });
        await waitForTransactionReceipt(cfg, { hash, chainId });
      } else {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'deposit',
          args: [received, address],
          chainId,
        });
        await waitForTransactionReceipt(cfg, { hash, chainId });
      }
      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Zap failed');
    }
  }

  async function handleDeposit() {
    if (!address || amountBig === 0n) return;
    if (zapping) {
      await handleZapDeposit();
      return;
    }
    setErrorMsg(null);
    try {
      if (feeAmount > 0n) {
        setStep('sendingFee');
        const feeHash = await sendFee({
          isNative: isNativeDeposit,
          tokenAddress: isNativeDeposit ? undefined : opportunity.asset.address,
          amount: feeAmount,
          chainId: opportunity.chainId,
        });
        // A referee who just paid a fee qualifies their referrer's rank —
        // verified server-side from this tx. Fire-and-forget, never blocks.
        if (feeHash && address && refFee.isReferee) {
          reportReferralFeePaid(address, opportunity.chainId, feeHash);
        }
      }

      if (opportunity.protocol === 'lido') {
        setStep('acting');
        const hash = await writeContractAsync({
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

      // Aave, Yearn, Curve, and Spark (USDC -> PSM): ERC-20 approve for the
      // exact net deposit amount, then act. Deliberately not an unbounded
      // approval — scoped to this deposit only, and to the post-fee amount
      // since that's all that actually reaches the protocol.
      if (allowanceValue < netAmount) {
        setStep('approving');
        const approveHash = await writeContractAsync({
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
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: aavePoolAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, netAmount, address, 0],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'curve') {
        const minMintAmount = curveMinOut(curveDepositPreviewData);
        if (curveDynamic) {
          const hash = await writeContractAsync({
            address: opportunity.depositTarget,
            abi: curvePoolAbiNg,
            functionName: 'add_liquidity',
            args: [curveAmountsDynamic(netAmount), minMintAmount],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        } else if (curveNumCoins === 3) {
          const hash = await writeContractAsync({
            address: opportunity.depositTarget,
            abi: curvePoolAbi3Coin,
            functionName: 'add_liquidity',
            args: [curveAmounts3(netAmount), minMintAmount],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        } else {
          const hash = await writeContractAsync({
            address: opportunity.depositTarget,
            abi: curvePoolAbi2Coin,
            functionName: 'add_liquidity',
            args: [curveAmounts2(netAmount), minMintAmount],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
        }
      } else if (isSpark) {
        // USDC -> sUSDS in one PSM swap; min-out from the previewed sUSDS.
        const minOut = curveMinOut(sparkDepositPreview.data as bigint | undefined);
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: sparkPsmAbi,
          functionName: 'swapExactIn',
          args: [opportunity.asset.address, opportunity.positionToken!, netAmount, minOut, address, 0n],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'compound-v3') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: compoundCometAbi,
          functionName: 'supply',
          args: [opportunity.asset.address, netAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (opportunity.protocol === 'moonwell') {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: moonwellMTokenAbi,
          functionName: 'mint',
          args: [netAmount],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isConvex) {
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: crvDepositorAbi,
          functionName: 'deposit',
          args: [netAmount, false, opportunity.positionToken!],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else {
        const hash = await writeContractAsync({
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
      } else if (isConvex) {
        setStep('acting');
        const hash = await writeContractAsync({
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
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: erc4626Abi,
          functionName: 'redeem',
          args: [amountBig, address, address],
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
      } else if (opportunity.protocol === 'curve') {
        setStep('acting');
        const minReceived = curveMinOut(curveWithdrawPreview.data as bigint | undefined);
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: curvePoolAbi2Coin,
          functionName: 'remove_liquidity_one_coin',
          args: [amountBig, curveCoinIndex, minReceived],
          chainId: opportunity.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: opportunity.chainId });
      } else if (isSpark) {
        // sUSDS -> USDC through the PSM. The PSM pulls sUSDS via transferFrom,
        // so approve it first (only if the live allowance is short).
        const susdsAllowance = (sparkWithdrawAllowance.data as bigint | undefined) ?? 0n;
        if (susdsAllowance < amountBig) {
          setStep('approving');
          const approveHash = await writeContractAsync({
            address: opportunity.positionToken!,
            abi: erc20Abi,
            functionName: 'approve',
            args: [opportunity.depositTarget, amountBig],
            chainId: opportunity.chainId,
          });
          await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId: opportunity.chainId });
          await sparkWithdrawAllowance.refetch();
        }
        setStep('acting');
        const minReceived = curveMinOut(sparkWithdrawPreview.data as bigint | undefined);
        const hash = await writeContractAsync({
          address: opportunity.depositTarget,
          abi: sparkPsmAbi,
          functionName: 'swapExactIn',
          args: [opportunity.positionToken!, opportunity.asset.address, amountBig, minReceived, address, 0n],
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
        setStep('done');
        await refreshBalances();
        return;
      }

      // Funds are now in the wallet (Aave/Yearn only — Lido returns above).
      // Fee comes out of what just landed, as its own transfer.
      if (feeAmount > 0n) {
        setStep('sendingFee');
        const feeHash = await sendFee({
          isNative: false,
          tokenAddress: opportunity.asset.address,
          amount: feeAmount,
          chainId: opportunity.chainId,
        });
        if (feeHash && address && refFee.isReferee) {
          reportReferralFeePaid(address, opportunity.chainId, feeHash);
        }
      }

      setStep('done');
      await refreshBalances();
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Transaction failed');
    }
  }

  const busy =
    step === 'sendingFee' || step === 'approving' || step === 'swapping' || step === 'acting';

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
                {tab === 'deposit' ? 'Wallet' : 'Deposited'}: {formatUnits(maxAmount, amountDecimals)}{' '}
                {amountSymbol}
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

            {tab === 'deposit' && zapAvailable && convertible && (
              <label className="flex items-start gap-2 text-xs text-ink/70 border border-accent/30 bg-accent/5 rounded px-3 py-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={payWithUsdc}
                  onChange={(e) => setPayWithUsdc(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Pay with {convertible.symbol} — auto-convert to {opportunity.asset.symbol} and
                  deposit in one flow.
                  {zapping && amountBig > 0n && zapQuote.data && (
                    <span className="text-accent">
                      {' '}≈ {formatUnits(zapQuote.data.buyAmount, opportunity.asset.decimals)}{' '}
                      {opportunity.asset.symbol}
                    </span>
                  )}
                  {zapping && amountBig > 0n && zapQuote.isFetching && ' quoting…'}
                </span>
              </label>
            )}
            {tab === 'deposit' && opportunity.convertibleFrom && !zapAvailable && (
              <Link
                href={`/swap?sell=${opportunity.convertibleFrom.symbol}&buy=${opportunity.asset.symbol}`}
                className="block text-xs text-accent border border-accent/30 bg-accent/5 rounded px-3 py-2 mb-4 hover:bg-accent/10"
              >
                This deposits {opportunity.asset.symbol}. Only have{' '}
                {opportunity.convertibleFrom.symbol}? Swap it for {opportunity.asset.symbol} first
                →
              </Link>
            )}

            {feeAppliesHere && amountBig > 0n && (
              <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>
                    Fee ({(feeBps / 100).toFixed(2)}%)
                    {feeDiscounted && (
                      <span className="ml-1 text-accent">· referral discount</span>
                    )}
                  </span>
                  <span>
                    {feeDiscounted && (
                      <span className="text-ink/40 line-through mr-1">
                        {(STANDARD_FEE_BPS / 100).toFixed(2)}%
                      </span>
                    )}
                    {formatUnits(feeAmount, feeToken.decimals)} {feeToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-ink/70">
                  <span>
                    {tab === 'withdraw' ? "You'll receive" : zapping ? "You'll swap" : "You'll deposit"}
                  </span>
                  <span>
                    {formatUnits(netAmount, feeToken.decimals)} {feeToken.symbol}
                  </span>
                </div>
              </div>
            )}
            {opportunity.protocol === 'lido' && tab === 'withdraw' && feesEnabled() && (
              <div className="text-xs text-ink/50 mb-3">
                Withdrawal fee ({(feeBps / 100).toFixed(2)}%) is taken when you claim
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
                : step === 'sendingFee'
                  ? 'Sending fee…'
                  : step === 'approving'
                    ? 'Approving…'
                    : step === 'swapping'
                      ? 'Swapping…'
                      : step === 'acting'
                        ? 'Confirming…'
                        : tab === 'deposit'
                          ? zapping
                            ? `Swap ${convertible?.symbol} & deposit`
                            : `Deposit ${opportunity.asset.symbol}`
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
