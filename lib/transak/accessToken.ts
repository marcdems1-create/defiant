import {
  transakApiKey,
  transakApiSecret,
  transakRefreshUrl,
} from '@/lib/config/transak';

/**
 * Partner access token for Transak's Create Widget URL API.
 * Minted from TRANSAK_API_SECRET, valid ~7 days. Refreshing invalidates
 * the previous token — cache it, do not mint on every widget open.
 *
 * In-memory only (Vercel instance). Not written to Postgres.
 */

type CachedToken = { token: string; expiresAtMs: number };

let cached: CachedToken | null = null;
let inflight: Promise<string> | null = null;

export function invalidateTransakAccessToken() {
  cached = null;
}

export async function getTransakAccessToken(userIp?: string): Promise<string> {
  const now = Date.now();
  const hourMs = 60 * 60 * 1000;
  if (cached && cached.expiresAtMs - hourMs > now) return cached.token;
  if (inflight) return inflight;
  inflight = refreshTransakAccessToken(userIp).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function refreshTransakAccessToken(userIp?: string): Promise<string> {
  const apiKey = transakApiKey();
  const apiSecret = transakApiSecret();
  if (!apiKey || !apiSecret) {
    throw new Error('Transak is not configured');
  }

  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-secret': apiSecret,
    'x-api-key': apiKey,
  };
  if (userIp) headers['x-user-ip'] = userIp;

  const res = await fetch(transakRefreshUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ apiKey }),
  });

  let json: {
    data?: { accessToken?: string; expiresAt?: number };
    error?: { message?: string } | string;
    message?: string;
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    throw new Error('Transak token failed');
  }

  const token = json.data?.accessToken;
  if (!res.ok || !token) {
    throw new Error(transakErrorMessage(json) || 'Transak token failed');
  }

  const rawExpiry = json.data?.expiresAt;
  const expiresAtMs =
    typeof rawExpiry === 'number' && rawExpiry > 1e12 ? rawExpiry : (rawExpiry ?? 0) * 1000;

  cached = {
    token,
    expiresAtMs: expiresAtMs || Date.now() + 6 * 24 * 60 * 60 * 1000,
  };
  return token;
}

export function transakErrorMessage(json: {
  error?: { message?: string } | string;
  message?: string;
}): string | undefined {
  const nested = typeof json.error === 'object' ? json.error?.message : json.error;
  return nested || json.message;
}
