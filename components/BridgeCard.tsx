'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import {
  readContract,
  sendTransaction,
  switchChain,
  waitForTransactionReceipt,
} from 'wagmi/actions';
import { useQuery } from '@tanstack/react-query';
import { erc20Abi } from '@/lib/abi/erc20';
import { BRIDGE_CHAINS, bridgeChainById } from '@/lib/config/bridgeChains';
import { useCrossChainUsdc, type ChainUsdcBalance } from '@/lib/hooks/useCrossChainUsdc';
import { bridgeConfigured, fetchBridgeQuote, fetchBridgeStatus } from '@/lib/bridge/lifi';
import { getWagmiConfig, NETWORK_MODE } from '@/lib/wagmi';

type Step = 'idle' | 'switching' | 'approving' | 'bridging' | 'settling' | 'done' | 'error';

const USDC_DECIMALS = 6;
const POLL_INTERVAL_MS = 8_000;
const MAX_SETTLE_MS = 8 * 60_000; // give slow routes room; user can also just close

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Seamless cross-chain USDC mover. The user only picks WHERE they want their USDC
 * and HOW MUCH — the router figures out the source chain (whichever other chain
 * holds enough) and the underlying bridge (CCTP/Across/… via LI.FI) entirely
 * behind the scenes. Non-custodial: the wallet signs the approve + the bridge tx;
 * funds never touch an Openhand address.
 */
