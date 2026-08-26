import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Add USDC',
  description: `${SITE_NAME} does not sell USDC. Send USDC to the wallet you connect, then deposit. Openhand never holds it.`,
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
        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">USDC</p>
        <h1 className="text-3xl font-medium tracking-tight">Add USDC</h1>
        <p className="text-xs text-ink/40">Last updated {LEGAL_UPDATED}</p>
      </header>

      <div className="flex flex-col gap-5 text-sm text-ink/70 leading-relaxed">
        <p>
          {SITE_NAME} does not sell USDC and does not process CAD. There is no in-app
          checkout. USDC you deposit stays in the wallet you connect — we never receive it.
        </p>

        <h2 className="text-base font-medium text-ink mt-2">How to fund the wallet</h2>
        <ol className="list-decimal pl-5 flex flex-col gap-2">
          <li>Connect a wallet (email, passkey, or an existing wallet).</li>
          <li>Copy the address shown under Add USDC.</li>
          <li>
            Buy USDC wherever you already can, then withdraw it to that address on Ethereum,
            Base, or Arbitrum — the same network you will deposit on.
          </li>
          <li>Come back here and deposit. You sign that transaction.</li>
        </ol>
        <p>
          The wrong network will not show up as a depositable balance. Openhand cannot
          reverse a transfer sent to the wrong chain or the wrong address.
        </p>

        <h2 className="text-base font-medium text-ink mt-2">Questions</h2>
        <p>
          Site questions:{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline font-mono">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </article>
  );
}
