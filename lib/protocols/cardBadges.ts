import { base, arbitrum, mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';

export interface CardBadges {
  risk: { emoji: string; label: string };
  battle: { emoji: string; label: string };
  fee: { emoji: string; label: string };
}

type RiskLevel = 'lower' | 'medium' | 'higher';

const RISK_BADGE: Record<RiskLevel, CardBadges['risk']> = {
  lower: { emoji: '🟢', label: 'Lower risk' },
  medium: { emoji: '🟡', label: 'Medium risk' },
  higher: { emoji: '🔴', label: 'Higher risk' },
};

function cardRiskLevel(opportunity: Opportunity): RiskLevel {
  if (opportunity.protocol === 'convex-cvxcrv' || opportunity.protocol === 'frax-sfrxusd') {
    return 'higher';
  }
  if (
    opportunity.protocol === 'morpho' &&
    opportunity.protocolLabel.toLowerCase().includes('high yield')
  ) {
    return 'higher';
  }
  if (
    opportunity.protocol === 'moonwell' ||
    opportunity.protocol === 'fluid' ||
    (opportunity.protocol === 'morpho' && opportunity.riskTier === 'emerging')
  ) {
    return 'medium';
  }
  if (opportunity.riskTier === 'established') return 'lower';
  return 'medium';
}

/** Map protocol + risk into the three emoji axes shown on collection cards. */
export function getCardBadges(opportunity: Opportunity): CardBadges {
  const risk = RISK_BADGE[cardRiskLevel(opportunity)];

  const battleTested =
    opportunity.protocol === 'aave-v3' ||
    opportunity.protocol === 'compound-v3' ||
    opportunity.protocol === 'lido' ||
    opportunity.protocol === 'curve' ||
    opportunity.protocol === 'spark-susds' ||
    (opportunity.protocol === 'morpho' &&
      !opportunity.protocolLabel.toLowerCase().includes('high yield'));

  const battle = battleTested
    ? { emoji: '🛡️', label: 'Battle-tested' }
    : opportunity.protocol === 'moonwell' || opportunity.protocol === 'fluid'
      ? { emoji: '🧪', label: 'Growing protocol' }
      : { emoji: '⚡', label: 'Newer / layered' };

  const fee =
    opportunity.chainId === base.id || opportunity.chainId === arbitrum.id
      ? { emoji: '⚡', label: 'Low L2 fees' }
      : opportunity.chainId === mainnet.id
        ? { emoji: '⛽', label: 'Higher L1 fees' }
        : { emoji: '🧪', label: 'Testnet fees' };

  return { risk, battle, fee };
}
