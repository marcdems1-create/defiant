import { base, arbitrum, mainnet } from 'wagmi/chains';
import type { Opportunity, RiskLevel } from './types';

export interface CardBadges {
  risk: { emoji: string; label: string };
  battle: { emoji: string; label: string };
  fee: { emoji: string; label: string };
}

const RISK_BADGE: Record<RiskLevel, CardBadges['risk']> = {
  lower: { emoji: '🟢', label: 'Lower risk' },
  medium: { emoji: '🟡', label: 'Medium risk' },
  higher: { emoji: '🔴', label: 'Higher risk' },
};

/** Map protocol + risk into the three emoji axes shown on collection cards. */
export function getCardBadges(opportunity: Opportunity): CardBadges {
  const risk = RISK_BADGE[opportunity.risk];

  const battleTested =
    opportunity.protocol === 'aave-v3' ||
    opportunity.protocol === 'compound-v3' ||
    opportunity.protocol === 'lido' ||
    (opportunity.protocol === 'morpho' && opportunity.risk !== 'higher');

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
