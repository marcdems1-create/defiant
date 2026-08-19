import type { Metadata } from 'next';
import Link from 'next/link';
import { CompanyMarks } from '@/components/CompanyMarks';
import { HowItWorks } from '@/components/HowItWorks';
import { LegalH2 } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  SITE_NAME,
  SITE_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'About',
  description: `${SITE_NAME} is a non-custodial USDC yield interface operated by ${LEGAL_ENTITY} in ${LEGAL_JURISDICTION}.`,
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-8">
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
          compare live on-chain USDC yield, and sign every deposit and withdrawal yourself.
          We never hold, pool, or transmit your crypto.
        </p>
      </header>

      <CompanyMarks />

      <div className="flex flex-col gap-5 text-sm text-ink/70 leading-relaxed">
        <LegalH2>Who operates this</LegalH2>
        <p>
          The site is operated by <span className="text-ink">{LEGAL_ENTITY}</span> in{' '}
          {LEGAL_JURISDICTION}. Contact{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
            {CONTACT_EMAIL}
          </a>
          .
        </p>

        <LegalH2>What this is not</LegalH2>
        <p>
          {SITE_NAME} is not a bank, broker, exchange, or custodian. Yield is not a deposit
          and is not insured. Returns change and are not guaranteed. Nothing here is
          investment, tax, or legal advice, and the catalog is not a recommendation — we do
          not score or feature a “best” opportunity.
        </p>

        <LegalH2>Buying USDC</LegalH2>
        <p>
          CAD / Interac purchases are processed by Transak, a third-party onramp. Transak
          runs its own identity checks and sends USDC to the wallet you connect. {SITE_NAME}{' '}
          does not receive those funds.
        </p>
      </div>

      <HowItWorks />

      <p className="text-sm text-ink/50">
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
