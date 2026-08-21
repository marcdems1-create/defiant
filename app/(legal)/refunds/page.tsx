import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { LEGAL_UPDATED, SITE_NAME, TRANSAK_SUPPORT_URL } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Refunds',
  description: `Fiat refunds for USDC buy and cash out are handled by Transak, not ${SITE_NAME}. ${SITE_NAME} never receives CAD or USDC from that checkout.`,
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return (
    <LegalDoc title="Refunds" updated={LEGAL_UPDATED}>
      <p>
        {SITE_NAME} never receives CAD or USDC from Buy USDC or cash out. Those checkouts are
        Transak&apos;s. We cannot refund a payment we did not take.
      </p>

      <LegalH2>CAD / Interac / card (Transak)</LegalH2>
      <p>
        Cancelled orders, failed payments, missing USDC, and chargebacks are processed by
        Transak under Transak&apos;s terms. Open{' '}
        <LegalLink href={TRANSAK_SUPPORT_URL} external>
          Transak support
        </LegalLink>{' '}
        with your order email or order ID. Confirm any refund wallet address with them —
        not with {SITE_NAME}.
      </p>

      <LegalH2>On-chain deposits and swaps</LegalH2>
      <p>
        Transactions you sign to Aave, Yearn, Lido, LI.FI, or another protocol are on a
        public blockchain. {SITE_NAME} cannot reverse them. If you sent the wrong amount or
        used the wrong network, we have no pool to pull funds back from.
      </p>

      <LegalH2>Fees</LegalH2>
      <p>
        Transak checkout fees are Transak&apos;s. Network gas is paid by your wallet to the
        chain. {SITE_NAME} does not skim a deposit or withdraw fee inside a protocol call.
      </p>
    </LegalDoc>
  );
}
