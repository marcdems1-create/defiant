import Link from 'next/link';
import { SITE_NAME } from '@/lib/config/site';

/** First-paint homepage copy. Must stay a server component so KYB crawlers see a real product. */
export function ProductIntro() {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono">
        Non-custodial yield
      </p>
      <h1 className="text-3xl font-medium tracking-tight">
        Compare live on-chain rates. You sign every transaction.
      </h1>
      <p className="text-ink/55 text-sm max-w-2xl leading-relaxed">
        {SITE_NAME} is a web interface, not a bank and not a custodian. Connect a wallet, browse
        live yield, and sign deposits and withdrawals yourself. {SITE_NAME} never holds your
        funds. There is no pooled vault and no admin key.
      </p>
      <p className="text-ink/55 text-sm max-w-2xl leading-relaxed">
        Openhand does not sell USDC. Send USDC to the wallet you connect, then deposit. See{' '}
        <Link href="/about" className="text-accent hover:underline">
          About
        </Link>
        ,{' '}
        <Link href="/terms" className="text-accent hover:underline">
          Terms
        </Link>
        ,{' '}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy
        </Link>
        , and{' '}
        <Link href="/buy-usdc" className="text-accent hover:underline">
          Add USDC
        </Link>
        .
      </p>
    </header>
  );
}
