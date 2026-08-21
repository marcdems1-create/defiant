import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { OperatorCard } from '@/components/OperatorCard';
import {
  CONTACT_EMAIL,
  LEGAL_UPDATED,
  SITE_NAME,
  TRANSAK_SUPPORT_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${SITE_NAME} at ${CONTACT_EMAIL}. Transak handles CAD / USDC checkout support.`,
  alternates: { canonical: '/contact' },
};

export default function ContactPage() {
  return (
    <LegalDoc title="Contact" updated={LEGAL_UPDATED}>
      <OperatorCard />

      <LegalH2>This website</LegalH2>
      <p>
        Email{' '}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink> for the
        interface, partner due diligence, and these legal pages. Use a corporate mailbox —
        not a personal Gmail — if you are Transak or another vendor writing to us.
      </p>

      <LegalH2>Buy USDC / cash out</LegalH2>
      <p>
        Payments, KYC, and refunds:{' '}
        <LegalLink href={TRANSAK_SUPPORT_URL} external>
          support.transak.com
        </LegalLink>
        . {SITE_NAME} is not the merchant of record for that checkout.
      </p>

      <LegalH2>Complaints</LegalH2>
      <p>
        Site complaints: {CONTACT_EMAIL}. Transak checkout complaints: Transak support (chat
        on their help center). We will not ask you to send seed phrases or private keys.
      </p>
    </LegalDoc>
  );
}
