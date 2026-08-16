import { arbitrum, arbitrumSepolia, base, baseSepolia } from 'wagmi/chains';
import { NETWORK_MODE } from '@/lib/wagmi';

export function onramperApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_ONRAMPER_API_KEY?.trim();
  return key || undefined;
}

export function onramperNetworkId(chainId: number): string {
  if (chainId === base.id || chainId === baseSepolia.id) return 'base';
  if (chainId === arbitrum.id || chainId === arbitrumSepolia.id) return 'arbitrum';
  return 'ethereum';
}

/** Onramper sells live assets. Do not open it while the app is in testnet mode. */
export function onrampAvailable(): boolean {
  return NETWORK_MODE === 'mainnet' && Boolean(onramperApiKey());
}

export function onramperWidgetSrc(address: `0x${string}`, chainId: number): string | undefined {
  const apiKey = onramperApiKey();
  if (!apiKey || NETWORK_MODE !== 'mainnet') return undefined;
  const network = onramperNetworkId(chainId);
  const params = new URLSearchParams({
    apiKey,
    mode: 'buy',
    defaultFiat: 'USD',
    defaultCrypto: 'usdc',
    onlyCryptos: 'usdc',
    onlyCryptoNetworks: network,
    networkWallets: `${network}:${address}`,
    redirectAtCheckout: 'false',
  });
  return `https://buy.onramper.com?${params.toString()}`;
}
