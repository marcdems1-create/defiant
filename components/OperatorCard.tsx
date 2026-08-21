import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  LEGAL_ADDRESS,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
} from '@/lib/config/site';

/** Public operator block for KYB reviewers. Address only when env matches the filing. */
export function OperatorCard({ className = '' }: { className?: string }) {
  return (
    <aside
      className={`rounded-xl border border-border bg-white/[0.02] px-4 py-3.5 ${className}`}
      aria-label="Operator"
    >
      <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40 font-mono mb-1.5">
        Operator
      </p>
      <p className="text-sm text-ink/80 leading-relaxed">
        {LEGAL_ENTITY}
        <br />
        {LEGAL_ADDRESS ? (
          <>
            {LEGAL_ADDRESS}
            <br />
          </>
        ) : null}
        {LEGAL_JURISDICTION}
      </p>
      <p className="text-sm mt-2">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
          {CONTACT_EMAIL}
        </a>
        {CONTACT_PHONE ? (
          <>
            <br />
            <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`} className="text-ink/70 font-mono">
              {CONTACT_PHONE}
            </a>
          </>
        ) : null}
      </p>
    </aside>
  );
}
