'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { fetchMaplePositionStatus } from '@/lib/protocols/maple';

/** Maple queue is push-based — no claim tx. Status only. */
export function MapleWithdrawalStatus({ pool }: { pool: `0x${string}` }) {
  const { address } = useAccount();
  const [requested, setRequested] = useState<boolean | null>(null);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetchMaplePositionStatus(address, pool).then((status) => {
      if (cancelled || !status) return;
      setRequested(status.redeemRequested);
    });
    return () => {
      cancelled = true;
    };
  }, [address, pool]);

  if (!requested) return null;

  return (
    <div className="mt-4 border-t border-border pt-4 text-xs text-ink/60 leading-relaxed">
      A Maple withdrawal is in the FIFO queue. USDC is sent to this wallet when the pool
      has liquidity — typically hours to a couple of days, and Maple documents waits of up
      to 30 days. No extra claim transaction.
    </div>
  );
}
