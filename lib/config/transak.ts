import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { SITE_URL } from '@/lib/config/site';

/**
 * Transak on-ramp for CAD / Interac → USDC into the connected wallet.
 * Uses Widget with API Customization (Create Widget URL), not Whitelabel.
 * https://docs.transak.com/guides/widget-with-api-customization
 *
 * Mandatory partner security (https://docs.transak.com/guides/mandatory-security-changes):
 * backend-only session, x-api-key, x-user-ip, CORS/origin lock on our BFF,
 * referrerDomain owned by us (allowlisted host, never a raw Referer copy).
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
]);

export function transakNetwork(chainId: number): string | undefined {
  return USDC_NETWORK[chainId];
}

export function transakReferrerDomain(): string {
  try {
    return new URL(SITE_URL).hostname;
  } catch {
    return 'www.openhand.online';
  }
}

/**
 * Domain Transak pins the widget session to. Only allowlisted Origin hosts —
 * never a raw Referer URL (Transak: substitute with a value the backend owns).
 */
export function transakReferrerDomainFromRequest(request: Request): string {
  const origin = parseAllowedOrigin(request);
  if (origin) {
    try {
      const host = new URL(origin).hostname;
      if (REFERRER_ALLOWLIST.has(host)) return host;
    } catch {
      /* fall through */
    }
  }
  const fallback = transakReferrerDomain();
  return REFERRER_ALLOWLIST.has(fallback) ? fallback : 'www.openhand.online';
}

/** Browser Origin for our widget BFF, or undefined if missing/not allowlisted. */
export function parseAllowedOrigin(request: Request): string | undefined {
  const origin = request.headers.get('origin')?.trim();
  if (!origin) return undefined;
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    if (url.username || url.password) return undefined;
    if (!REFERRER_ALLOWLIST.has(url.hostname)) return undefined;
    if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && url.protocol !== 'https:') {
      return undefined;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return undefined;
  }
}

export function corsHeadersForOrigin(origin: string | undefined): Record<string, string> {
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function transakApiKey(): string | undefined {
  return process.env.TRANSAK_API_KEY?.trim() || undefined;
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

function looksLikeIp(ip: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
    return ip.split('.').every((octet) => {
      const n = Number(octet);
      return Number.isInteger(n) && n >= 0 && n <= 255;
    });
  }
  return ip.includes(':') && /^[0-9a-fA-F:.]+$/.test(ip) && ip.length <= 45;
}

function isLoopbackIp(ip: string): boolean {
  return ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0' || ip === '::';
}

function isPrivateV4(ip: string): boolean {
  if (!/^\d/.test(ip)) return false;
  const [a, b] = ip.split('.').map(Number);
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function headerIps(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').map((part) => part.trim().replace(/^\[/, '').replace(/\]$/, ''));
}

/**
 * End-user IP for Transak `x-user-ip` (required). Prefer CDN client headers,
 * skip private/proxy hops. Loopback is only returned in staging.
 */
export function requestClientIp(request: Request): string | undefined {
  const groups = [
    headerIps(request.headers.get('cf-connecting-ip')),
    headerIps(request.headers.get('x-vercel-forwarded-for')),
    headerIps(request.headers.get('x-real-ip')),
    headerIps(request.headers.get('x-forwarded-for')),
  ];

  for (const ips of groups) {
    for (const ip of ips) {
      if (looksLikeIp(ip) && !isLoopbackIp(ip) && !isPrivateV4(ip)) return ip;
    }
  }

  if (transakStaging()) {
    for (const ips of groups) {
      for (const ip of ips) {
        if (looksLikeIp(ip)) return ip;
      }
    }
  }

  return undefined;
}
