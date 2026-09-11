import type { Address } from 'viem';

/**
 * Chain IDs used below (no wagmi dependency in this package — these are just
 * the standard EVM chain IDs `wagmi/chains`' `mainnet`/`base`/`arbitrum`/
 * `sepolia`/`baseSepolia`/`arbitrumSepolia`.id values resolve to).
 */
export const CHAIN_ID = {
  mainnet: 1,
  base: 8453,
  arbitrum: 42161,
  sepolia: 11155111,
  baseSepolia: 84532,
  arbitrumSepolia: 421614,
} as const;

/**
 * USDC per chain — copied from the `usdc` field already embedded in
 * apps/web/lib/config/addresses.ts's `AAVE_V3` table (bgd-labs/aave-address-book,
 * verified 2026-08-13; Arbitrum is native Circle-issued USDC, not bridged
 * USDC.e). Given its own top-level export here since packages/core doesn't
 * pull in Aave's full config (Aave stays a one-off adapter, not extracted in
 * this batch) — same address values, not re-derived or re-verified.
 */
export const USDC: Partial<Record<number, Address>> = {
  [CHAIN_ID.mainnet]: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  [CHAIN_ID.base]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [CHAIN_ID.arbitrum]: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  [CHAIN_ID.sepolia]: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  [CHAIN_ID.baseSepolia]: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
  [CHAIN_ID.arbitrumSepolia]: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
};

export interface MorphoVaultConfig {
  id: string;
  label: string;
  vault: Address;
  defiLlamaSymbol: string;
}

/**
 * Morpho MetaMorpho USDC vaults — api.morpho.org GraphQL (listed vaults,
 * 2026-08-13). Moved verbatim from apps/web/lib/config/addresses.ts as part
 * of the Phase 2 ERC4626 adapter extraction — same addresses, not re-verified.
 */
export const MORPHO: Partial<Record<number, MorphoVaultConfig[]>> = {
  [CHAIN_ID.base]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0xee8f4ec5672f09119b96ab6fb59c27e1b7e44b61',
      defiLlamaSymbol: 'GTUSDCP',
    },
    {
      id: 'steakhouse-usdc',
      label: 'Steakhouse USDC',
      vault: '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183',
      defiLlamaSymbol: 'STEAKUSDC',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0xBEEFA7B88064FeEF0cEe02AAeBBd95D30df3878F',
      defiLlamaSymbol: 'SIRLOINUSDC',
    },
  ],
  [CHAIN_ID.arbitrum]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0x7c574174DA4b2be3f705c6244B4BfA0815a8B3Ed',
      defiLlamaSymbol: 'GTUSDCP',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0x5c0C306Aaa9F877de636f4d5822cA9F2E81563BA',
      defiLlamaSymbol: 'BBQUSDC',
    },
  ],
};

/**
 * Fluid fUSDC — yield.xyz Fluid docs (2026-08-13). Moved verbatim from
 * apps/web/lib/config/addresses.ts as part of the Phase 2 ERC4626 adapter
 * extraction — same addresses, not re-verified.
 */
export const FLUID: Partial<Record<number, { fUSDC: Address }>> = {
  [CHAIN_ID.base]: { fUSDC: '0xf42f5795d9ac7e9d757db633d693cd548cfd9169' },
  [CHAIN_ID.arbitrum]: { fUSDC: '0x1A996cb54bb95462040408C06122D45D6Cdb6096' },
};
