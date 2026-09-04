import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Risk disclosure',
  description: `${SITE_NAME} is not a bank. On-chain yield is not insured. Transak checkout is a separate third-party product.`,
  alternates: { canonical: '/risk' },
};

export default function RiskPage() {
  return (
    <LegalDoc title="Risk disclosure" updated={LEGAL_UPDATED}>
      <p>
        {SITE_NAME} is a non-custodial interface. This page is a disclosure, not a
        suitability questionnaire and not investment advice. We do not score products or
        tell you which card to pick.
      </p>

      <LegalH2>Not a deposit</LegalH2>
      <p>
        On-chain yield is not a bank savings account. It is not insured by CDIC, FDIC,
        FSCS, or any similar scheme. Returns are variable and not guaranteed. You can lose
        some or all of the value you put into a protocol.
      </p>

      <LegalH2>Smart-contract and market risk</LegalH2>
      <p>
        Protocols can be exploited, paused, or illiquid. Stablecoins can depeg. Oracles can
        fail. Lido withdrawals wait in a queue. Some vaults (for example Maple) require a
        separate authorization you complete on their site — {SITE_NAME} cannot sign that for
        you. Higher-risk cards are labeled; that badge is coarse, not a rating.
      </p>

      <LegalH2>Transak is separate</LegalH2>
      <p>
        Buying or cashing out USDC with CAD / Interac is Transak&apos;s product. Transak
        decides whether you pass KYC, which payment methods you can use, and when USDC
        arrives. A failed or delayed Transak order is not an {SITE_NAME} custody event —
        we never held the funds. See <LegalLink href="/terms">Terms</LegalLink> (Transak
        terms incorporated) and <LegalLink href="/buy-usdc">Buy USDC</LegalLink>.
      </p>

      <LegalH2>Tokenized stocks and spot crypto</LegalH2>
      <p>
        Dashboard tapes routed by LI.FI are not Transak, not the listed share, and not a
        brokerage. Issuers often exclude US retail. Availability varies. You sign every
        swap. Do not treat a sort order as a recommendation.
      </p>

      <LegalH2>You sign</LegalH2>
      <p>
        If you do not understand a transaction your wallet is asking you to sign, do not
        sign it. {SITE_NAME} cannot reverse an on-chain transaction.
      </p>
    </LegalDoc>
  );
}
