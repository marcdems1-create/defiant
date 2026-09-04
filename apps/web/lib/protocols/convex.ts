import { createPublicClient, http } from 'viem';
import { mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';
import { CONVEX, AAVE_V3 } from '@/lib/config/addresses';
import { cvxCrvRewardsAbi } from '@/lib/abi/convex';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

/**
 * Convex's "convert CRV, stake cvxCRV" flow — NOT an ERC-4626 vault, unlike Yearn/Frax/
 * Curve above. Depositing CRV via the CRV Depositor is a one-way conversion to cvxCRV
 * (Convex's own docs: "this process is irreversible, you will not be able to convert
 * cvxCRV to CRV using the platform") which then earns CRV + CVX + crvUSD rewards while
 * staked in the cvxCRV Rewards pool. Position balance is read from the rewards pool, not
 * a share token — see components/DepositWithdrawModal.tsx for the two-call deposit
 * (CrvDepositor.deposit with a stake address) and single-call unstake (cvxCrvRewards.
 * withdraw) flow. Mainnet only; Convex does not deploy to testnets.
 */
export async function fetchConvexOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = (CONVEX as Record<number, (typeof CONVEX)[typeof mainnet.id]>)[chainId];
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !chain) return [];

  // Confirm the rewards pool contract actually exists / responds before listing this —
  // consistent with never showing an opportunity we haven't confirmed is live.
  const client = createPublicClient({ chain, transport: http() });
  try {
    await client.readContract({
      address: cfg.cvxCrvRewards,
      abi: cvxCrvRewardsAbi,
      functionName: 'balanceOf',
      args: ['0x0000000000000000000000000000000000000000'],
    });
  } catch {
    return [];
  }

  const apy = await findDefiLlamaApy('convex-finance', 'Ethereum', (s) => s.includes('CVXCRV'));
  if (apy === null) return [];

  const usdc = AAVE_V3[mainnet.id]?.usdc;

  return [
    {
      id: `convex-cvxcrv-${chainId}`,
      protocol: 'convex-cvxcrv',
      protocolLabel: 'Convex (cvxCRV)',
      chainId,
      asset: {
        address: cfg.crv,
        symbol: 'CRV',
        decimals: 18,
      },
      apy,
      description:
        'Convert CRV to cvxCRV and stake it in one transaction, earning a share of Convex\'s boosted Curve rewards (CRV, CVX, and crvUSD). This conversion is one-way — cvxCRV cannot be converted back to CRV, only traded or unstaked as cvxCRV.',
      depositTarget: cfg.crvDepositor,
      positionToken: cfg.cvxCrvRewards,
      liquidity: 'instant',
      riskTier: 'emerging',
      convertibleFrom: usdc ? { address: usdc, symbol: 'USDC', decimals: 6 } : undefined,
    },
  ];
}
