'use client';

import type { ReferralTier } from '@/lib/referrals';

export function RewardUnlockedModal({
  tier,
  onClose,
}: {
  tier: ReferralTier;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-paper border border-border rounded-lg p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle, ${tier.color}55, transparent 70%)` }}
        >
          <svg width="64" height="70" viewBox="0 0 56 62" aria-hidden>
            <polygon
              points="28,1 54,16 54,46 28,61 2,46 2,16"
              fill={tier.color}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1.5"
            />
            <text x="28" y="37" textAnchor="middle" fontSize="22" fontWeight="700" fill="rgba(0,0,0,0.7)">
              {tier.name.charAt(0)}
            </text>
          </svg>
        </div>
        <div className="text-xs uppercase tracking-widest text-accent mb-1">Rank unlocked</div>
        <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
        <p className="text-sm text-ink/60 mb-5">{tier.blurb}</p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-md bg-accent text-paper text-sm font-medium"
        >
          Keep inviting
        </button>
      </div>
    </div>
  );
}
