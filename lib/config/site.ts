/**
 * Public site identity. Production host is openhand.online until the
 * openhand.money cutover (PR #29) is live. Override with NEXT_PUBLIC_SITE_URL
 * on previews.
 *
 * Operator identity is load-bearing for partner KYB (Transak): keep LEGAL_ENTITY,
 * LEGAL_JURISDICTION, and CONTACT_EMAIL matching the business filing. Do not
 * invent a street address.
 */
export const SITE_NAME = 'Openhand';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openhand.online'
).replace(/\/$/, '');

export const SITE_DESCRIPTION =
  'Non-custodial USDC yield interface. Connect your own wallet, compare live on-chain rates, and sign every deposit and withdrawal yourself. Openhand never holds your funds.';

/** Ontario sole proprietorship that operates the Openhand interface. */
export const LEGAL_ENTITY = 'HYPERFLEX';

export const LEGAL_JURISDICTION = 'Ontario, Canada';

/** Corporate mailbox used for Transak KYB and user support. Not a personal Gmail. */
export const CONTACT_EMAIL = 'hello@openhand.money';

export const TRANSAK_PRIVACY_URL = 'https://transak.com/privacy-policy';
export const TRANSAK_TERMS_URL = 'https://transak.com/terms-of-service';
export const PRIVY_PRIVACY_URL = 'https://www.privy.io/privacy-policy';
export const PRIVY_TERMS_URL = 'https://www.privy.io/user-terms-of-service';
