import type { Config } from 'wagmi';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const NETWORK_MODE: 'testnet' | 'mainnet' =
  process.env.NEXT_PUBLIC_NETWORK_MODE === 'mainnet' ? 'mainnet' : 'testnet';

// Testnet is the default on purpose — see README "Safety defaults". Flipping
// to mainnet moves real user funds through real protocol contracts.
const mainnetChains = [mainnet, base, arbitrum] as const;
const testnetChains = [sepolia, baseSepolia, arbitrumSepolia] as const;

export const chains = NETWORK_MODE === 'mainnet' ? mainnetChains : testnetChains;

export type SupportedChainId = (typeof chains)[number]['id'];

/**
 * Wallet layer is Reown AppKit (formerly WalletConnect Web3Modal) on top of
 * wagmi — chosen over Privy purely on cost (AppKit's email/social/passkey
 * embedded wallets are free; Privy was ~$300/mo). It reuses the WalletConnect
 * project ID we already depend on and stays non-custodial (embedded wallets
 * are user-controlled). All app code keeps using plain wagmi hooks.
 *
 * getWagmiConfig() is a lazy singleton for the SAME load-bearing reason the
 * old RainbowKit getDefaultConfig() was: `new WagmiAdapter(...)` /
 * `createAppKit(...)` construct wallet connectors that touch browser-only APIs
 * (indexedDB, WebSocket) at call time, which crashes Next's Node-side static
 * page-data collection if it runs at module-import time. So the AppKit libs
 * are `require`d lazily inside this function, and it must ONLY be called from
 * browser code — inside app/providers.tsx (loaded via dynamic(ssr:false)) or a
 * client event handler. Never call it at module scope, and never import
 * @reown/appkit* at the top level of a module some page statically imports.
 *
 * createAppKit also registers AppKit's modal + <appkit-button> web components
 * as a side effect; guarding on the singleton keeps that to exactly once.
 */
let _wagmiConfig: Config | undefined;

export function getWagmiConfig(): Config {
  if (_wagmiConfig) return _wagmiConfig;

  // Lazy requires — see the SSR note above.
  const { WagmiAdapter } = require('@reown/appkit-adapter-wagmi');
  const { createAppKit } = require('@reown/appkit');
  const appkitNetworks = require('@reown/appkit/networks');

  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'openhand-dev-placeholder';

  const networks =
    NETWORK_MODE === 'mainnet'
      ? [appkitNetworks.mainnet, appkitNetworks.base, appkitNetworks.arbitrum]
      : [appkitNetworks.sepolia, appkitNetworks.baseSepolia, appkitNetworks.arbitrumSepolia];

  const rpcOverrides: Partial<Record<number, string>> = {
    [mainnet.id]: process.env.NEXT_PUBLIC_RPC_MAINNET,
    [base.id]: process.env.NEXT_PUBLIC_RPC_BASE,
    [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM,
    [sepolia.id]: process.env.NEXT_PUBLIC_RPC_SEPOLIA,
    [baseSepolia.id]: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA,
    [arbitrumSepolia.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA,
  };
  const transports = Object.fromEntries(
    chains.map((chain) => [chain.id, http(rpcOverrides[chain.id] || undefined)]),
  );

  const adapter = new WagmiAdapter({ networks, projectId, ssr: true, transports });

  createAppKit({
    adapters: [adapter],
    networks,
    projectId,
    metadata: {
      name: 'Openhand',
      description: 'Non-custodial DeFi yield — connect or create a wallet, keep your own keys.',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://openhand.app',
      icons: ['https://openhand.app/icons/icon-192.png'],
    },
    // Email + social + passkey embedded wallets (the Privy replacement) live
    // alongside the 500+ external wallets. All user-custodied.
    features: {
      email: true,
      socials: ['google', 'apple', 'x', 'discord', 'github'],
      emailShowWallets: true,
      analytics: true,
    },
    themeMode: 'dark',
    themeVariables: { '--w3m-accent': '#3ecf8e' },
  });

  _wagmiConfig = adapter.wagmiConfig as Config;
  return _wagmiConfig;
}
