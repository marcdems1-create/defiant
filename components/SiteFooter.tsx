import Link from 'next/link';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  SITE_NAME,
} from '@/lib/config/site';

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border mt-10 mb-2 md:mt-16 md:mb-0">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10 flex flex-col gap-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          <div className="flex flex-col gap-2">
            <p className="font-mono text-ink tracking-tight">
              {SITE_NAME.toLowerCase()}
              <span className="text-accent">.</span>
            </p>
            <p className="text-ink/50 leading-relaxed text-[13px]">
              A non-custodial interface for on-chain USDC yield. You connect a wallet and
              sign every transaction. {SITE_NAME} never holds your funds.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40 font-mono">
              Company
            </p>
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-ink/60 hover:text-ink transition-colors w-fit"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink/40 font-mono">
              Operator
            </p>
            <p className="text-ink/60 leading-relaxed">
              {LEGAL_ENTITY}
              <br />
              {LEGAL_JURISDICTION}
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-accent hover:underline w-fit font-mono text-[13px]"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-ink/40">
          © {year} {LEGAL_ENTITY}. {SITE_NAME} is a non-custodial software interface, not a
          bank, broker, or custodian. Yield is not a deposit, is not insured, and is not
          guaranteed. Capital is at risk, including from smart-contract failure. Not an offer
          of securities or investment advice. USDC purchases are processed by Transak, a
          third party.
        </p>
      </div>
    </footer>
  );
}
