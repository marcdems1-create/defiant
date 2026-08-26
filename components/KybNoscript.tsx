import Link from 'next/link';
import { SITE_NAME } from '@/lib/config/site';

/**
 * Always in the first HTML (root layout). If a future wallet-shell regression
 * bails the homepage out to client rendering again, a JS-off KYB crawl still
 * sees a live product instead of a blank page.
 */
export function KybNoscript() {
  return (
    <noscript>
      <div
        style={{
          maxWidth: '40rem',
          margin: '1.5rem auto',
          padding: '1.25rem',
          border: '1px solid #2a3238',
          color: '#e8edf2',
          fontFamily: 'system-ui, sans-serif',
          lineHeight: 1.5,
        }}
      >
        <p style={{ fontWeight: 600, margin: '0 0 0.75rem' }}>{SITE_NAME} is live</p>
        <p style={{ margin: '0 0 0.75rem' }}>
          {SITE_NAME} is a non-custodial yield interface. Connect a wallet, compare live
          on-chain rates, and sign every deposit and withdrawal yourself. {SITE_NAME} never
          holds your funds. Openhand does not sell USDC: send it to the wallet you connect,
          then deposit.
        </p>
        <p style={{ margin: '0 0 0.75rem' }}>
          How it works: (1) connect a wallet, (2) send USDC to that wallet, (3) deposit
          on-chain with a transaction you sign. There is no pooled {SITE_NAME} vault.
        </p>
        <p style={{ margin: 0 }}>
          <Link href="/about">About</Link>
          {' · '}
          <Link href="/terms">Terms</Link>
          {' · '}
          <Link href="/privacy">Privacy</Link>
          {' · '}
          <Link href="/contact">Contact</Link>
          {' · '}
          <Link href="/buy-usdc">Add USDC</Link>
        </p>
      </div>
    </noscript>
  );
}
