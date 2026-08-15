export function RiskDisclaimer({ className = '' }: { className?: string }) {
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
        On-chain yield is not a bank deposit and is not insured. Returns are variable and not
        guaranteed. You can lose capital to market, liquidity, or smart-contract failure. Openhand
        is non-custodial — we never hold your funds.
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

export function RiskFooter() {
  return (
    <footer className="border-t border-border mt-16 mb-4 md:mb-0">
      <div className="max-w-6xl mx-auto px-6 py-6 text-[11px] leading-relaxed text-ink/40">
        Openhand is a non-custodial interface. Yield is not a deposit, is not insured, and is not
        guaranteed. Capital is at risk, including from smart-contract failure. Not an offer of
        securities or investment advice.
      </div>
    </footer>
  );
}
