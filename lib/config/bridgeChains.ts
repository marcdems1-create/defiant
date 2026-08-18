import { arbitrum, base, mainnet } from 'wagmi/chains';
import { AAVE_V3 } from '@/lib/config/addresses';

export interface BridgeChain {
  id: number;
  label: string;
  /** Native Circle USDC — same addresses as AAVE_V3, not USDC.e. */
  usdc: `0x${string}`;
}

/**
 * Chains the in-deposit USDC move can travel between. LI.FI routes (CCTP /
 * Across / …) are mainnet-only — no testnet liquidity — so this is the three
 * mainnet networks the rest of the app already supports.
 *
 * USDC addresses come from AAVE_V3 (verified against bgd-labs/aave-address-book
 * 2026-08-13; see lib/config/addresses.ts). Do not paste a new address here.
 */
export const BRIDGE_CHAINS: BridgeChain[] = [
  { id: mainnet.id, label: 'Ethereum', usdc: AAVE_V3[mainnet.id]!.usdc },
  { id: base.id, label: 'Base', usdc: AAVE_V3[base.id]!.usdc },
  { id: arbitrum.id, label: 'Arbitrum', usdc: AAVE_V3[arbitrum.id]!.usdc },
];

export function bridgeChainById(id: number): BridgeChain | undefined {
  return BRIDGE_CHAINS.find((c) => c.id === id);
}
