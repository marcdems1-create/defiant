import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  LEGAL_ADDRESS_DISPLAY,
  LEGAL_ENTITY,
  LEGAL_ENTITY_IS_TRADE_NAME,
  LEGAL_JURISDICTION_DISPLAY,
  SITE_NAME,
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
        {!LEGAL_ENTITY_IS_TRADE_NAME ? (
          <>
            <br />
            <span className="text-ink/50">doing business as {SITE_NAME}</span>
          </>
        ) : null}
        <br />
        {LEGAL_ADDRESS_DISPLAY ? (
          <>
            {LEGAL_ADDRESS_DISPLAY}
            <br />
          </>
        ) : null}
        {LEGAL_JURISDICTION_DISPLAY}
      </p>
      <p className="text-sm mt-2">
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
          {CONTACT_EMAIL}
        </a>
        {CONTACT_PHONE ? (
          <>
            <br />
            <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, '')}`} className="text-ink/70 font-mono">
              {CONTACT_PHONE_DISPLAY}
            </a>
          </>
        ) : null}
      </p>
    </aside>
  );
}
