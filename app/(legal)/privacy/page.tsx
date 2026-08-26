import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { OperatorCard } from '@/components/OperatorCard';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION_DISPLAY,
  LEGAL_UPDATED,
  PRIVY_PRIVACY_URL,
  SITE_NAME,
  SITE_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: `How ${SITE_NAME} handles information. We do not collect KYC and we do not hold your wallet keys.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy" updated={LEGAL_UPDATED}>
      <OperatorCard />
      <p>
        {SITE_NAME} ({SITE_URL}) is a non-custodial web interface operated by {LEGAL_ENTITY}{' '}
        in {LEGAL_JURISDICTION_DISPLAY}. This page describes what this site itself does — and does
        not — collect.
      </p>

      <LegalH2>Operator</LegalH2>
      <p>
        For this website, {LEGAL_ENTITY} ({LEGAL_JURISDICTION_DISPLAY}) is the operator. We are not
        the onramp, the wallet vendor, or any yield protocol. Third parties listed below
        process their own data under their own policies.
      </p>

      <LegalH2>What we do not collect</LegalH2>
      <p>
        {SITE_NAME} does not run customer due diligence and does not collect government ID,
        home address, or other KYC documents. We do not take custody of cryptoassets. We do
        not store your wallet private keys or seed phrase. We do not write your wallet
        address into our database unless a future feature adds an unchecked-by-default
        consent box and a signature proving you own that address (none exists today).
      </p>

      <LegalH2>Wallets</LegalH2>
      <p>
        If you connect an existing wallet (MetaMask, Rainbow, Rabby, WalletConnect), that
        software is yours. If you create a wallet with email or a passkey, that wallet is
        provided by Privy, a third party. Privy may process your email. See{' '}
        <LegalLink href={PRIVY_PRIVACY_URL} external>
          Privy&apos;s privacy policy
        </LegalLink>
        . {SITE_NAME} does not persist that email.
      </p>

      <LegalH2>USDC</LegalH2>
      <p>
        {SITE_NAME} does not sell USDC and does not process CAD. You send USDC you already
        hold to the wallet you connect. We do not collect identity documents for that
        transfer and we do not receive the USDC.
      </p>

      <LegalH2>On-chain activity</LegalH2>
      <p>
        Deposits, withdrawals, swaps, and transfers are public blockchain transactions you
        sign with your wallet. {SITE_NAME} does not operate a pooled account for those
        transactions. Optional routers (LI.FI, 0x, Circle CCTP attestation) see what they
        need to quote or attest a transaction you sign — not a customer file we keep.
      </p>

      <LegalH2>Site analytics</LegalH2>
      <p>
        Optional first-party event counts (for example, that a page loaded) may be stored
        without wallet address, IP, or user-agent. This is off unless the operator has
        configured a database. There are no third-party advertising pixels. If that store
        is ever turned on for real users, a retention period and a deletion path will be
        published here first.
      </p>

      <LegalH2>Cookies and local storage</LegalH2>
      <p>
        The site may use browser storage for wallet connection, a pending Move-USDC list on
        this device, an install-prompt snooze, and an admin session cookie if you log into
        the operator dashboard. Third-party wallet widgets may set their own storage.
      </p>

      <LegalH2>Your requests</LegalH2>
      <p>
        Because we do not keep a wallet-linked customer file, we typically cannot look up
        “your account.” For data Privy holds, contact Privy. Questions about this
        policy:{' '}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    </LegalDoc>
  );
}
