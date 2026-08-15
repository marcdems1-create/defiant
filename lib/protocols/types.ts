import type { SupportedChainId } from '@/lib/wagmi';

export type ProtocolId =
  | 'aave-v3'
  | 'lido'
  | 'yearn-v3'
  | 'curve'
  | 'frax-sfrxusd'
  | 'convex-cvxcrv'
  | 'compound-v3'
  | 'morpho'
  | 'fluid'
  | 'moonwell';

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
  /** True when `apy` is compounded (APY), not a simple annualized rate (APR). */
  apyCompounded?: boolean;
  description: string;
  depositTarget: `0x${string}`;
  positionToken?: `0x${string}`;
  positionDecimals?: number;
  positionSymbol?: string;
  curve?: { numCoins: 2 | 3; coinIndex: number };
  liquidity: 'instant' | 'delayed';
  riskTier: 'established' | 'emerging';
  convertibleFrom?: {
    address: `0x${string}`;
    symbol: string;
    decimals: number;
  };
}

/** Protocols that use plain ERC-4626 deposit(assets)/withdraw(assets). */
export const ERC4626_PROTOCOLS: ProtocolId[] = [
  'yearn-v3',
  'frax-sfrxusd',
  'morpho',
  'fluid',
];
