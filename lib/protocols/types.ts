import type { SupportedChainId } from '@/lib/wagmi';

export type ProtocolId =
  | 'aave-v3'
  | 'lido'
  | 'yearn-v3'
  | 'curve-scrvusd'
  | 'frax-sfrxusd'
  | 'convex-cvxcrv'
  | 'compound-v3'
  | 'morpho'
  | 'fluid'
  | 'moonwell';

/** Coarse risk for card emoji + badge — not a scored recommendation. */
export type RiskLevel = 'lower' | 'medium' | 'higher';

export interface Opportunity {
  id: string;
  protocol: ProtocolId;
  protocolLabel: string;
  chainId: SupportedChainId;
  asset: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
  /** Annualized yield as a decimal, e.g. 0.045 = 4.5% */
  apy: number;
  description: string;
  /** Address the deposit contract call targets (pool, stETH contract, vault, etc). */
  depositTarget: `0x${string}`;
  /** ERC-4626-style share token holding the position, if one exists (aToken, vault shares). */
  positionToken?: `0x${string}`;
  /**
   * Coarse risk tier shown on cards. 'lower' = battle-tested single protocol,
   * 'medium' = curated/layered but established, 'higher' = newer or more complex.
   * Not financial advice — a filter signal only.
   */
  risk: RiskLevel;
  /**
   * If set, the wallet doesn't need to already hold `asset` — the deposit flow can swap
   * from this reference asset into `asset` first (see lib/swap/zeroex.ts).
   */
  convertibleFrom?: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
}

/** Protocols that use plain ERC-4626 deposit(assets)/withdraw(assets). */
export const ERC4626_PROTOCOLS: ProtocolId[] = [
  'yearn-v3',
  'curve-scrvusd',
  'frax-sfrxusd',
  'morpho',
  'fluid',
];
