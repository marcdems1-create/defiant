import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Support',
  description: `How to reach ${SITE_NAME}. We cannot reverse a blockchain transaction.`,
  alternates: { canonical: '/support' },
};

export default function SupportPage() {
  return (
    <LegalDoc title="Support" updated={LEGAL_UPDATED}>
      <p>
        {SITE_NAME} is a software interface. We can help with how the site works. We cannot
        reverse a blockchain transaction.
      </p>

      <LegalH2>Contact {SITE_NAME}</LegalH2>
      <p>
        Email{' '}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>. Use this
        mailbox for site bugs, partner due diligence, and questions about these pages. It
        is a corporate address on openhand.online — not a personal Gmail.
      </p>

      <LegalH2>USDC</LegalH2>
      <p>
        {SITE_NAME} does not sell USDC. If a purchase or withdrawal at another venue went
        wrong, contact that venue. We never received the funds, so we cannot issue a refund
        from {SITE_NAME}.
      </p>

      <LegalH2>Wallet and keys</LegalH2>
      <p>
        If you used email or a passkey, that wallet is Privy&apos;s infrastructure. If you
        connected MetaMask or another extension, that vendor&apos;s support applies. {SITE_NAME}{' '}
        does not hold a backup of your keys.
      </p>

      <LegalH2>On-chain deposits</LegalH2>
      <p>
        Protocol positions live on Aave, Lido, Yearn, and similar contracts you signed to.
        Check the transaction on a block explorer. We cannot move funds on your behalf.
      </p>
    </LegalDoc>
  );
}
