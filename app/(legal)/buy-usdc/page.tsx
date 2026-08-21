import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  SITE_NAME,
  TRANSAK_PRIVACY_URL,
  TRANSAK_SUPPORT_URL,
  TRANSAK_TERMS_URL,
  TRANSAK_TERMS_US_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Buy USDC',
  description: `CAD / Interac → USDC is Transak checkout, not ${SITE_NAME}. Review Transak’s terms before the widget opens. Funds go to your wallet.`,
  alternates: { canonical: '/buy-usdc' },
};

export default function BuyUsdcPage() {
  return (
    <article className="max-w-2xl mx-auto flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink/50 hover:text-accent transition-colors w-fit"
      >
        <span aria-hidden>←</span> Back to collection
      </Link>
      <header className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">Onramp</p>
        <h1 className="text-3xl font-medium tracking-tight">Buy USDC with Transak</h1>
        <p className="text-xs text-ink/40">Last updated {LEGAL_UPDATED}</p>
      </header>

      <div className="flex flex-col gap-5 text-sm text-ink/70 leading-relaxed">
        <p>
          CAD / Interac purchases of USDC on {SITE_NAME} are a{' '}
          <strong className="text-ink font-medium">Transak</strong> checkout. Transak is the
          merchant of record. They run KYC, take CAD, and send USDC to the wallet you
          connect. {SITE_NAME} never receives that CAD or USDC.
        </p>
        <p>
          Cash out (USDC → CAD) uses the same Transak widget. Same rule: Transak, not{' '}
          {SITE_NAME}, handles the fiat.
        </p>

        <h2 className="text-base font-medium text-ink mt-2">What you agree to</h2>
        <p>
          Transak requires that you can review and acknowledge their terms before checkout.
          On this site the Buy USDC / Cash out button opens a sheet that{' '}
          <strong className="text-ink font-medium">does not load Transak</strong> until you
          check that box. You are agreeing to:
        </p>
        <ul className="list-disc pl-5 flex flex-col gap-2">
          <li>
            <Link href="/terms" className="text-accent hover:underline">
              {SITE_NAME} terms of use
            </Link>{' '}
            (Transak&apos;s terms are incorporated there by reference)
          </li>
          <li>
            <a
              href={TRANSAK_TERMS_URL}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Transak Terms of Service
            </a>
            {' '}
            (US residents:{' '}
            <a
              href={TRANSAK_TERMS_US_URL}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              US terms
            </a>
            )
          </li>
          <li>
            <a
              href={TRANSAK_PRIVACY_URL}
              className="text-accent hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Transak Privacy Policy
            </a>
          </li>
        </ul>

        <h2 className="text-base font-medium text-ink mt-2">How to start checkout</h2>
        <ol className="list-decimal pl-5 flex flex-col gap-2">
          <li>Open the collection and connect a wallet (email, passkey, or an existing wallet).</li>
          <li>Choose Buy USDC (or Cash out on the dashboard when you hold USDC).</li>
          <li>Read the terms linked in the sheet and check the acknowledgement (unchecked by default).</li>
          <li>Continue — Transak&apos;s widget then loads in an iframe. Complete KYC and payment with Transak.</li>
        </ol>
        <p>
          Production buys need a live Transak partner app. Until that is approved, the sheet
          still shows this wallet address so you can send USDC yourself.
        </p>

        <h2 className="text-base font-medium text-ink mt-2">Problems with a payment</h2>
        <p>
          Refunds and missing USDC:{' '}
          <a
            href={TRANSAK_SUPPORT_URL}
            className="text-accent hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            support.transak.com
          </a>
          . Site or partner questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </article>
  );
}
