import type { Metadata } from 'next';
import { LegalDoc, LegalH2 } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  PRIVY_TERMS_URL,
  SITE_NAME,
  SITE_URL,
  TRANSAK_TERMS_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Terms',
  description: `Terms of use for the ${SITE_NAME} non-custodial interface.`,
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of use" updated="19 August 2026">
      <p>
        These terms govern your use of {SITE_NAME} at {SITE_URL}, a software interface
        operated by {LEGAL_ENTITY} ({LEGAL_JURISDICTION}). By using the site you agree to
        them.
      </p>

      <LegalH2>What this product is</LegalH2>
      <p>
        {SITE_NAME} lets you view live on-chain yield figures and build transactions that
        <strong className="text-ink font-medium"> your wallet signs</strong>. We never hold,
        pool, or transmit your cryptoassets. We are not a bank, broker, dealer, exchange, or
        custodian. Nothing on the site is an offer of securities, a recommendation, or
        investment, tax, or legal advice.
      </p>

      <LegalH2>Risk</LegalH2>
      <p>
        On-chain yield is not a deposit and is not insured. Returns change and are not
        guaranteed. You can lose capital to market moves, liquidity gaps, or smart-contract
        failure. You are responsible for understanding each protocol you use (for example
        Aave, Yearn, Curve) and for your own tax reporting.
      </p>

      <LegalH2>Third parties</LegalH2>
      <p>
        Wallet connection may use WalletConnect and, if you choose email or a passkey, Privy
        (
        <a href={PRIVY_TERMS_URL} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          Privy terms
        </a>
        ). USDC purchases use Transak (
        <a href={TRANSAK_TERMS_URL} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          Transak terms
        </a>
        ). Those services have their own terms; {SITE_NAME} does not control them.
      </p>

      <LegalH2>Eligibility and prohibited use</LegalH2>
      <p>
        You must be allowed to use this software where you live. You must not use the
        interface for fraud, sanctions evasion, or any unlawful purpose. We may restrict
        access to the website at any time.
      </p>

      <LegalH2>Limitation of liability</LegalH2>
      <p>
        The interface is provided as is. To the fullest extent permitted by law, {LEGAL_ENTITY}{' '}
        is not liable for lost funds, lost profits, protocol failures, third-party outages,
        or your transactions. Your sole remedy is to stop using the site.
      </p>

      <LegalH2>Governing law</LegalH2>
      <p>
        These terms are governed by the laws of {LEGAL_JURISDICTION}, without regard to
        conflict-of-law rules. If a court finds a part unenforceable, the rest still applies.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
          {CONTACT_EMAIL}
        </a>
      </p>
    </LegalDoc>
  );
}
