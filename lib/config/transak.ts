import { arbitrum, base, mainnet } from 'wagmi/chains';
import { SITE_URL } from '@/lib/config/site';

/**
 * Transak on-ramp for CAD / Interac → USDC into the connected wallet.
 * MoonPay's USDC-on-Base listing currently blocks CA, so it is not used.
 * Onramper charges a monthly fee; Transak's partner widget does not.
 *
 * Keys stay server-side. The browser only loads the one-shot widgetUrl
 * returned by POST /api/onramp/widget.
 */

const USDC_NETWORK: Record<number, string> = {
  [mainnet.id]: 'ethereum',
  [base.id]: 'base',
  [arbitrum.id]: 'arbitrum',
};

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
