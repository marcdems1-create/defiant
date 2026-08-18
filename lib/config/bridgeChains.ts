import { arbitrum, base, mainnet } from 'wagmi/chains';

export interface BridgeChain {
  id: number;
  label: string;
  /** Native (Circle-issued) USDC on this chain. */
  usdc: `0x${string}`;
}

/**
 * Chains the cross-chain USDC router moves between. LI.FI (and the underlying
 * CCTP/Across routes) are mainnet-only — there is no real testnet bridge
 * liquidity — so this is intentionally the three mainnet networks the rest of
 * the app already supports. In testnet mode the /bridge surface shows a "switch
 * to mainnet mode" state instead, exactly like /swap.
 *
 * Every USDC address below is native Circle USDC and matches the address already
 * verified on-chain in lib/config/addresses.ts (AAVE_V3) and
 * lib/config/swapTokens.ts — NOT bridged USDC.e.
 */
export const BRIDGE_CHAINS: BridgeChain[] = [
  { id: mainnet.id, label: 'Ethereum', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: base.id, label: 'Base', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { id: arbitrum.id, label: 'Arbitrum', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
];

export function bridgeChainById(id: number): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.id === id);
}

/** USDC address for a chain, if that chain is in the bridge set. */
export function usdcAddressForChain(id: number): `0x${string}` | undefined {
  return bridgeChainById(id)?.usdc;
}
