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

export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || 'https://www.openhand.online',
);

function normalizeSiteUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');
  try {
    const url = new URL(trimmed);
    // Vercel 308s apex → www. Canonicals and Transak referrerDomain must match
    // the host reviewers actually land on.
    if (url.hostname === 'openhand.online') {
      url.hostname = 'www.openhand.online';
    }
    return url.origin;
  } catch {
    return 'https://www.openhand.online';
  }
}

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

/**
 * Display-only. Vercel env was pasted without spaces (`89newportcrescentottawaontario`,
 * `ontario,canada`, `6136970257`). That reads as a broken site to a KYB reviewer.
 * Do not invent a different street or city — only restore punctuation for the
 * known compacted production values, or light formatting for a 10-digit phone.
 */
export const LEGAL_ADDRESS_DISPLAY = displayOperatorAddress(LEGAL_ADDRESS);
export const LEGAL_JURISDICTION_DISPLAY = displayJurisdiction(LEGAL_JURISDICTION);
export const CONTACT_PHONE_DISPLAY = displayPhone(CONTACT_PHONE);

function compactOperator(value: string): string {
  return value.replace(/[\s,]+/g, '').toLowerCase();
}

function displayOperatorAddress(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (compactOperator(value) === '89newportcrescentottawaontario') {
    return '89 Newport Crescent, Ottawa';
  }
  return value;
}

function displayJurisdiction(value: string): string {
  if (compactOperator(value) === 'ontariocanada') {
    return 'Ontario, Canada';
  }
  return value;
}

function displayPhone(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return value;
}

export const LEGAL_UPDATED = '24 August 2026';

export const TRANSAK_TERMS_URL = 'https://transak.com/terms-of-service';
export const TRANSAK_TERMS_US_URL = 'https://transak.com/terms-of-service-us';
export const TRANSAK_PRIVACY_URL = 'https://transak.com/privacy-policy';
export const TRANSAK_AUP_URL = 'https://transak.com/acceptable-use-policy';
export const TRANSAK_SUPPORT_URL = 'https://support.transak.com/en';

export const PRIVY_TERMS_URL = 'https://www.privy.io/user-terms-of-service';
export const PRIVY_PRIVACY_URL = 'https://www.privy.io/privacy-policy';

export const FOOTER_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/partners', label: 'Partners' },
  { href: '/buy-usdc', label: 'Buy USDC' },
  { href: '/support', label: 'Support' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refunds', label: 'Refunds' },
  { href: '/risk', label: 'Risk' },
] as const;
