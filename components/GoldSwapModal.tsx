'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import {
  useAccount,
  useChainId,
  useReadContract,
  useSendTransaction,
  useSwitchChain,
  useWriteContract,
} from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { erc20Abi } from '@/lib/abi/erc20';
import { LIFI_STOCK_SLIPPAGE, stockChainLabel, usdcOnStockChain } from '@/lib/config/lifi';
import { formatTokenAmount } from '@/lib/format';
import { GOLD_ISSUER_LABEL, type GoldToken } from '@/lib/lifi/gold';
import { estimateCappedGas, formatTxError, MAX_TX_GAS } from '@/lib/tx/gas';
import { getWagmiConfig, NETWORK_MODE } from '@/lib/wagmi';
import { ConnectButtonClient } from './ConnectButtonClient';

type Side = 'buy' | 'sell';
type Step = 'idle' | 'quoting' | 'approving' | 'swapping' | 'done' | 'error';

interface QuotePayload {
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  gas?: string;
  approvalAddress: `0x${string}`;
  fromAmount: string;
  toAmount: string;
  toAmountMin: string;
  toSymbol: string;
  toDecimals: number;
  tool?: string;
  protocolFeeUsd?: number;
}

export function GoldSwapModal({
  token,
  initialSide,
  onClose,
}: {
  token: GoldToken;
  initialSide: Side;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const { sendTransactionAsync } = useSendTransaction();
  const [side, setSide] = useState<Side>(initialSide);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuotePayload | null>(null);
  const [switchFailed, setSwitchFailed] = useState(false);
  const autoSwitchKey = useRef('');

  const usdc = usdcOnStockChain(token.chainId);
  const mainnet = NETWORK_MODE === 'mainnet';
  const wrongNetwork = Boolean(address && mainnet && currentChainId !== token.chainId);

  const usdcBal = useReadContract({
    address: usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: token.chainId,
    query: { enabled: Boolean(address && usdc && mainnet) },
  });
  const goldBal = useReadContract({
    address: token.address,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: token.chainId,
    query: { enabled: Boolean(address && mainnet) },
  });

  const sellToken = side === 'buy' ? usdc : token.address;
  const sellDecimals = side === 'buy' ? 6 : token.decimals;
  const { data: allowance } = useReadContract({
    address: sellToken,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && quote?.approvalAddress && sellToken
      ? [address, quote.approvalAddress]
      : undefined,
    chainId: token.chainId,
    query: { enabled: Boolean(address && sellToken && quote?.approvalAddress && mainnet) },
  });

  const maxAmount = side === 'buy'
    ? ((usdcBal.data as bigint | undefined) ?? 0n)
    : ((goldBal.data as bigint | undefined) ?? 0n);

  useEffect(() => {
    if (!address || !mainnet || currentChainId === token.chainId) return;
    const key = `${address}-${token.chainId}`;
    if (autoSwitchKey.current === key) return;
    autoSwitchKey.current = key;
    void switchChainAsync({ chainId: token.chainId }).catch(() => setSwitchFailed(true));
  }, [address, mainnet, currentChainId, token.chainId, switchChainAsync]);

  useEffect(() => {
    setQuote(null);
    setStep('idle');
    setErrorMsg(null);
  }, [side, amount, token.id]);

  const parsedSell = useMemo(() => {
    const trimmed = amount.trim();
    if (!trimmed || !sellDecimals) return null;
    try {
      const value = parseUnits(trimmed, sellDecimals);
      return value > 0n ? value : null;
    } catch {
      return null;
    }
  }, [amount, sellDecimals]);

  useEffect(() => {
    if (!address || !mainnet || !usdc || !parsedSell || wrongNetwork) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        setStep('quoting');
        try {
          const res = await fetch('/api/lifi/quote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chainId: token.chainId,
              fromToken: side === 'buy' ? usdc : token.address,
              toToken: side === 'buy' ? token.address : usdc,
              fromAmount: parsedSell.toString(),
              fromAddress: address,
            }),
          });
          const json = (await res.json()) as QuotePayload & { error?: string };
          if (!res.ok || !json.to || !json.data) {
            setQuote(null);
            setErrorMsg(json.error || 'No route for this pair right now');
            setStep('error');
            return;
          }
          setQuote(json);
          setErrorMsg(null);
          setStep('idle');
        } catch {
          setQuote(null);
          setErrorMsg('Could not fetch a quote');
          setStep('error');
        }
      })();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [address, mainnet, usdc, parsedSell, wrongNetwork, side, token.address, token.chainId]);

  async function submit() {
    if (!address || !mainnet || !quote || !sellToken || !parsedSell) return;
    setErrorMsg(null);
    try {
      const needsApprove = ((allowance as bigint | undefined) ?? 0n) < parsedSell;
      if (needsApprove) {
        setStep('approving');
        const gas = await estimateCappedGas({
          account: address,
          chainId: token.chainId,
          address: sellToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [quote.approvalAddress, parsedSell],
        });
        const hash = await writeContractAsync({
          address: sellToken,
          abi: erc20Abi,
          functionName: 'approve',
          args: [quote.approvalAddress, parsedSell],
          chainId: token.chainId,
          gas,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: token.chainId });
      }

      setStep('swapping');
      let gas = quote.gas ? BigInt(quote.gas) : undefined;
      if (gas && gas > MAX_TX_GAS) gas = MAX_TX_GAS;
      const hash = await sendTransactionAsync({
        to: quote.to,
        data: quote.data,
        value: BigInt(quote.value || '0'),
        chainId: token.chainId,
        ...(gas ? { gas } : {}),
      });
      await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: token.chainId });
      setStep('done');
    } catch (e) {
      setStep('error');
      setErrorMsg(formatTxError(e));
    }
  }

  const busy = step === 'quoting' || step === 'approving' || step === 'swapping' || switching;
  const slippagePct = (LIFI_STOCK_SLIPPAGE * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 sm:px-4">
      <div className="w-full max-w-md bg-paper border border-border border-b-0 sm:border-b rounded-t-2xl sm:rounded-lg p-6 max-h-[min(92dvh,100%)] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-lg font-medium">{token.symbol}</div>
            <div className="text-sm text-ink/50">
              {token.name} · {GOLD_ISSUER_LABEL[token.issuer]} · {stockChainLabel(token.chainId)}
            </div>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink" aria-label="Close">
            ✕
          </button>
        </div>

        <p className="text-xs text-ink/50 leading-relaxed mb-4">
          Meant to track one troy ounce of vaulted gold. Gold pays no coupon — this is price
          upside and downside, not yield, and not a savings product. You sign the swap.
          Openhand never holds the tokens.
        </p>

        {!mainnet && (
          <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2 mb-4">
            Practice mode. Gold swaps are mainnet-only.
          </div>
        )}

        <div className="flex gap-2 mb-4">
          {(['buy', 'sell'] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSide(s)}
              className={`flex-1 py-1.5 rounded text-sm capitalize border ${
                side === s ? 'bg-accent text-paper border-accent' : 'border-border text-ink/70'
              }`}
            >
              {s === 'buy' ? 'Buy with USDC' : 'Sell to USDC'}
            </button>
          ))}
        </div>

        {!address ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink/65">Connect a wallet to sign the swap yourself.</p>
            <ConnectButtonClient label="Deposit" />
          </div>
        ) : (
          <>
            {wrongNetwork && (
              <div className="text-xs text-ink/50 mb-3">
                {switching || !switchFailed
                  ? `Switching to ${stockChainLabel(token.chainId)}…`
                  : `Confirm ${stockChainLabel(token.chainId)} in your wallet to continue.`}
              </div>
            )}

            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>{side === 'buy' ? 'Amount (USD)' : `Amount (${token.symbol})`}</span>
              <span>
                Wallet:{' '}
                {side === 'buy' ? '$' : ''}
                {formatUnits(maxAmount, sellDecimals)} {side === 'buy' ? 'USDC' : token.symbol}
              </span>
            </div>
            <div className="flex gap-2 mb-3">
              <div className="flex-1 flex items-center border border-border rounded px-3 focus-within:border-accent">
                {side === 'buy' && <span className="text-ink/45 font-mono text-sm mr-1">$</span>}
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={side === 'buy' ? '50' : '0.0'}
                  className="flex-1 bg-transparent py-2 text-sm font-mono outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setAmount(formatUnits(maxAmount, sellDecimals))}
                className="px-3 py-2 rounded border border-border text-xs text-ink/70 hover:text-ink"
              >
                Max
              </button>
            </div>

            {quote && step !== 'quoting' && (
              <div className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5 text-xs text-ink/65 mb-4 leading-relaxed">
                <div>
                  You receive at least{' '}
                  <span className="font-mono text-ink">
                    {formatTokenAmount(BigInt(quote.toAmountMin), quote.toDecimals)} {quote.toSymbol}
                  </span>{' '}
                  ({slippagePct}% slippage).
                </div>
                {quote.tool && <div className="mt-1">Route: {quote.tool} via LI.FI</div>}
                {quote.protocolFeeUsd !== undefined && (
                  <div className="mt-1">
                    LI.FI protocol fee ≈ ${quote.protocolFeeUsd.toFixed(2)}. Openhand does not add
                    a cut.
                  </div>
                )}
              </div>
            )}

            {errorMsg && step === 'error' && (
              <p className="text-sm text-danger mb-3">{errorMsg}</p>
            )}

            {step === 'done' ? (
              <p className="text-sm text-accent">Swap confirmed. Tokens are in your wallet.</p>
            ) : (
              <button
                type="button"
                disabled={!mainnet || busy || !quote || wrongNetwork || !parsedSell}
                onClick={() => void submit()}
                className="w-full py-2.5 rounded-xl bg-accent text-paper font-medium text-sm disabled:opacity-40"
              >
                {!mainnet
                  ? 'Mainnet only'
                  : step === 'quoting'
                    ? 'Fetching quote…'
                    : step === 'approving'
                      ? `Approve ${side === 'buy' ? 'USDC' : token.symbol}`
                      : step === 'swapping'
                        ? 'Confirming…'
                        : side === 'buy'
                          ? `Buy ${token.symbol}`
                          : `Sell ${token.symbol}`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
