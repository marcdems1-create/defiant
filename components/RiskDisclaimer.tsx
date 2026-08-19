export function RiskDisclaimer({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <aside
      className={`rounded-xl border border-border bg-white/[0.02] px-4 py-3.5 ${className}`}
      role="note"
      aria-label="Risk disclosure"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40 font-mono mb-1.5">
        Risk disclosure
      </p>
      <p className="text-sm text-ink/65 leading-relaxed">
        {compact
          ? 'On-chain yield is not a bank deposit and is not insured. You can lose money. Openhand never holds your funds.'
          : 'On-chain yield is not a bank deposit and is not insured. Returns are variable and not guaranteed. You can lose capital to market, liquidity, or smart-contract failure. Openhand is non-custodial — we never hold your funds.'}
      </p>
      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.12em] text-ink/40 font-mono">
        <span>Not insured</span>
        <span className="text-ink/20" aria-hidden>
          ·
        </span>
        <span>Not guaranteed</span>
        <span className="text-ink/20" aria-hidden>
          ·
        </span>
        <span>Non-custodial</span>
      </p>
    </aside>
  );
}
