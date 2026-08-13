import type { SupportedChainId } from '@/lib/wagmi';

export type ProtocolId = 'aave-v3' | 'lido' | 'yearn-v3' | 'curve';

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
   * Decimals of `positionToken`, when they differ from `asset.decimals`.
   * Aave's aTokens and Yearn's vault shares mirror the underlying asset's
   * decimals, so this is unset for them. Curve LP shares don't — a
   * crvUSD/USDC pool's LP token is 18 decimals regardless of USDC's 6 —
   * so the withdraw tab (which enters an amount of `positionToken`, not
   * `asset`) needs its own decimals to parse/format correctly. Falls back
   * to `asset.decimals` when unset.
   */
  positionDecimals?: number;
  /** Display label for `positionToken` on the withdraw tab. Falls back to `asset.symbol` when unset. */
  positionSymbol?: string;
  /**
   * Curve-only pool shape needed to call add_liquidity/calc_token_amount
   * (which take a `uint256[numCoins]` amounts array) and remove_liquidity_
   * one_coin/calc_withdraw_one_coin (which take `coinIndex` as `i`) — see
   * `CurvePoolConfig` in lib/config/addresses.ts, which every Curve
   * Opportunity's numbers are copied from.
   */
  curve?: { numCoins: 2 | 3; coinIndex: number };
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
