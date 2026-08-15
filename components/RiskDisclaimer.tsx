export function RiskDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-ink/80 leading-snug ${className}`}
      role="note"
    >
      <span className="font-medium text-warn">Major risk. </span>
      You can lose your deposit. Not insured. Not guaranteed. Smart contracts can fail.
    </div>
  );
}
