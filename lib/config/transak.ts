import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { SITE_URL } from '@/lib/config/site';

/**
 * Transak on-ramp for CAD / Interac → USDC into the connected wallet.
 * Uses Widget with API Customization (Create Widget URL), not Whitelabel.
 * https://docs.transak.com/guides/widget-with-api-customization
 *
 * Keys stay server-side. The browser only loads the one-shot widgetUrl
 * returned by POST /api/onramp/widget.
 *
 * Do not pass `userData` to skip Lite KYC — Openhand must not collect
 * identity documents or home address. Transak owns that screen.
 */

const USDC_NETWORK: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [base.id]: 'base',
  [arbitrum.id]: 'arbitrum',
  // Staging delivers Transak Test Token (TRNSK) on these testnets.
  [sepolia.id]: 'ethereum',
  [baseSepolia.id]: 'base',
  [arbitrumSepolia.id]: 'arbitrum',
};

/** Hostnames Transak may list as referrerDomain. Session host must match. */
const REFERRER_ALLOWLIST = new Set([
  'openhand.online',
  'www.openhand.online',
  'localhost',
  '127.0.0.1',
  'temporary-instant-bugle-1rh5ndv.vercel.app',
]);

export function transakNetwork(chainId: number): string | undefined {
  return USDC_NETWORK[chainId];
}

export function transakReferrerDomain(): string {
  try {
    return new URL(SITE_URL).hostname;
  } catch {
    return 'openhand.online';
  }
}

/** Prefer the page the iframe is on (localhost vs www) so Transak's Referer check passes. */
export function transakReferrerDomainFromRequest(request: Request): string {
  for (const raw of [request.headers.get('origin'), request.headers.get('referer')]) {
    if (!raw) continue;
    try {
      const host = new URL(raw).hostname;
      if (REFERRER_ALLOWLIST.has(host)) return host;
    } catch {
      /* ignore */
    }
  }
  const fallback = transakReferrerDomain();
  return REFERRER_ALLOWLIST.has(fallback) ? fallback : 'openhand.online';
}

export function transakApiKey(): string | undefined {
  return process.env.TRANSAK_API_KEY?.trim() || process.env.NEXT_PUBLIC_TRANSAK_API_KEY?.trim();
}

export function transakApiSecret(): string | undefined {
  return process.env.TRANSAK_API_SECRET?.trim();
}

export function transakConfigured(): boolean {
  return Boolean(transakApiKey() && transakApiSecret());
}

export function transakStaging(): boolean {
  const flag = process.env.TRANSAK_STAGING?.trim().toLowerCase();
  if (flag === '1' || flag === 'true') return true;
  return (transakApiKey()?.toLowerCase() ?? '').includes('stg');
}

export function transakRefreshUrl(): string {
  return transakStaging()
    ? 'https://api-stg.transak.com/partners/api/v2/refresh-token'
    : 'https://api.transak.com/partners/api/v2/refresh-token';
}

export function transakGateway(): string {
  return transakStaging()
    ? 'https://api-gateway-stg.transak.com'
    : 'https://api-gateway.transak.com';
}

export function requestClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  const raw = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip')?.trim();
  if (!raw || raw === '0.0.0.0' || raw === '::' || raw === '::1' || raw === '127.0.0.1') {
    return undefined;
  }
  return raw;
}
