import type { Config } from 'wagmi';
import { getCapabilities, sendCalls, waitForCallsStatus } from 'wagmi/actions';

/**
 * EIP-5792 batching. Smart-account wallets (including the Reown AppKit
 * email/social/passkey embedded wallets) can execute several calls in ONE
 * user confirmation instead of a popup per step — turning e.g. the zap's
 * approve→swap→approve→deposit into a single prompt. This is NOT auto-signing:
 * the user still authorizes the whole bundle once, so it stays fully
 * non-custodial (see CLAUDE.md #1). Plain EOAs that don't support 5792 fall
 * back to the existing sequential flow, so there's no regression.
 */

export type BatchCall = { to: `0x${string}`; data: `0x${string}`; value?: bigint };

/**
 * Whether the connected wallet can execute an ATOMIC batch on this chain.
 * Handles both the current capabilities shape (`atomic.status`) and the older
 * (`atomicBatch.supported`). Defensive: any error / unknown wallet => false
 * (caller uses the sequential fallback).
 */
export async function supportsAtomicBatch(config: Config, chainId: number): Promise<boolean> {
  try {
    const caps = (await getCapabilities(config, { chainId })) as Record<string, unknown>;
    const atomicStatus = (caps?.atomic as { status?: string } | undefined)?.status;
    if (atomicStatus === 'supported' || atomicStatus === 'ready') return true;
    if ((caps?.atomicBatch as { supported?: boolean } | undefined)?.supported) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Send a batch of calls in one confirmation and wait for it to land. Returns a
 * representative transaction hash from the batch receipts (used for referral
 * fee-qualification, which scans the tx logs), or null if unavailable.
 */
export async function sendCallsAndWait(
  config: Config,
  chainId: number,
  calls: BatchCall[],
): Promise<`0x${string}` | null> {
  const result = await sendCalls(config, {
    chainId,
    calls: calls.map((c) => ({ to: c.to, data: c.data, value: c.value ?? 0n })),
  });
  const id = typeof result === 'string' ? result : (result as { id: string }).id;
  const status = await waitForCallsStatus(config, { id });
  const receipts = (status as { receipts?: { transactionHash?: `0x${string}` }[] }).receipts;
  return receipts?.[receipts.length - 1]?.transactionHash ?? null;
}
