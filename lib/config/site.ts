/**
 * Public site identity. Production host is openhand.money.
 * Override with NEXT_PUBLIC_SITE_URL on previews.
 */
export const SITE_NAME = 'Openhand';

export const PRODUCTION_HOST = 'openhand.money';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || `https://${PRODUCTION_HOST}`
).replace(/\/$/, '');

export const SITE_DESCRIPTION =
  'Non-custodial on-chain yield. Connect your own wallet, compare live rates, and sign every deposit and withdrawal yourself. Openhand never holds your funds.';

/** Hosts that 308 to PRODUCTION_HOST. Keep the old .online names until DNS is dropped. */
export const LEGACY_REDIRECT_HOSTS = [
  `www.${PRODUCTION_HOST}`,
  'openhand.online',
  'www.openhand.online',
] as const;
