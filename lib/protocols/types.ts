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
  /**
   * 'instant' = withdraw and receive funds in the same transaction.
   * 'delayed' = withdrawal goes through a queue (Lido: typically 1-5 days).
   * Used by the questionnaire filter — never by anything claiming to be
   * financial advice.
   */
  liquidity: 'instant' | 'delayed';
  /**
   * Coarse, honest-best-effort protocol maturity tag — NOT a risk score.
   * 'established' = long mainnet track record, widely audited, deep
   * integration surface (Aave v3, Lido). 'emerging' = newer or more
   * architecturally complex (Yearn v3's strategy composability). This is a
   * loose proxy, not a security audit result — never present it as one.
   */
  riskTier: 'established' | 'emerging';
}
