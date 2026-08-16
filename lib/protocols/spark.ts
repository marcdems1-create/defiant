import type { Opportunity } from './types';
import { SPARK_PSM } from '@/lib/config/addresses';
import type { SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

/**
 * Sky Savings (sUSDS) via the Spark PSM. Deposit token is USDC; the app swaps
 * it to sUSDS through the PSM (single tx, no slippage/fees beyond gas) and the
 * position accrues the Sky Savings Rate. Redeemable back to USDC through the
 * same PSM anytime — see components/DepositWithdrawModal.tsx.
 *
 * The Sky Savings Rate is a single governance-set rate that's identical on
 * every chain, so the APY is sourced once from DeFiLlama's `sky-lending`
 * SUSDS pool (present on Ethereum) rather than per-chain. Defensive: if the
 * rate can't be read, skip rather than guess.
 */
export async function fetchSparkOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = SPARK_PSM[chainId];
  if (!cfg) return [];

  const apy = await findDefiLlamaApy('sky-lending', 'Ethereum', (s) => s === 'SUSDS');
  if (apy === null) return [];

  return [
    {
      id: `spark-susds-${chainId}`,
      protocol: 'spark-susds',
      protocolLabel: 'Sky Savings (sUSDS)',
      chainId,
      asset: { address: cfg.usdc, symbol: 'USDC', decimals: 6 },
      apy,
      description:
        'Deposit USDC and Openhand swaps it into sUSDS through the Spark PSM — one transaction, no slippage or fees beyond gas. sUSDS earns the Sky Savings Rate and grows in value automatically; withdraw back to USDC anytime through the same PSM. Sky (formerly MakerDAO/DAI) is one of DeFi\u2019s longest-running, most battle-tested protocols.',
      depositTarget: cfg.psm,
      positionToken: cfg.susds,
      positionDecimals: 18,
      positionSymbol: 'sUSDS',
      liquidity: 'instant',
      riskTier: 'established',
    },
  ];
}
