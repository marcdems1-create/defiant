/**
 * Public site identity. Production host is openhand.online.
 * Override with NEXT_PUBLIC_SITE_URL on previews.
 */
export const SITE_NAME = 'Openhand';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openhand.online'
).replace(/\/$/, '');

export const SITE_DESCRIPTION =
  'Non-custodial on-chain yield. Connect your own wallet, compare live rates, and sign every deposit and withdrawal yourself. Openhand never holds your funds.';
