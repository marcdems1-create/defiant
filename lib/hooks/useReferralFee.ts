'use client';

import { useQuery } from '@tanstack/react-query';
import { tierForCount, type ReferralStats } from '@/lib/referrals';

export interface ReferralFeeContext {
  /** Connected wallet came in via a referral link (signature-bound referee). */
  isReferee: boolean;
  /** Referrer rank index (0=Starter…3=Luminary) from QUALIFIED referrals. */
  referrerRankIndex: number;
  loaded: boolean;
}

/**
 * Reads the connected wallet's referral status so the deposit/withdraw fee can
 * be discounted (see lib/config/fees.ts feeBpsFor). Falls back to "no discount"
 * whenever the referrals backend is unavailable — a discount only ever reduces
 * what we charge, so the safe default is simply the standard fee.
 */
export function useReferralFee(address?: `0x${string}`): ReferralFeeContext {
  const { data } = useQuery({
    queryKey: ['referralFee', address],
    queryFn: async (): Promise<ReferralStats | null> => {
      const res = await fetch(`/api/referrals?address=${address}`);
      if (!res.ok) return null;
      return (await res.json()) as ReferralStats;
    },
    enabled: Boolean(address),
    staleTime: 60_000,
  });

  return {
    isReferee: Boolean(data?.referredBy),
    referrerRankIndex: data ? tierForCount(data.qualifiedReferrals ?? 0).currentIndex : 0,
    loaded: Boolean(data),
  };
}

/**
 * Fire-and-forget: after a referee pays a fee, ask the server to verify the fee
 * transfer on-chain and mark them qualified. Never blocks the UX and swallows
 * errors — qualification is best-effort and self-healing on the next fee.
 */
export function reportReferralFeePaid(
  refereeAddress: `0x${string}`,
  chainId: number,
  txHash: `0x${string}`,
) {
  void fetch('/api/referrals/qualify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refereeAddress, chainId, txHash }),
  }).catch(() => {});
}
