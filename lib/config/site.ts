/**
 * Public site identity. Production host is openhand.online.
 * Override with NEXT_PUBLIC_SITE_URL on previews.
 */
export const SITE_NAME = 'Openhand';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://openhand.online'
).replace(/\/$/, '');

export const SITE_DESCRIPTION =
  'Non-custodial cash, on-chain yield, and price upside — gold, stocks, crypto. Connect your own wallet and sign every move. Openhand never holds your funds.';
