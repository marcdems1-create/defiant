/**
 * Public site identity. Production host is openhand.online.
 * Override with NEXT_PUBLIC_SITE_URL on previews.
 *
 * Operator fields must match the Transak KYB filing (legal name, mailing
 * address, email). Do not invent an entity or use a personal Gmail — the
 * last KYB polish that hardcoded HYPERFLEX / hello@openhand.money was
 * reverted for that reason. Set NEXT_PUBLIC_OPERATOR_* on Vercel before
 * resubmitting KYB.
 */
export const SITE_NAME = 'Openhand';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openhand.online'
).replace(/\/$/, '');

export const SITE_DESCRIPTION =
  'Non-custodial on-chain yield. Connect your own wallet, compare live rates, and sign every deposit and withdrawal yourself. Openhand never holds your funds.';

function publicEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Corporate mailbox for Transak KYB and user contact. Not a personal Gmail. */
export const CONTACT_EMAIL =
  publicEnv('NEXT_PUBLIC_OPERATOR_EMAIL') ?? 'hello@openhand.online';

/**
 * Legal / trade name on the Transak KYB form. Defaults to the public product
 * name until the operator publishes the filing name via env.
 */
export const LEGAL_ENTITY = publicEnv('NEXT_PUBLIC_OPERATOR_LEGAL_NAME') ?? SITE_NAME;

export const LEGAL_JURISDICTION =
  publicEnv('NEXT_PUBLIC_OPERATOR_JURISDICTION') ?? 'Canada';

/** Physical mailing address from the KYB form. Omit rather than invent. */
export const LEGAL_ADDRESS = publicEnv('NEXT_PUBLIC_OPERATOR_ADDRESS');

export const CONTACT_PHONE = publicEnv('NEXT_PUBLIC_OPERATOR_PHONE');

export const LEGAL_UPDATED = '21 August 2026';

export const TRANSAK_TERMS_URL = 'https://transak.com/terms-of-service';
export const TRANSAK_TERMS_US_URL = 'https://transak.com/terms-of-service-us';
export const TRANSAK_PRIVACY_URL = 'https://transak.com/privacy-policy';
export const TRANSAK_SUPPORT_URL = 'https://support.transak.com/en';

export const PRIVY_TERMS_URL = 'https://www.privy.io/user-terms-of-service';
export const PRIVY_PRIVACY_URL = 'https://www.privy.io/privacy-policy';

export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/partners', label: 'Partners' },
  { href: '/buy-usdc', label: 'Buy USDC' },
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/risk', label: 'Risk' },
] as const;
