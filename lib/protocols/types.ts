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
  | 'moonwell'
  | 'sky'
  | 'maple';

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

/** Share tokens whose underlying value is convertToAssets (vault-style). */
export const CONVERT_TO_ASSETS_PROTOCOLS: ProtocolId[] = [
  ...ERC4626_PROTOCOLS,
  'maple',
];

/** Extra reward tokens that can be claimed, then optionally sold to USDC. */
export function hasTokenEmissions(protocol: ProtocolId): boolean {
  return protocol === 'moonwell' || protocol === 'convex-cvxcrv';
}
