import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { OperatorCard } from '@/components/OperatorCard';
import { CONTACT_EMAIL, LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Contact ${SITE_NAME} at ${CONTACT_EMAIL}.`,
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
        not a personal Gmail — if you are a vendor writing to us.
      </p>

      <LegalH2>Complaints</LegalH2>
      <p>
        Site complaints: {CONTACT_EMAIL}. We will not ask you to send seed phrases or
        private keys.
      </p>
    </LegalDoc>
  );
}
