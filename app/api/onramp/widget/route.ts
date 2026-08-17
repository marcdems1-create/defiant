import { NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { NETWORK_MODE } from '@/lib/wagmi';
import {
  requestClientIp,
  transakApiKey,
  transakConfigured,
  transakGateway,
  transakNetwork,
  transakReferrerDomainFromRequest,
  transakStaging,
} from '@/lib/config/transak';
import {
  getTransakAccessToken,
  invalidateTransakAccessToken,
  transakErrorMessage,
} from '@/lib/transak/accessToken';

export const dynamic = 'force-dynamic';

/**
 * Creates a one-shot Transak widget URL locked to the connected wallet.
 * Funds go to that address — Openhand never receives them.
 *
 * Transak is the onramp for Canadian no-coiners (CAD / Interac). MoonPay's
 * USDC-on-Base listing currently blocks CA, so it is not used here.
 *
 * Widget URLs expire in ~5 minutes and are single-use. The modal fetches a
 * fresh session on every open.
 */
export async function POST(request: Request) {
  const staging = transakStaging();
  if (!transakConfigured() || (NETWORK_MODE !== 'mainnet' && !staging)) {
    return NextResponse.json({ error: 'Onramp is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const address = typeof record.address === 'string' ? record.address : '';
  const chainId = typeof record.chainId === 'number' ? record.chainId : NaN;
  const network = transakNetwork(chainId);
  if (!isAddress(address) || !network) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const apiKey = transakApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'Onramp is not configured' }, { status: 503 });
  }

  const userIp = requestClientIp(request);

  try {
    const url = await createWidgetSession({
      apiKey,
      address,
      network,
      userIp,
      referrerDomain: transakReferrerDomainFromRequest(request),
    });
    return NextResponse.json({ url, staging });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transak unreachable';
    const status = message === 'Onramp is not configured' ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

async function createWidgetSession({
  apiKey,
  address,
  network,
  userIp,
  referrerDomain,
}: {
  apiKey: string;
  address: string;
  network: string;
  userIp?: string;
  referrerDomain: string;
}): Promise<string> {
  const first = await postSession({ apiKey, address, network, userIp, referrerDomain });
  if (first.ok && first.url) return first.url;
  if (first.status === 401) {
    invalidateTransakAccessToken();
    const retry = await postSession({ apiKey, address, network, userIp, referrerDomain });
    if (retry.ok && retry.url) return retry.url;
    throw new Error(retry.message || 'Transak session failed');
  }
  throw new Error(first.message || 'Transak session failed');
}

async function postSession({
  apiKey,
  address,
  network,
  userIp,
  referrerDomain,
}: {
  apiKey: string;
  address: string;
  network: string;
  userIp?: string;
  referrerDomain: string;
}): Promise<{ ok: boolean; status: number; url?: string; message?: string }> {
  const accessToken = await getTransakAccessToken(userIp);
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
    'access-token': accessToken,
    'x-api-key': apiKey,
  };
  if (userIp) headers['x-user-ip'] = userIp;

  let res: Response;
  try {
    res = await fetch(`${transakGateway()}/api/v2/auth/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        widgetParams: {
          apiKey,
          referrerDomain,
          productsAvailed: 'BUY',
          cryptoCurrencyCode: 'USDC',
          network,
          walletAddress: address,
          disableWalletAddressForm: true,
          defaultFiatCurrency: 'CAD',
          countryCode: 'CA',
          colorMode: 'DARK',
          themeColor: '3ecf8e',
          exchangeScreenTitle: 'Buy USDC',
        },
      }),
    });
  } catch {
    return { ok: false, status: 0, message: 'Transak unreachable' };
  }

  let json: {
    data?: { widgetUrl?: string };
    error?: { message?: string } | string;
    message?: string;
  } = {};
  try {
    json = (await res.json()) as typeof json;
  } catch {
    return { ok: false, status: res.status, message: 'Transak session failed' };
  }

  const url = json.data?.widgetUrl;
  if (!res.ok || !url || !url.startsWith('https://')) {
    return {
      ok: false,
      status: res.status,
      message: transakErrorMessage(json) || 'Transak session failed',
    };
  }
  return { ok: true, status: res.status, url };
}
