'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { useAccount, useChainId, useSwitchChain, useWriteContract } from 'wagmi';
import { waitForTransactionReceipt } from 'wagmi/actions';
import { erc20Abi } from '@/lib/abi/erc20';
import { cctpMessageTransmitterAbi, cctpTokenMessengerAbi } from '@/lib/abi/cctp';
import {
  CCTP_MAX_BURN,
  CCTP_STANDARD_FINALITY,
  CCTP_ZERO_BYTES32,
  cctpChainList,
  cctpConfig,
} from '@/lib/config/cctp';
import { addressToBytes32, fetchCctpAttestation } from '@/lib/cctp/attestation';
import { useErc20Allowance, useErc20Balance } from '@/lib/hooks/useErc20Balance';
import { getWagmiConfig, type SupportedChainId } from '@/lib/wagmi';
import { estimateCappedGas, formatTxError } from '@/lib/tx/gas';
import { ConnectButtonClient } from './ConnectButtonClient';

type Step = 'idle' | 'approving' | 'burning' | 'waiting' | 'switching' | 'minting' | 'done' | 'error';

const STORAGE_KEY = 'openhand.cctp.pending.v1';

interface PendingMove {
  sourceChainId: number;
  destChainId: number;
  txHash: `0x${string}`;
  amountLabel: string;
}

function readPending(): PendingMove[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingMove[];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p?.txHash === 'string') : [];
  } catch {
    return [];
  }
}

function writePending(rows: PendingMove[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(0, 8)));
}

/**
 * User-signed Circle CCTP V2: approve exact USDC → burn on source → wait for
 * Circle's public attestation → mint on destination. Openhand never holds the
 * tokens. No Circle signup. Pending burns are stored only in this browser.
 */
