import type { Metadata } from 'next';
import { LegalDoc, LegalH2 } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_JURISDICTION,
  PRIVY_PRIVACY_URL,
  SITE_NAME,
  SITE_URL,
  TRANSAK_PRIVACY_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: `How ${SITE_NAME} handles information. We do not collect KYC and we do not hold your wallet keys.`,
};

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy" updated="19 August 2026">
      <p>
        {SITE_NAME} ({SITE_URL}) is a non-custodial web interface operated by {LEGAL_ENTITY}{' '}
        in {LEGAL_JURISDICTION}. This page describes what this site itself does — and does
        not — collect.
      </p>

      <LegalH2>Operator</LegalH2>
      <p>
        For this website, {LEGAL_ENTITY} ({LEGAL_JURISDICTION}) is the operator. We are not
        the onramp, the wallet vendor, or any yield protocol. Third parties listed below
        process their own data under their own policies.
      </p>

      <LegalH2>What we do not collect</LegalH2>
      <p>
        {SITE_NAME} does not run customer due diligence or collect government ID, home
        address, or other KYC documents. We do not take custody of cryptoassets. We do not
        store your wallet private keys or seed phrase. We do not write your wallet address
        into our database.
      </p>

      <LegalH2>Wallets</LegalH2>
      <p>
        If you connect an existing wallet (MetaMask, Rainbow, Rabby, WalletConnect), that
        software is yours. If you create a wallet with email or a passkey, that wallet is
        provided by Privy, a third party. Privy may process your email. See{' '}
        <a href={PRIVY_PRIVACY_URL} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          Privy&apos;s privacy policy
        </a>
        . {SITE_NAME} does not persist that email.
      </p>

      <LegalH2>Buying USDC</LegalH2>
      <p>
        CAD / Interac purchases of USDC are processed by Transak, a third-party onramp.
        Transak performs its own identity checks and sends USDC to the wallet address you
        connect. See{' '}
        <a href={TRANSAK_PRIVACY_URL} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">
          Transak&apos;s privacy policy
        </a>
        . {SITE_NAME} forwards your IP address to Transak for that checkout (Transak requires
        it for geo/KYC) and does not store it.
      </p>

      <LegalH2>On-chain activity</LegalH2>
      <p>
        Deposits, withdrawals, and transfers are public blockchain transactions you sign
        with your wallet. {SITE_NAME} does not operate a pooled account for those
        transactions.
      </p>

      <LegalH2>Site analytics</LegalH2>
      <p>
        Optional first-party event counts (for example, that a page loaded) may be stored
        without wallet address, IP, or user-agent. This is off unless the operator has
        configured a database. There are no third-party advertising pixels.
      </p>

      <LegalH2>Cookies and local storage</LegalH2>
      <p>
        The site may use browser storage for wallet connection, a pending Move-USDC list
        on this device, and an admin session cookie if you log into the operator dashboard.
        Third-party wallet and onramp widgets may set their own storage.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Questions about this policy: {' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalDoc>
  );
}
