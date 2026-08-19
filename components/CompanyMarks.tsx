import { LEGAL_ENTITY, LEGAL_JURISDICTION, SITE_NAME } from '@/lib/config/site';

const MARKS = [
  { label: 'Non-custodial', detail: `${SITE_NAME} never holds your funds` },
  { label: 'You sign', detail: 'Every deposit and withdrawal' },
  { label: 'Operator', detail: `${LEGAL_ENTITY} · ${LEGAL_JURISDICTION}` },
  { label: 'USDC onramp', detail: 'Transak, a third party' },
] as const;

export function CompanyMarks({ className = '' }: { className?: string }) {
  return (
    <ul
      className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}
      aria-label="How Openhand is structured"
    >
      {MARKS.map((mark) => (
        <li
          key={mark.label}
          className="rounded-xl border border-border bg-white/[0.02] px-3 py-2.5"
        >
          <div className="text-[11px] uppercase tracking-[0.12em] text-ink/40 font-mono">
            {mark.label}
          </div>
          <div className="text-sm text-ink/75 mt-1 leading-snug">{mark.detail}</div>
        </li>
      ))}
    </ul>
  );
}
