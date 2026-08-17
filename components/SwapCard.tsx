'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { sendTransaction, waitForTransactionReceipt } from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { erc20Abi } from '@/lib/abi/erc20';
import { SWAP_TOKENS, swapTokensForChain, type SwapToken } from '@/lib/config/swapTokens';
import {
  DEFAULT_SWAP_SLIPPAGE_BPS,
  fetchSwapQuote,
  swapConfigured,
} from '@/lib/swap/zeroex';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { chains, getWagmiConfig, type SupportedChainId } from '@/lib/wagmi';
import { chainName } from '@/lib/format';

type Step = 'idle' | 'approving' | 'swapping' | 'done' | 'error';

const SLIPPAGE_OPTIONS = [50, 100, 300]; // 0.5%, 1%, 3%

export function SwapCard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const tokens = useMemo(() => swapTokensForChain(chainId), [chainId]);
  const supported = tokens.length > 0;

  const [sellSymbol, setSellSymbol] = useState('');
  const [buySymbol, setBuySymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SWAP_SLIPPAGE_BPS);
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pick token defaults for the current chain, honoring ?sell=/?buy= query
  // params (used by the "pay with USDC" links from the deposit modal) when
  // those symbols exist on the chain. Computed idempotently from the URL each
  // run — no one-time ref — so React StrictMode's double-invoke in dev can't
  // clobber the prefill back to defaults.
  useEffect(() => {
    const bySymbol = (want: string | null) =>
      want ? tokens.find((t) => t.symbol.toLowerCase() === want.toLowerCase()) : undefined;

    if (tokens.length >= 2) {
      const params = new URLSearchParams(window.location.search);
      const sell = bySymbol(params.get('sell')) ?? tokens[0];
      let buy = bySymbol(params.get('buy'));
      if (!buy || buy.symbol === sell.symbol) {
        buy = tokens.find((t) => t.symbol !== sell.symbol) ?? tokens[1];
      }
      setSellSymbol(sell.symbol);
      setBuySymbol(buy.symbol);
    } else {
      setSellSymbol('');
      setBuySymbol('');
    }
    setAmount('');
    setStep('idle');
    setErrorMsg(null);
  }, [chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const sellToken = tokens.find((t) => t.symbol === sellSymbol);
  const buyToken = tokens.find((t) => t.symbol === buySymbol);

  const amountBig = useMemo(() => {
    if (!amount || !sellToken) return 0n;
    try {
      return parseUnits(amount, sellToken.decimals);
    } catch {
      return 0n;
    }
  }, [amount, sellToken]);

  const sellBalance = useErc20Balance(
    sellToken?.address,
    address,
    chainId as SupportedChainId,
  );
  const sellBalanceValue = (sellBalance.data as bigint | undefined) ?? 0n;

  const configured = swapConfigured();
  const sameToken = Boolean(sellToken && buyToken && sellToken.address === buyToken.address);

  const quote = useQuery({
    queryKey: [
      'swapQuote',
      chainId,
      sellToken?.address,
      buyToken?.address,
      amountBig.toString(),
      address,
      slippageBps,
    ],
    queryFn: () =>
      fetchSwapQuote({
        chainId,
        sellToken: sellToken!.address,
        buyToken: buyToken!.address,
        sellAmount: amountBig,
        taker: address!,
        slippageBps,
      }),
    enabled: Boolean(
      configured && address && sellToken && buyToken && !sameToken && amountBig > 0n,
    ),
    refetchInterval: 20_000,
    staleTime: 15_000,
  });

  const allowance = useErc20Allowance(
    sellToken?.address,
    address,
    quote.data?.allowanceTarget,
    chainId as SupportedChainId,
  );
  const allowanceValue = (allowance.data as bigint | undefined) ?? 0n;

  const insufficientBalance = amountBig > 0n && amountBig > sellBalanceValue;
  const needsApproval = Boolean(quote.data) && allowanceValue < amountBig;
  const busy = step === 'approving' || step === 'swapping';

  function flipTokens() {
    setSellSymbol(buySymbol);
    setBuySymbol(sellSymbol);
    setAmount('');
    setStep('idle');
    setErrorMsg(null);
  }

  function setMax() {
    if (sellToken) setAmount(formatUnits(sellBalanceValue, sellToken.decimals));
  }

  async function handleSwitch(targetId: number) {
    try {
      await switchChainAsync({ chainId: targetId });
    } catch {
      // user rejected — leave buttons visible to retry
    }
  }

  async function handleSwap() {
    if (!address || !sellToken || !buyToken || !quote.data) return;
    setErrorMsg(null);
    try {
      const q = quote.data;
      // Scope the approval to exactly this swap amount, targeting 0x's
      // AllowanceHolder (issues.allowance.spender), never an unbounded approval
      // — same discipline as the deposit flow.
      if (allowanceValue < amountBig) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: sellToken.address,
          abi: erc20Abi,
          functionName: 'approve',
          args: [q.allowanceTarget, amountBig],
          chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash: approveHash, chainId });
        await allowance.refetch();
      }

      // The 0x quote is a ready-to-send transaction; the connected wallet signs
      // and sends it. Nothing routes through the app — non-custodial by design.
      setStep('swapping');
      const hash = await sendTransaction(getWagmiConfig(), {
        to: q.to,
        data: q.data,
        value: q.value,
        chainId,
      });
      await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId });
      setStep('done');
      await Promise.all([sellBalance.refetch(), quote.refetch()]);
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Swap failed');
    }
  }

  const buyAmountDisplay =
    quote.data && buyToken ? formatUnits(quote.data.buyAmount, buyToken.decimals) : '';
  const minReceivedDisplay =
    quote.data && buyToken ? formatUnits(quote.data.minBuyAmount, buyToken.decimals) : '';

  return (
    <div className="w-full max-w-md mx-auto bg-paper border border-border rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-lg font-medium">Swap</h1>
        <span className="text-xs text-ink/50">{chainName(chainId)}</span>
      </div>
      <p className="text-xs text-ink/50 mb-4">
        Convert between stablecoins and tokens in your own wallet. Routed via 0x across
        on-chain liquidity — every transaction is signed by you; Openhand never holds funds.
      </p>

      {!supported ? (
        <div className="text-sm text-ink/70 border border-border rounded px-3 py-4">
          <p className="mb-3">
            Swaps run on Ethereum, Base, or Arbitrum. Switch to one of those networks to
            continue.
          </p>
          <div className="flex flex-wrap gap-2">
            {chains
              .filter((c) => SWAP_TOKENS[c.id])
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSwitch(c.id)}
                  disabled={switching}
                  className="px-3 py-1.5 rounded border border-border text-xs hover:border-accent disabled:opacity-50"
                >
                  Switch to {c.name}
                </button>
              ))}
          </div>
          {chains.filter((c) => SWAP_TOKENS[c.id]).length === 0 && (
            <p className="text-xs text-warn mt-2">
              The app is in testnet mode — 0x has no testnet liquidity, so swapping needs
              mainnet mode.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Sell */}
          <div className="flex justify-between text-xs text-ink/50 mb-1">
            <span>You pay</span>
            <span>
              Balance: {sellToken ? formatUnits(sellBalanceValue, sellToken.decimals) : '0'}{' '}
              {sellToken?.symbol}
            </span>
          </div>
          <div className="flex gap-2 mb-1">
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
            <select
              value={sellSymbol}
              onChange={(e) => setSellSymbol(e.target.value)}
              className="bg-paper border border-border rounded px-2 py-2 text-sm outline-none focus:border-accent"
              aria-label="Token to pay"
            >
              {tokens.map((t: SwapToken) => (
                <option key={t.address} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center my-2">
            <button
              onClick={flipTokens}
              className="w-8 h-8 rounded-full border border-border text-ink/60 hover:text-ink hover:border-accent"
              aria-label="Flip tokens"
            >
              ↓
            </button>
          </div>

          {/* Buy */}
          <div className="flex justify-between text-xs text-ink/50 mb-1">
            <span>You receive (estimated)</span>
          </div>
          <div className="flex gap-2 mb-4">
            <div className="flex-1 border border-border rounded px-3 py-2 text-sm font-mono text-ink/80 min-h-[38px] flex items-center">
              {quote.isFetching ? '…' : buyAmountDisplay || '0.0'}
            </div>
            <select
              value={buySymbol}
              onChange={(e) => setBuySymbol(e.target.value)}
              className="bg-paper border border-border rounded px-2 py-2 text-sm outline-none focus:border-accent"
              aria-label="Token to receive"
            >
              {tokens.map((t: SwapToken) => (
                <option key={t.address} value={t.symbol}>
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          {/* Slippage */}
          <div className="flex items-center justify-between text-xs text-ink/50 mb-3">
            <span>Max slippage</span>
            <div className="flex gap-1">
              {SLIPPAGE_OPTIONS.map((bps) => (
                <button
                  key={bps}
                  onClick={() => setSlippageBps(bps)}
                  className={`px-2 py-1 rounded border text-xs ${
                    slippageBps === bps
                      ? 'bg-accent text-paper border-accent'
                      : 'border-border text-ink/70'
                  }`}
                >
                  {(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%
                </button>
              ))}
            </div>
          </div>

          {quote.data && (
            <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3">
              <div className="flex justify-between">
                <span>Minimum received</span>
                <span>
                  {minReceivedDisplay} {buyToken?.symbol}
                </span>
              </div>
            </div>
          )}

          {!configured && (
            <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2 mb-3">
              Swaps aren&apos;t configured yet — a 0x API key
              (NEXT_PUBLIC_ZEROEX_API_KEY) is required to fetch quotes.
            </div>
          )}
          {sameToken && (
            <div className="text-xs text-warn mb-3">Pick two different tokens.</div>
          )}
          {configured &&
            !quote.isFetching &&
            !quote.data &&
            amountBig > 0n &&
            !sameToken &&
            address && (
              <div className="text-xs text-danger mb-3">
                No route found for this pair/amount right now.
              </div>
            )}
          {insufficientBalance && (
            <div className="text-xs text-danger mb-3">Amount exceeds your balance.</div>
          )}
          {errorMsg && <div className="text-xs text-danger mb-3 break-words">{errorMsg}</div>}
          {step === 'done' && (
            <div className="text-xs text-accent mb-3">Swap confirmed.</div>
          )}

          <button
            onClick={handleSwap}
            disabled={
              busy ||
              !address ||
              !configured ||
              !quote.data ||
              amountBig === 0n ||
              insufficientBalance ||
              sameToken
            }
            className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {!address
              ? 'Connect wallet'
              : step === 'approving'
                ? 'Approving…'
                : step === 'swapping'
                  ? 'Swapping…'
                  : needsApproval
                    ? `Approve ${sellToken?.symbol}`
                    : `Swap ${sellToken?.symbol} → ${buyToken?.symbol}`}
          </button>
        </>
      )}
    </div>
  );
}
