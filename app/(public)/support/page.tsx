import type { Metadata } from 'next';
import { LegalDoc, LegalH2 } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  SITE_NAME,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Support',
  description: `How to reach ${SITE_NAME}. We can help with the interface; we cannot move your funds.`,
};

export default function SupportPage() {
  return (
    <LegalDoc title="Support" updated="19 August 2026">
      <p>
        {SITE_NAME} is operated by {LEGAL_ENTITY} in {LEGAL_JURISDICTION}.
      </p>
      <p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="inline-flex items-center rounded-xl bg-accent text-paper font-medium text-sm px-4 py-2 hover:bg-accent/90 transition-colors w-fit"
        >
          Email {CONTACT_EMAIL}
        </a>
      </p>

      <LegalH2>We can help with</LegalH2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Using the website (connect, buy USDC, deposit, withdraw, Move USDC)</li>
        <li>Whether a page or transaction prompt looks wrong</li>
        <li>Privacy or terms questions about this interface</li>
      </ul>

      <LegalH2>We cannot</LegalH2>
      <ul className="list-disc pl-5 flex flex-col gap-1">
        <li>Hold, freeze, reverse, or recover your crypto — we never have it</li>
        <li>Reset a self-custody wallet or a Privy email/passkey wallet (contact Privy)</li>
        <li>Change or refund a Transak purchase (contact Transak from their checkout emails)</li>
        <li>Give investment, tax, or legal advice</li>
      </ul>

      <LegalH2>Response</LegalH2>
      <p>
        We read this inbox on business days in Eastern Time. Do not send seed phrases, private
        keys, or copies of government ID to this address.
      </p>
    </LegalDoc>
  );
}