export function BridgeCard() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const mainnetMode = NETWORK_MODE === 'mainnet';
  const configured = bridgeConfigured();

  const { balances, total, isLoading, refetch } = useCrossChainUsdc(address);

  const [destChainId, setDestChainId] = useState<number>(
    bridgeChainById(chainId)?.id ?? BRIDGE_CHAINS[1].id,
  );
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  // Keep the default destination sensible as the wallet's chain changes.
  useEffect(() => {
    if (bridgeChainById(chainId)) setDestChainId(chainId);
  }, [chainId]);

  const amountBig = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, USDC_DECIMALS);
    } catch {
      return 0n;
    }
  }, [amount]);

  // Auto-select the source: the chain that ISN'T the destination with the most
  // USDC (preferring one that fully covers the amount). This is the "user doesn't
  // pick a route" part — they never choose a source chain.
  const source: ChainUsdcBalance | undefined = useMemo(() => {
    const candidates = balances
      .filter((b) => b.chainId !== destChainId)
      .sort((a, b) => (b.balance > a.balance ? 1 : b.balance < a.balance ? -1 : 0));
    if (candidates.length === 0) return undefined;
    return candidates.find((c) => amountBig > 0n && c.balance >= amountBig) ?? candidates[0];
  }, [balances, destChainId, amountBig]);

  const destChain = bridgeChainById(destChainId);
  const sourceBalance = source?.balance ?? 0n;
  const insufficient = amountBig > 0n && amountBig > sourceBalance;

  const quote = useQuery({
    queryKey: ['bridgeQuote', source?.chainId, destChainId, amountBig.toString(), address],
    queryFn: () =>
      fetchBridgeQuote({
        fromChainId: source!.chainId,
        toChainId: destChainId,
        fromToken: source!.usdc,
        toToken: destChain!.usdc,
        fromAmount: amountBig,
        fromAddress: address!,
      }),
    enabled: Boolean(
      configured && address && source && destChain && amountBig > 0n && !insufficient,
    ),
    refetchInterval: 25_000,
    staleTime: 20_000,
  });

  const busy =
    step === 'switching' || step === 'approving' || step === 'bridging' || step === 'settling';

  function setMax() {
    if (source) setAmount(formatUnits(source.balance, USDC_DECIMALS));
  }

  async function handleBridge() {
    if (!address || !source || !destChain || !quote.data) return;
    setErrorMsg(null);
    setStatusNote(null);
    const cfg = getWagmiConfig();
    const q = quote.data;
    try {
      // 1. Make sure the wallet is on the source chain before signing anything.
      if (chainId !== source.chainId) {
        setStep('switching');
        await switchChain(cfg, { chainId: source.chainId });
      }

      // 2. Scope the USDC approval to exactly this amount, targeting LI.FI's
      //    diamond (estimate.approvalAddress) — never an unbounded approval.
      const allowance = (await readContract(cfg, {
        address: source.usdc,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, q.approvalAddress],
        chainId: source.chainId,
      })) as bigint;

      if (allowance < amountBig) {
        setStep('approving');
        const approveHash = await writeContractAsync({
          address: source.usdc,
          abi: erc20Abi,
          functionName: 'approve',
          args: [q.approvalAddress, amountBig],
          chainId: source.chainId,
        });
        await waitForTransactionReceipt(cfg, { hash: approveHash, chainId: source.chainId });
      }

      // 3. Send the route transaction (LI.FI-built, wallet-signed) on the source
      //    chain. This burns/locks USDC on the source side.
      setStep('bridging');
      const hash = await sendTransaction(cfg, {
        to: q.to,
        data: q.data,
        value: q.value,
        chainId: source.chainId,
      });
      await waitForTransactionReceipt(cfg, { hash, chainId: source.chainId });

      // 4. Cross-chain settlement is not instant — poll LI.FI until the USDC
      //    lands on the destination chain.
      setStep('settling');
      const deadline = Date.now() + MAX_SETTLE_MS;
      while (Date.now() < deadline) {
        const s = await fetchBridgeStatus({
          txHash: hash,
          fromChainId: source.chainId,
          toChainId: destChainId,
          tool: q.tool || undefined,
        });
        if (s.status === 'DONE') {
          setStep('done');
          await refetch();
          return;
        }
        if (s.status === 'FAILED') {
          setStep('error');
          setErrorMsg('The bridge reported a failed transfer. Check your wallet activity.');
          return;
        }
        setStatusNote('Moving your USDC across chains — this can take a couple of minutes…');
        await sleep(POLL_INTERVAL_MS);
      }
      // Timed out waiting, but the source tx succeeded — funds are en route.
      setStep('done');
      setStatusNote(
        'Your USDC is on the way. It can take a few minutes to arrive — balances will update once it lands.',
      );
      await refetch();
    } catch (e) {
      setStep('error');
      setErrorMsg(e instanceof Error ? e.message : 'Bridge failed');
    }
  }

  const receiveDisplay =
    quote.data ? formatUnits(quote.data.toAmountMin, USDC_DECIMALS) : '';
  const durationMin = quote.data?.durationSec
    ? Math.max(1, Math.round(quote.data.durationSec / 60))
    : null;

  return (
    <div className="w-full max-w-md mx-auto bg-paper border border-border rounded-lg p-6">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="text-lg font-medium">Move USDC</h1>
        {address && (
          <span className="text-xs text-ink/50">
            {formatUnits(total, USDC_DECIMALS)} USDC total
          </span>
        )}
      </div>
      <p className="text-xs text-ink/50 mb-4">
        Pick where you want your USDC and how much — Openhand routes it across chains for you
        automatically. Every transaction is signed by you; Openhand never holds your funds.
      </p>

      {!mainnetMode ? (
        <div className="text-sm text-ink/70 border border-border rounded px-3 py-4">
          Cross-chain routing runs on Ethereum, Base, and Arbitrum. The app is in testnet mode —
          there is no testnet bridge liquidity, so moving USDC needs mainnet mode.
        </div>
      ) : !address ? (
        <div className="text-sm text-ink/70 border border-border rounded px-3 py-4">
          Connect a wallet to see your USDC across chains and move it where you need it.
        </div>
      ) : (
        <>
          {/* Per-chain balances — the "single USDC balance" view. */}
          <div className="mb-4 space-y-1">
            {balances.map((b) => (
              <div key={b.chainId} className="flex justify-between text-xs">
                <span className="text-ink/60">{b.label}</span>
                <span
                  className={`font-mono ${b.balance > 0n ? 'text-ink/90' : 'text-ink/40'}`}
                >
                  {isLoading ? '…' : formatUnits(b.balance, USDC_DECIMALS)} USDC
                </span>
              </div>
            ))}
          </div>

          {/* Destination */}
          <div className="flex justify-between text-xs text-ink/50 mb-1">
            <span>Send my USDC to</span>
          </div>
          <select
            value={destChainId}
            onChange={(e) => {
              setDestChainId(Number(e.target.value));
              setStep('idle');
              setErrorMsg(null);
            }}
            className="w-full bg-paper border border-border rounded px-3 py-2 text-sm outline-none focus:border-accent mb-3"
            aria-label="Destination chain"
          >
            {BRIDGE_CHAINS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Amount */}
          <div className="flex justify-between text-xs text-ink/50 mb-1">
            <span>Amount</span>
            {source && (
              <span>
                Available on {source.label}: {formatUnits(sourceBalance, USDC_DECIMALS)} USDC
              </span>
            )}
          </div>
          <div className="flex gap-2 mb-3">
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
              disabled={!source}
              className="px-3 py-2 rounded border border-border text-xs text-ink/70 hover:text-ink disabled:opacity-40"
            >
              Max
            </button>
          </div>

          {/* Route summary — source revealed (their money), bridge tool hidden. */}
          {quote.data && source && destChain && (
            <div className="text-xs text-ink/50 border border-border rounded px-3 py-2 mb-3 space-y-1">
              <div className="flex justify-between">
                <span>Route</span>
                <span>
                  {source.label} → {destChain.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span>You receive (min)</span>
                <span>{receiveDisplay} USDC</span>
              </div>
              {durationMin && (
                <div className="flex justify-between">
                  <span>Estimated time</span>
                  <span>~{durationMin} min</span>
                </div>
              )}
            </div>
          )}

          {!configured && (
            <div className="text-xs text-warn bg-warn/10 border border-warn/30 rounded px-3 py-2 mb-3">
              Cross-chain routing isn&apos;t configured yet — a LI.FI integrator key
              (NEXT_PUBLIC_LIFI_INTEGRATOR) is required to fetch routes.
            </div>
          )}
          {configured && source && amountBig > 0n && insufficient && (
            <div className="text-xs text-danger mb-3">
              Not enough USDC on {source.label} to move this amount.
            </div>
          )}
          {configured && amountBig > 0n && !source && (
            <div className="text-xs text-warn mb-3">
              Your USDC is already on {destChain?.label}. Pick a different destination to move it.
            </div>
          )}
          {configured &&
            source &&
            !insufficient &&
            !quote.isFetching &&
            !quote.data &&
            amountBig > 0n && (
              <div className="text-xs text-danger mb-3">No route found for this amount right now.</div>
            )}
          {statusNote && <div className="text-xs text-ink/60 mb-3">{statusNote}</div>}
          {errorMsg && <div className="text-xs text-danger mb-3 break-words">{errorMsg}</div>}
          {step === 'done' && !statusNote && (
            <div className="text-xs text-accent mb-3">USDC moved to {destChain?.label}.</div>
          )}

          <button
            onClick={handleBridge}
            disabled={
              busy ||
              switching ||
              !configured ||
              !quote.data ||
              amountBig === 0n ||
              insufficient ||
              !source
            }
            className="w-full py-2 rounded-md bg-accent text-paper font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {step === 'switching'
              ? 'Switching network…'
              : step === 'approving'
                ? 'Approving…'
                : step === 'bridging'
                  ? 'Moving…'
                  : step === 'settling'
                    ? 'Arriving…'
                    : source && destChain
                      ? `Move USDC to ${destChain.label}`
                      : 'Move USDC'}
          </button>
        </>
      )}
    </div>
  );
}
