'use client';

import { REFERRAL_TIERS, tierForCount } from '@/lib/referrals';

function HexBadge({
  color,
  label,
  unlocked,
  current,
}: {
  color: string;
  label: string;
  unlocked: boolean;
  current: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`relative transition-transform ${current ? 'scale-110' : ''}`}
        style={{ filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.35 }}
      >
        <svg width="56" height="62" viewBox="0 0 56 62" aria-hidden>
          <defs>
            <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.95" />
              <stop offset="100%" stopColor={color} stopOpacity="0.55" />
            </linearGradient>
          </defs>
          <polygon
            points="28,1 54,16 54,46 28,61 2,46 2,16"
            fill={`url(#grad-${label})`}
            stroke={current ? color : 'rgba(255,255,255,0.25)'}
            strokeWidth={current ? 2.5 : 1.5}
          />
          <text
            x="28"
            y="36"
            textAnchor="middle"
            fontSize="20"
            fontWeight="700"
            fill="rgba(0,0,0,0.7)"
          >
            {label.charAt(0)}
          </text>
        </svg>
        {current && (
          <span className="absolute -top-1 -right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-paper font-medium">
            you
          </span>
        )}
      </div>
      <span className={`text-[11px] font-mono ${current ? 'text-ink' : 'text-ink/50'}`}>
        {label}
      </span>
    </div>
  );
}

export function TierBadges({ count }: { count: number }) {
  const { current } = tierForCount(count);
  return (
    <div className="flex items-start justify-between gap-2">
      {REFERRAL_TIERS.map((tier) => (
        <HexBadge
          key={tier.key}
          color={tier.color}
          label={tier.name}
          unlocked={count >= tier.min}
          current={tier.key === current.key}
        />
      ))}
    </div>
  );
}
