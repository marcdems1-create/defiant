'use client';

import { REFERRAL_TIERS, tierForCount } from '@/lib/referrals';

/**
 * The core "quest" loop: a horizontal track with a checkpoint per tier. The
 * fill shows overall progress toward the top rank; each node lights up as its
 * threshold is met. Reward chip at the end is the (currently locked) fee-free
 * perk — see ReferralPanel for the "activates when fees launch" copy.
 */
export function QuestProgress({ count }: { count: number }) {
  const { current, next, toNext } = tierForCount(count);
  const maxMin = REFERRAL_TIERS[REFERRAL_TIERS.length - 1].min;
  const overall = Math.min(count / maxMin, 1);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <span className="text-sm font-medium">
          {count} {count === 1 ? 'friend' : 'friends'} joined
        </span>
        <span className="text-xs text-ink/50">
          {next ? `${toNext} more → ${next.name}` : `Max rank: ${current.name}`}
        </span>
      </div>

      <div className="relative">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-border" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded-full bg-accent transition-all"
          style={{ width: `${overall * 100}%` }}
        />
        <div className="relative flex justify-between">
          {REFERRAL_TIERS.map((tier) => {
            const reached = count >= tier.min;
            return (
              <div key={tier.key} className="flex flex-col items-center gap-1">
                <div
                  className={`w-4 h-4 rounded-full border-2 ${
                    reached ? 'bg-accent border-accent' : 'bg-paper border-border'
                  }`}
                />
                <span className="text-[10px] text-ink/40 font-mono">{tier.min}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
