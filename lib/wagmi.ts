import type { getDefaultConfig } from '@rainbow-me/rainbowkit';
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
 * RainbowKit's getDefaultConfig() eagerly constructs every default connector
 * (WalletConnect, MetaMask SDK, Coinbase Smart Wallet…), which touches
 * browser-only APIs (indexedDB, WebSocket) at call time. Calling it at
 * module-import time crashes Next's Node-side static page-data collection
 * for ANY page that transitively imports this file — even client components
 * wrapped in next/dynamic(ssr:false), because Next still has to require()
 * the module graph in Node to collect page metadata.
 *
 * Fix: make it a lazy singleton. Only ever call getWagmiConfig() from code
 * that runs in the browser — inside a component already excluded from SSR
 * (app/providers.tsx, itself loaded via dynamic(ssr:false)) or inside a
 * client event handler (never at module scope).
 */
let _wagmiConfig: ReturnType<typeof getDefaultConfig> | undefined;

export function getWagmiConfig() {
  if (_wagmiConfig) return _wagmiConfig;

  // Lazy require so @rainbow-me/rainbowkit is never pulled into a module
  // that might get require()'d during server-side page-data collection.
  const { getDefaultConfig: buildConfig } = require('@rainbow-me/rainbowkit');

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

  _wagmiConfig = buildConfig({
    appName: 'Defiant',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'defiant-dev-placeholder',
    chains: chains as unknown as readonly [(typeof chains)[number], ...(typeof chains)[number][]],
    transports,
    ssr: true,
  });

  return _wagmiConfig!;
}
