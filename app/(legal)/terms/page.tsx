import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_ENTITY_IS_TRADE_NAME,
  LEGAL_JURISDICTION_DISPLAY,
  LEGAL_UPDATED,
  PRIVY_TERMS_URL,
  SITE_NAME,
  SITE_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: `Terms of use for the ${SITE_NAME} non-custodial interface.`,
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of use" updated={LEGAL_UPDATED}>
      <p>
        These terms govern your use of {SITE_NAME} at {SITE_URL}, a software interface
        operated by {LEGAL_ENTITY}
        {!LEGAL_ENTITY_IS_TRADE_NAME ? <>, doing business as {SITE_NAME}</> : null}{' '}
        ({LEGAL_JURISDICTION_DISPLAY}). By using the site you agree to them. If you do not
        agree, do not use the interface.
      </p>

      <LegalH2>What this product is</LegalH2>
      <p>
        {SITE_NAME} lets you view live on-chain yield figures and build transactions that{' '}
        <strong className="text-ink font-medium">your wallet signs</strong>. We never hold,
        pool, or transmit your cryptoassets. We are not a bank, broker, dealer, exchange,
        money transmitter, or custodian. Nothing on the site is an offer of securities, a
        recommendation, or investment, tax, or legal advice.
      </p>

      <LegalH2>Eligibility</LegalH2>
      <p>
        You must be at least 18 years old and allowed to use this software where you live.
        You are responsible for complying with local law, including tax reporting. You must
        not use the interface if you are on a sanctions list or for any unlawful purpose,
        including fraud or sanctions evasion. We may restrict access to the website at any
        time.
      </p>

      <LegalH2>Non-custodial interface</LegalH2>
      <p>
        Wallet keys stay with you (or with a wallet vendor you choose, such as Privy). Every
        approve, supply, deposit, withdraw, swap, bridge, or redeem is a transaction you
        sign. {SITE_NAME} does not operate a pooled contract, does not run a relayer that
        moves your funds, and does not take a cut inside a protocol call.
      </p>

      <LegalH2>Risk</LegalH2>
      <p>
        On-chain yield is not a bank deposit and is not insured (no CDIC, FDIC, FSCS, or
        similar). Returns change and are not guaranteed. You can lose capital to market
        moves, liquidity gaps, depegs, oracle failures, or smart-contract bugs. You are
        responsible for understanding each protocol you use. See also our{' '}
        <LegalLink href="/risk">risk disclosure</LegalLink>.
      </p>

      <LegalH2>USDC</LegalH2>
      <p>
        {SITE_NAME} does not sell USDC, does not process CAD, and does not operate a cash
        out. You send USDC you already hold to the wallet you connect. See{' '}
        <LegalLink href="/buy-usdc">Add USDC</LegalLink>. {LEGAL_ENTITY} never receives that
        USDC.
      </p>

      <LegalH2>Other third parties</LegalH2>
      <p>
        Wallet connection may use WalletConnect / Reown and, if you choose email or a
        passkey, Privy (
        <LegalLink href={PRIVY_TERMS_URL} external>
          Privy terms
        </LegalLink>
        ). Optional same-chain swaps or tokenized-asset tapes use LI.FI or 0x as routers you
        sign to — those are not a brokerage operated by {SITE_NAME}. Those services have
        their own terms; {SITE_NAME} does not control them.
      </p>

      <LegalH2>Fees</LegalH2>
      <p>
        Protocol gas is paid by your wallet. {SITE_NAME} does not skim a deposit or withdraw
        fee inside Aave, Yearn, or similar calls. Optional partner economics, if any, sit on
        an opt-in conversion route — never as a silent cut of your yield.
      </p>

      <LegalH2>No advice, no featured product</LegalH2>
      <p>
        Live rates are public data, not a recommendation. Filters hide or reorder the
        catalog; they are not a suitability score. We do not tell you which card to pick.
      </p>

      <LegalH2>Limitation of liability</LegalH2>
      <p>
        The interface is provided as is. To the fullest extent permitted by law,{' '}
        {LEGAL_ENTITY} is not liable for lost funds, lost profits, protocol failures,
        third-party outages (including Privy, a router, or a blockchain), or your
        transactions. Your sole remedy is to stop using the site.
      </p>

      <LegalH2>Governing law</LegalH2>
      <p>
        These terms are governed by the laws of {LEGAL_JURISDICTION_DISPLAY}, without regard to
        conflict-of-law rules. If a court finds a part unenforceable, the rest still applies.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>
      </p>
    </LegalDoc>
  );
}
