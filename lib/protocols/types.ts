import type { SupportedChainId } from '@/lib/wagmi';

export type ProtocolId = 'aave-v3' | 'lido' | 'yearn-v3';

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
}
