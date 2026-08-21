import type { Metadata } from 'next';
import { LegalDoc, LegalH2, LegalLink } from '@/components/LegalDoc';
import {
  CONTACT_EMAIL,
  LEGAL_ENTITY,
  LEGAL_UPDATED,
  SITE_NAME,
  TRANSAK_PRIVACY_URL,
  TRANSAK_SUPPORT_URL,
  TRANSAK_TERMS_URL,
} from '@/lib/config/site';

export const metadata: Metadata = {
  title: 'Partners',
  description: `How ${SITE_NAME} uses Transak, Privy, and Reown. Fiat never touches ${SITE_NAME}.`,
  alternates: { canonical: '/partners' },
};

export default function PartnersPage() {
  return (
    <LegalDoc title="Partners and fund flow" updated={LEGAL_UPDATED}>
      <p>
        {LEGAL_ENTITY} operates {SITE_NAME} as a non-custodial interface. The table below is
        what a partner review should verify: we never receive CAD or USDC, and Transak is
        the only fiat on/off ramp.
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
              <td className="px-3 py-2.5 align-top">Buy or cash out USDC</td>
              <td className="px-3 py-2.5 align-top">Transak</td>
              <td className="px-3 py-2.5">
                CAD / Interac checkout. Transak runs KYC, is merchant of record, and sends
                USDC to — or takes USDC from — your wallet. {SITE_NAME} never receives those
                funds.
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
              <td className="px-3 py-2.5 align-top">LI.FI (not Transak)</td>
              <td className="px-3 py-2.5">
                Optional wallet-signed USDC swaps for spot crypto or tokenized stocks. Not a
                brokerage. Not Transak checkout.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <LegalH2>Transak</LegalH2>
      <p>
        Hosted widget only (not Transak Whitelabel). Prefill is CAD, country CA, USDC, and
        the connected wallet. We do not pass identity data to skip KYC. Users must review
        and acknowledge{' '}
        <LegalLink href={TRANSAK_TERMS_URL} external>
          Transak&apos;s Terms of Service
        </LegalLink>{' '}
        before the widget loads — see <LegalLink href="/buy-usdc">Buy USDC</LegalLink> and{' '}
        <LegalLink href="/terms">our terms</LegalLink> (Transak terms incorporated). Privacy:{' '}
        <LegalLink href={TRANSAK_PRIVACY_URL} external>
          Transak privacy policy
        </LegalLink>
        . User issues with a CAD payment:{' '}
        <LegalLink href={TRANSAK_SUPPORT_URL} external>
          support.transak.com
        </LegalLink>
        .
      </p>

      <LegalH2>What we will not add</LegalH2>
      <p>
        No Openhand-operated vault, no relayer that moves user funds, no second onramp
        fighting Transak, no scored “best opportunity,” and no deposit-insurance language.
      </p>

      <LegalH2>Contact</LegalH2>
      <p>
        Partner and user contact:{' '}
        <LegalLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</LegalLink>.
      </p>
    </LegalDoc>
  );
}
