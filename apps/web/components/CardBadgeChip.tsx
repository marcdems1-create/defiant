'use client';

import type { CardBadge } from '@/lib/protocols/cardBadges';

export function CardBadgeChip({
  badge,
  accent = false,
}: {
  badge: CardBadge;
  accent?: boolean;
}) {
  return (
    <span
      className={`relative inline-flex items-center gap-1 rounded-full border px-2.5 py-1 group/badge hover:z-40 focus-visible:z-40 ${
        accent ? 'border-accent/30 bg-accent/10' : 'border-border bg-paper/60'
      }`}
      tabIndex={0}
      aria-label={`${badge.label}. ${badge.hint}`}
    >
      {badge.emoji && (
        <span aria-hidden className="leading-none">
          {badge.emoji}
        </span>
      )}
      <span className={`text-xs ${accent ? 'text-accent' : 'text-ink/80'}`}>{badge.label}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 bottom-[calc(100%+8px)] z-30 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-paper px-2.5 py-2 text-left text-[11px] leading-relaxed text-ink/75 shadow-lg group-hover/badge:block group-focus-visible/badge:block"
      >
        {badge.hint}
      </span>
    </span>
  );
}
