'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchBridgeStatus } from '@/lib/bridge/lifi';
import {
  dismissStoredUsdcMove,
  movesForAccount,
  patchStoredUsdcMove,
  type StoredUsdcMove,
} from '@/lib/bridge/pending';

const POLL_MS = 8_000;

/**
 * Polls LI.FI status for moves this wallet started in this browser so the
 * dashboard can show in-transit USDC instead of an empty portfolio.
 */
export function usePendingUsdcMoves(account: `0x${string}` | undefined) {
  const [rows, setRows] = useState<StoredUsdcMove[]>([]);

  const reload = useCallback(() => {
    setRows(movesForAccount(account));
  }, [account]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;

    async function tick() {
      const current = movesForAccount(account);
      const pending = current.filter((r) => r.status === 'PENDING');
      if (pending.length === 0) {
        if (!cancelled) setRows(current);
        return;
      }
      await Promise.all(
        pending.map(async (row) => {
          const s = await fetchBridgeStatus({
            txHash: row.txHash,
            fromChainId: row.fromChainId,
            toChainId: row.toChainId,
            tool: row.tool || undefined,
          });
          if (s.status === 'DONE') {
            patchStoredUsdcMove(row.txHash, { status: 'DONE', receivingTxHash: s.receivingTxHash });
          } else if (s.status === 'FAILED') {
            patchStoredUsdcMove(row.txHash, { status: 'FAILED' });
          }
        }),
      );
      if (!cancelled) setRows(movesForAccount(account));
    }

    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'openhand.lifi.pending.v1') reload();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('openhand:usdc-moves', reload);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('openhand:usdc-moves', reload);
    };
  }, [account, reload]);

  const dismiss = useCallback(
    (txHash: `0x${string}`) => {
      dismissStoredUsdcMove(txHash);
      reload();
    },
    [reload],
  );

  const inTransit = useMemo(
    () =>
      rows
        .filter((r) => r.status === 'PENDING')
        .reduce((acc, r) => {
          try {
            return acc + BigInt(r.toAmount || r.fromAmount);
          } catch {
            return acc;
          }
        }, 0n),
    [rows],
  );

  return { moves: rows, inTransit, reload, dismiss };
}
