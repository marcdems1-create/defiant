import type { Metadata } from 'next';
import { LegalDoc, LegalH2 } from '@/components/LegalDoc';
import { LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Refunds',
  description: `${SITE_NAME} never receives CAD or USDC. On-chain transactions you sign cannot be reversed by ${SITE_NAME}.`,
  alternates: { canonical: '/refunds' },
};

export default function RefundsPage() {
  return (
    <LegalDoc title="Refunds" updated={LEGAL_UPDATED}>
      <p>
        {SITE_NAME} never receives CAD or USDC. We cannot refund a payment we did not take.
      </p>

      <LegalH2>USDC you send to your wallet</LegalH2>
      <p>
        If you buy USDC somewhere else and withdraw it to the wallet you connect here, that
        purchase is with the venue you used — not with {SITE_NAME}. Ask that venue about
        refunds. We cannot reverse a blockchain transfer.
      </p>

      <LegalH2>On-chain deposits and swaps</LegalH2>
      <p>
        Transactions you sign to Aave, Yearn, Lido, LI.FI, or another protocol are on a
        public blockchain. {SITE_NAME} cannot reverse them. If you sent the wrong amount or
        used the wrong network, we have no pool to pull funds back from.
      </p>

      <LegalH2>Fees</LegalH2>
      <p>
        Network gas is paid by your wallet to the chain. {SITE_NAME} does not skim a deposit
        or withdraw fee inside a protocol call.
      </p>
    </LegalDoc>
  );
}