export function CctpMove() {
  const { address } = useAccount();
  const currentChainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const chains = cctpChainList();

  const [sourceId, setSourceId] = useState(chains[0]?.chainId ?? 0);
  const [destId, setDestId] = useState(chains[1]?.chainId ?? 0);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingMove[]>([]);
  const [active, setActive] = useState<PendingMove | null>(null);

  useEffect(() => {
    setPending(readPending());
  }, []);

  useEffect(() => {
    if (destId === sourceId) {
      const next = cctpChainList().find((c) => c.chainId !== sourceId);
      if (next) setDestId(next.chainId);
    }
  }, [sourceId, destId]);

  const source = cctpConfig(sourceId);
  const dest = cctpConfig(destId);
  const usdc = source?.usdc;
  const sourceChain = sourceId as SupportedChainId;

  const walletBalance = useErc20Balance(usdc, address, sourceChain);
  const balance = (walletBalance.data as bigint | undefined) ?? 0n;
  const allowance = useErc20Allowance(usdc, address, source?.tokenMessenger, sourceChain);
  const allowanceValue = (allowance.data as bigint | undefined) ?? 0n;

  const amountBig = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseUnits(amount, 6);
    } catch {
      return 0n;
    }
  }, [amount]);

  const writeTx = useCallback(
    async (params: {
      address: `0x${string}`;
      abi: readonly { type?: string }[];
      functionName: string;
      args?: readonly unknown[];
      chainId: number;
    }) => {
      if (!address) throw new Error('Connect a wallet first');
      const gas = await estimateCappedGas({ ...params, account: address });
      return writeContractAsync({ ...params, gas } as never);
    },
    [address, writeContractAsync],
  );

  const persist = useCallback((rows: PendingMove[]) => {
    writePending(rows);
    setPending(rows);
  }, []);

  const mintPending = useCallback(
    async (row: PendingMove) => {
      const src = cctpConfig(row.sourceChainId);
      const dst = cctpConfig(row.destChainId);
      if (!src || !dst || !address) return;
      setErrorMsg(null);
      setActive(row);
      try {
        setStep('waiting');
        let attestation = await fetchCctpAttestation(src.domain, row.txHash);
        const started = Date.now();
        while (!attestation && Date.now() - started < 20 * 60 * 1000) {
          await new Promise((r) => setTimeout(r, 8_000));
          attestation = await fetchCctpAttestation(src.domain, row.txHash);
        }
        if (!attestation) {
          setStep('waiting');
          setErrorMsg(
            'Circle has not attested this burn yet. Standard transfer waits for finality (often 15–19 minutes from Ethereum or L2s). Keep this page open, or come back and mint from the list below.',
          );
          return;
        }
        if (currentChainId !== dst.chainId) {
          setStep('switching');
          await switchChainAsync({ chainId: dst.chainId });
        }
        setStep('minting');
        const mintHash = await writeTx({
          address: dst.messageTransmitter,
          abi: cctpMessageTransmitterAbi,
          functionName: 'receiveMessage',
          args: [attestation.message, attestation.attestation],
          chainId: dst.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash: mintHash, chainId: dst.chainId });
        persist(readPending().filter((p) => p.txHash !== row.txHash));
        setActive(null);
        setStep('done');
      } catch (e) {
        setStep('error');
        setErrorMsg(formatTxError(e));
      }
    },
    [address, currentChainId, persist, switchChainAsync, writeTx],
  );

  const burn = useCallback(async () => {
    if (!address || !source || !dest || !usdc || amountBig === 0n) return;
    if (source.chainId === dest.chainId) {
      setErrorMsg('Pick two different networks.');
      return;
    }
    if (amountBig > CCTP_MAX_BURN) {
      setErrorMsg('Circle caps one CCTP burn at $10 million USDC.');
      return;
    }
    setErrorMsg(null);
    try {
      if (currentChainId !== source.chainId) {
        setStep('switching');
        await switchChainAsync({ chainId: source.chainId });
      }
      if (allowanceValue < amountBig) {
        setStep('approving');
        const hash = await writeTx({
          address: usdc,
          abi: erc20Abi,
          functionName: 'approve',
          args: [source.tokenMessenger, amountBig],
          chainId: source.chainId,
        });
        await waitForTransactionReceipt(getWagmiConfig(), { hash, chainId: source.chainId });
        await allowance.refetch();
      }
      setStep('burning');
      const burnHash = await writeTx({
        address: source.tokenMessenger,
        abi: cctpTokenMessengerAbi,
        functionName: 'depositForBurn',
        args: [
          amountBig,
          dest.domain,
          addressToBytes32(address),
          usdc,
          CCTP_ZERO_BYTES32,
          0n,
          CCTP_STANDARD_FINALITY,
        ],
        chainId: source.chainId,
      });
      await waitForTransactionReceipt(getWagmiConfig(), { hash: burnHash, chainId: source.chainId });
      const row: PendingMove = {
        sourceChainId: source.chainId,
        destChainId: dest.chainId,
        txHash: burnHash,
        amountLabel: amount,
      };
      persist([row, ...readPending().filter((p) => p.txHash !== burnHash)]);
      setActive(row);
      setStep('waiting');
      await mintPending(row);
    } catch (e) {
      setStep('error');
      setErrorMsg(formatTxError(e));
    }
  }, [
    address,
    amount,
    amountBig,
    allowance,
    allowanceValue,
    currentChainId,
    dest,
    mintPending,
    persist,
    source,
    switchChainAsync,
    usdc,
    writeTx,
  ]);

  const busy =
    step === 'approving' ||
    step === 'burning' ||
    step === 'waiting' ||
    step === 'switching' ||
    step === 'minting' ||
    switching;
  const destOk = destId !== sourceId;
  const overCap = amountBig > CCTP_MAX_BURN;

  return (
    <div className="max-w-md mx-auto flex flex-col gap-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">Move</p>
        <h1 className="text-3xl font-medium tracking-tight">Move USDC</h1>
        <p className="text-ink/55 text-sm mt-2 leading-relaxed">
          Native USDC via Circle CCTP — burn on one network, mint the same USDC on another.
          Openhand never holds the tokens. You sign both transactions. This is not a yield
          strategy and not a lockbox bridge. No Circle account.
        </p>
      </header>

      {!address ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink/65">Connect a wallet to move USDC you already hold.</p>
          <ConnectButtonClient label="Connect" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-ink/50">
              From
              <select
                value={sourceId}
                onChange={(e) => setSourceId(Number(e.target.value))}
                className="bg-transparent border border-border rounded px-2 py-2 text-sm text-ink"
              >
                {chains.map((c) => (
                  <option key={c.chainId} value={c.chainId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-ink/50">
              To
              <select
                value={destId}
                onChange={(e) => setDestId(Number(e.target.value))}
                className="bg-transparent border border-border rounded px-2 py-2 text-sm text-ink"
              >
                {chains.map((c) => (
                  <option key={c.chainId} value={c.chainId} disabled={c.chainId === sourceId}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>Amount (USD)</span>
              <span>Wallet: ${formatUnits(balance, 6)} USDC</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center border border-border rounded px-3">
                <span className="text-ink/45 font-mono text-sm mr-1">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50"
                  className="flex-1 bg-transparent py-2 text-sm font-mono outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setAmount(formatUnits(balance, 6))}
                className="px-3 py-2 rounded border border-border text-xs text-ink/70"
              >
                Max
              </button>
            </div>
          </div>

          {!destOk && <p className="text-xs text-danger">Pick a different destination network.</p>}
          {overCap && <p className="text-xs text-danger">Circle caps one burn at $10 million USDC.</p>}
          {errorMsg && <p className="text-xs text-danger break-words">{errorMsg}</p>}
          {step === 'done' && (
            <p className="text-xs text-accent">USDC is on the destination network, in this wallet.</p>
          )}

          <button
            type="button"
            disabled={busy || amountBig === 0n || amountBig > balance || !destOk || overCap}
            onClick={() => void burn()}
            className="w-full py-2.5 rounded-xl bg-accent text-paper font-medium text-sm disabled:opacity-30"
          >
            {step === 'switching'
              ? 'Switching network…'
              : step === 'approving'
                ? `Approve $${amount} USDC`
                : step === 'burning'
                  ? 'Burning on source…'
                  : step === 'waiting'
                    ? 'Waiting for Circle attestation…'
                    : step === 'minting'
                      ? 'Minting on destination…'
                      : `Move $${amount || '0'} USDC`}
          </button>

          <p className="text-[11px] text-ink/40 leading-relaxed">
            Standard transfer (finalized). Circle attests the burn; then you switch networks and
            mint. One CCTP burn is capped at $10 million. Native Circle USDC only — bridged USDC.e
            and some testnet faucet tokens cannot be burned. No Openhand fee on this move.
          </p>

          {pending.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="text-sm text-ink/70 mb-2">Unminted burns in this browser</div>
              <div className="flex flex-col gap-2">
                {pending.map((row) => {
                  const src = cctpConfig(row.sourceChainId);
                  const dst = cctpConfig(row.destChainId);
                  return (
                    <div
                      key={row.txHash}
                      className="flex items-center justify-between gap-2 text-sm border border-border rounded px-3 py-2"
                    >
                      <span className="text-xs text-ink/60">
                        ${row.amountLabel} {src?.label} → {dst?.label}
                      </span>
                      <button
                        type="button"
                        disabled={busy && active?.txHash === row.txHash}
                        onClick={() => void mintPending(row)}
                        className="text-xs text-accent hover:underline disabled:opacity-40"
                      >
                        {step === 'waiting' && active?.txHash === row.txHash ? 'Waiting…' : 'Mint'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
