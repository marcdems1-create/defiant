'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButtonClient } from '@/components/ConnectButtonClient';
import {
  buildReferralLink,
  getSeenTierIndex,
  getStoredRefCode,
  setSeenTierIndex,
  tierForCount,
  type ReferralStats,
  type ReferralTier,
} from '@/lib/referrals';
import { TierBadges } from './TierBadges';
import { QuestProgress } from './QuestProgress';
import { RewardUnlockedModal } from './RewardUnlockedModal';
import { AcceptInviteBanner } from './AcceptInviteBanner';

export function ReferralPanel() {
  const { address } = useAccount();
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [statsOffline, setStatsOffline] = useState(false);
  const [storedCode, setStoredCode] = useState<`0x${string}` | null>(null);
  const [copied, setCopied] = useState(false);
  const [unlockedTier, setUnlockedTier] = useState<ReferralTier | null>(null);

  useEffect(() => {
    setStoredCode(getStoredRefCode());
  }, []);

  const loadStats = useCallback(async () => {
    if (!address) return;
    try {
      const res = await fetch(`/api/referrals?address=${address}`);
      if (!res.ok) {
        setStatsOffline(true);
        setStats(null);
        return;
      }
      const data = (await res.json()) as ReferralStats;
      setStatsOffline(false);
      setStats(data);

      // Fire the unlock modal once when the user crosses into a new rank.
      const { currentIndex, current } = tierForCount(data.referrals);
      if (currentIndex > getSeenTierIndex()) {
        setUnlockedTier(current);
        setSeenTierIndex(currentIndex);
      }
    } catch {
      setStatsOffline(true);
      setStats(null);
    }
  }, [address]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const count = stats?.referrals ?? 0;
  const link = address ? buildReferralLink(address) : '';

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked — user can still select the text manually
    }
  }

  const showAccept =
    Boolean(address && storedCode) &&
    storedCode?.toLowerCase() !== address?.toLowerCase() &&
    !stats?.referredBy;

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-1">Refer &amp; rank up</h1>
      <p className="text-sm text-ink/50 mb-6">
        Invite friends to Openhand. Every friend who joins with your link climbs your rank.
      </p>

      {!address ? (
        <div className="border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-ink/60 mb-4">
            Connect your wallet to get your referral link and track your rank.
          </p>
          <div className="flex justify-center">
            <ConnectButtonClient showBalance={false} chainStatus="none" />
          </div>
        </div>
      ) : (
        <>
          {showAccept && storedCode && (
            <AcceptInviteBanner
              refereeAddress={address}
              referrerCode={storedCode}
              onBound={() => {
                setStoredCode(null);
                loadStats();
              }}
            />
          )}

          {/* Quest + badges */}
          <div className="border border-border rounded-lg p-6 mb-5">
            <QuestProgress count={count} />
            <div className="mt-6 pt-5 border-t border-border">
              <TierBadges count={count} />
            </div>
          </div>

          {/* Reward perk (fees held off for now) */}
          <div className="border border-border rounded-lg p-4 mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Perk: fee-free deposits</div>
              <div className="text-xs text-ink/50">
                Referred crew skip Openhand&apos;s deposit fee. Activates when fees launch —
                your rank is banking progress in the meantime.
              </div>
            </div>
            <span className="shrink-0 text-[11px] px-2 py-1 rounded-full border border-border text-ink/50">
              soon
            </span>
          </div>

          {/* Shareable link */}
          <div className="border border-border rounded-lg p-4">
            <div className="text-xs text-ink/50 mb-2">Your referral link</div>
            <div className="flex gap-2">
              <input
                readOnly
                value={link}
                className="flex-1 bg-transparent border border-border rounded px-3 py-2 text-xs font-mono outline-none"
                onFocus={(e) => e.currentTarget.select()}
              />
              <button
                onClick={copyLink}
                className="px-3 py-2 rounded-md bg-accent text-paper text-sm font-medium shrink-0"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {statsOffline && (
              <div className="text-xs text-ink/40 mt-2">
                Rank tracking is offline right now, but your link still works.
              </div>
            )}
            {stats?.referredBy && (
              <div className="text-xs text-ink/40 mt-2">
                You joined via a referral — thanks for repping the crew.
              </div>
            )}
          </div>
        </>
      )}

      {unlockedTier && (
        <RewardUnlockedModal tier={unlockedTier} onClose={() => setUnlockedTier(null)} />
      )}
    </div>
  );
}
