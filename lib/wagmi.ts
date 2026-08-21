import { createConfig, http, type Config } from 'wagmi';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';

export const NETWORK_MODE: 'testnet' | 'mainnet' =
  process.env.NEXT_PUBLIC_NETWORK_MODE === 'mainnet' ? 'mainnet' : 'testnet';

// Testnet is the default on purpose — see README "Safety defaults". Flipping
// to mainnet moves real user funds through real protocol contracts.
const mainnetChains = [mainnet, base, arbitrum] as const;
const testnetChains = [sepolia, baseSepolia, arbitrumSepolia] as const;

export const chains = NETWORK_MODE === 'mainnet' ? mainnetChains : testnetChains;

export type SupportedChainId = (typeof chains)[number]['id'];

/**
 * RainbowKit's getDefaultConfig() and Privy's createConfig() both touch
 * browser-only APIs at call time. Calling either at module-import time
 * crashes Next's Node-side static page-data collection for ANY page that
 * transitively imports this file — even client components wrapped in
 * next/dynamic(ssr:false), because Next still has to require() the module
 * graph in Node to collect page metadata.
 *
 * Fix: make it a lazy singleton. Only ever call getWagmiConfig() from code
 * that runs in the browser — inside a component already excluded from SSR
 * (app/providers.tsx, itself loaded via dynamic(ssr:false)) or inside a
 * client event handler (never at module scope).
 *
 * When NEXT_PUBLIC_PRIVY_APP_ID is set, the config comes from @privy-io/wagmi
 * so email/passkey embedded wallets share the same wagmi client as deposits.
 */
let _wagmiConfig: Config | undefined;

export function setWagmiConfig(config: Config) {
  _wagmiConfig = config;
}

export function getWagmiTransports() {
  const rpcOverrides: Partial<Record<number, string>> = {
    [mainnet.id]: process.env.NEXT_PUBLIC_RPC_MAINNET,
    [base.id]: process.env.NEXT_PUBLIC_RPC_BASE,
    [arbitrum.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM,
    [sepolia.id]: process.env.NEXT_PUBLIC_RPC_SEPOLIA,
    [baseSepolia.id]: process.env.NEXT_PUBLIC_RPC_BASE_SEPOLIA,
    [arbitrumSepolia.id]: process.env.NEXT_PUBLIC_RPC_ARBITRUM_SEPOLIA,
  };

  return Object.fromEntries(
    chains.map((chain) => [chain.id, http(rpcOverrides[chain.id] || undefined)]),
  );
}

/**
 * Read-only wagmi config for SSR. No RainbowKit connectors — those touch
 * indexedDB / WebSocket at construct time and crash Node page rendering.
 * Never assign this to `_wagmiConfig`; deposit code must use getWagmiConfig().
 */
let _ssrWagmiConfig: Config | undefined;

export function getSsrWagmiConfig(): Config {
  if (_ssrWagmiConfig) return _ssrWagmiConfig;
  const chainTuple = chains as unknown as readonly [
    (typeof chains)[number],
    ...(typeof chains)[number][],
  ];
  _ssrWagmiConfig = createConfig({
    chains: chainTuple,
    transports: getWagmiTransports() as never,
    ssr: true,
  });
  return _ssrWagmiConfig;
}

export function getWagmiConfig(): Config {
  if (_wagmiConfig) return _wagmiConfig;

  // Lazy require so @rainbow-me/rainbowkit is never pulled into a module
  // that might get require()'d during server-side page-data collection.
  const { getDefaultConfig: buildConfig } = require('@rainbow-me/rainbowkit');
  const chainTuple = chains as unknown as readonly [
    (typeof chains)[number],
    ...(typeof chains)[number][],
  ];
  const config = buildConfig({
    appName: 'Openhand',
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'openhand-dev-placeholder',
    chains: chainTuple,
    transports: getWagmiTransports(),
    ssr: true,
  }) as Config;
  _wagmiConfig = config;
  return config;
}
