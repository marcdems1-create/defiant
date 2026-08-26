import type { Metadata } from 'next';
import Link from 'next/link';
import { CompanyMarks } from '@/components/CompanyMarks';
import { HowItWorks } from '@/components/HowItWorks';
import { OperatorCard } from '@/components/OperatorCard';
import { LegalH2, LegalLink } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  CONTACT_PHONE,
  CONTACT_PHONE_DISPLAY,
  LEGAL_ADDRESS,
  LEGAL_ADDRESS_DISPLAY,
  LEGAL_ENTITY,
  LEGAL_ENTITY_IS_TRADE_NAME,
  IS_CBCA_NUMBERED_COMPANY,
  LEGAL_JURISDICTION_DISPLAY,
  LEGAL_UPDATED,
  SITE_NAME,
  SITE_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'About',
  description: `${SITE_NAME} is a non-custodial yield interface operated by ${LEGAL_ENTITY}${LEGAL_ENTITY.endsWith('.') ? '' : '.'} ${SITE_NAME} never holds funds.`,
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    legalName: LEGAL_ENTITY,
    url: SITE_URL,
    email: CONTACT_EMAIL,
    ...(CONTACT_PHONE ? { telephone: CONTACT_PHONE } : {}),
    ...(LEGAL_ADDRESS
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: LEGAL_ADDRESS_DISPLAY,
            addressCountry: LEGAL_JURISDICTION_DISPLAY,
          },
        }
      : {}),
    description:
      'Non-custodial software interface for on-chain yield. Users sign their own transactions.',
  };

  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-accent transition-colors w-fit"
      >
        <span aria-hidden>←</span> Back to collection
      </Link>

      <header className="flex flex-col gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">Company</p>
        <h1 className="text-3xl font-medium tracking-tight">About {SITE_NAME}</h1>
        <p className="text-ink/60 leading-relaxed">
          {SITE_NAME} ({SITE_URL}) is a non-custodial web interface. You connect a wallet,
          compare live on-chain yield, and sign every deposit and withdrawal yourself. We
          never hold, pool, or transmit your crypto.
        </p>
        <p className="text-xs text-ink/40">Last updated {LEGAL_UPDATED}</p>
      </header>

      <CompanyMarks />

      <OperatorCard />

      <div className="flex flex-col gap-5 text-sm text-ink/70 leading-relaxed">
        <LegalH2>Who operates this</LegalH2>
        <p>
          The site is operated by <span className="text-ink">{LEGAL_ENTITY}</span>
          {IS_CBCA_NUMBERED_COMPANY ? (
            <>, a federal corporation under the Canada Business Corporations Act</>
          ) : null}
          {!LEGAL_ENTITY_IS_TRADE_NAME ? (
            <>, doing business as {SITE_NAME}</>
          ) : null}
          {LEGAL_ADDRESS_DISPLAY ? (
            <>
              , {LEGAL_ADDRESS_DISPLAY},
            </>
          ) : null}{' '}
          ({LEGAL_JURISDICTION_DISPLAY}). Contact{' '}
          <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>
          {CONTACT_PHONE ? <> or {CONTACT_PHONE_DISPLAY}</> : null}.
        </p>

        <LegalH2>Nature of the business</LegalH2>
        <p>
          {SITE_NAME} is software: a browser interface that reads public on-chain data and
          helps you assemble transactions your wallet signs. We are not a bank, broker,
          dealer, exchange, money transmitter, or custodian. We do not operate a pooled
          vault and we do not take a cut inside protocol deposit or withdraw calls.
        </p>
        <p>
          {SITE_NAME} does not sell USDC and does not process CAD. Send USDC you already
          hold to the wallet you connect, then deposit. {SITE_NAME} never receives that
          USDC.
        </p>

        <LegalH2>What this is not</LegalH2>
        <p>
          Yield is not a deposit and is not insured. Returns change and are not guaranteed.
          Nothing here is investment, tax, or legal advice, and the catalog is not a
          recommendation — we do not score or feature a “best” opportunity. Dashboard tapes
          of tokenized stocks or spot crypto are wallet-signed LI.FI routes, not a
          brokerage.
        </p>
      </div>

      <HowItWorks />

      <p className="text-sm text-ink/50">
        <Link href="/partners" className="text-accent hover:underline">
          Partners
        </Link>
        <span className="text-ink/25 mx-2" aria-hidden>
          ·
        </span>
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy
        </Link>
        <span className="text-ink/25 mx-2" aria-hidden>
          ·
        </span>
        <Link href="/terms" className="text-accent hover:underline">
          Terms
        </Link>
        <span className="text-ink/25 mx-2" aria-hidden>
          ·
        </span>
        <Link href="/support" className="text-accent hover:underline">
          Support
        </Link>
      </p>
    </article>
  );
}
