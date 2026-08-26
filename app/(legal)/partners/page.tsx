import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import { CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_ENTITY_IS_TRADE_NAME, LEGAL_UPDATED, SITE_NAME } from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Partners',
  description: `How ${SITE_NAME} uses Privy and Reown. Fiat never touches ${SITE_NAME}.`,
  alternates: { canonical: '/partners' },
};

export default function PartnersPage() {
  return (
    <LegalDoc title="Partners and fund flow" updated={LEGAL_UPDATED}>
      <p>
        {LEGAL_ENTITY}
        {!LEGAL_ENTITY_IS_TRADE_NAME ? <>, doing business as {SITE_NAME},</> : null} operates
        this site as a non-custodial interface. The table below is
        what a partner review should verify: we never receive CAD or USDC.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.12em] text-ink/45 font-mono">
            <tr>
              <th className="px-3 py-2 font-medium">Step</th>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 font-medium">What happens</th>
            </tr>
          </thead>
          <tbody className="text-ink/70">
            <tr className="border-t border-border">
              <td className="px-3 py-2.5 align-top">Wallet</td>
              <td className="px-3 py-2.5 align-top">You / Privy / Reown</td>
              <td className="px-3 py-2.5">
                You create or connect a wallet. {SITE_NAME} does not store keys or the email
                Privy collects.
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-3 py-2.5 align-top">Add USDC</td>
              <td className="px-3 py-2.5 align-top">You</td>
              <td className="px-3 py-2.5">
                Send USDC you already hold to the connected wallet. {SITE_NAME} does not
                sell USDC and does not process CAD.
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-3 py-2.5 align-top">Yield deposit / withdraw</td>
              <td className="px-3 py-2.5 align-top">Your wallet → protocol</td>
              <td className="px-3 py-2.5">
                You sign supply, deposit, withdraw, or redeem on Aave, Lido, Yearn, and
                similar. No Openhand pool.
              </td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-3 py-2.5 align-top">Dashboard tapes</td>
              <td className="px-3 py-2.5 align-top">LI.FI</td>
              <td className="px-3 py-2.5">
                Optional wallet-signed USDC swaps for spot crypto or tokenized stocks. Not a
                brokerage.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalH2>What we will not add</LegalH2>
      <p>
        No Openhand-operated vault, no relayer that moves user funds, no scored “best
        opportunity,” and no deposit-insurance language.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Partner and user contact:{' '}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    </LegalDoc>
  );
}
