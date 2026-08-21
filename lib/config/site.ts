/**
 * Public site identity.
 *
 * Production 200-host is www.openhand.online (Vercel 308s the apex there).
 * Canonicals, sitemap, Open Graph, and metadataBase must use that host —
 * pointing them at the apex while the site serves on www splits ranking
 * signal. Preview URLs (*.vercel.app) and localhost are left as-is.
 */
export const SITE_NAME = 'Openhand';

export function canonicalSiteUrl(raw?: string): string {
  const fallback = 'https://www.openhand.online';
  const value = (raw || fallback).trim().replace(/\/$/, '');
  try {
    const url = new URL(value);
    if (url.hostname === 'openhand.online') {
      url.hostname = 'www.openhand.online';
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

export const SITE_URL = canonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const SITE_DESCRIPTION =
  'Non-custodial on-chain yield. Connect your own wallet, compare live rates, and sign every deposit and withdrawal yourself. Openhand never holds your funds.';

export function absoluteUrl(path: string): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
