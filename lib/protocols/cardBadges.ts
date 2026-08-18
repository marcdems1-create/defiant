import { base, arbitrum, mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';

export interface CardBadge {
  emoji?: string;
  label: string;
  hint: string;
}

export interface CardBadges {
  risk: CardBadge;
  battle: CardBadge;
  fee: CardBadge;
  liquidity: CardBadge;
}

export type CardRiskLevel = 'lower' | 'medium' | 'higher';

const RISK_BADGE: Record<CardRiskLevel, CardBadge> = {
  lower: {
    emoji: '🟢',
    label: 'Lower risk',
    hint: 'Longer-running protocol and a simpler design. Still not risk-free — smart contracts can fail and you can lose capital.',
  },
  medium: {
    emoji: '🟡',
    label: 'Medium risk',
    hint: 'Newer or more complex than the largest markets. Yield moves with usage; capital is at risk.',
  },
  higher: {
    emoji: '🔴',
    label: 'Higher risk',
    hint: 'More moving parts or a shorter track record. Higher yield usually means higher risk of loss.',
  },
};

/** Same axis as the card badge — used by browse filters, not a suitability score. */
export function getCardRiskLevel(opportunity: Opportunity): CardRiskLevel {
  if (
    opportunity.protocol === 'convex-cvxcrv' ||
    opportunity.protocol === 'frax-sfrxusd' ||
    opportunity.protocol === 'maple' ||
    (opportunity.protocol === 'panoptic' && opportunity.panoptic?.vault !== 'plp-weth') ||
    (opportunity.protocol === 'pendle' &&
      (opportunity.pendle?.name === 'sUSDe' || opportunity.pendle?.name === 'USDe'))
  ) {
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
    opportunity.protocol === 'pendle' ||
    (opportunity.protocol === 'panoptic' && opportunity.panoptic?.vault === 'plp-weth') ||
    (opportunity.protocol === 'morpho' && opportunity.riskTier === 'emerging')
  ) {
    return 'medium';
  }
  if (opportunity.riskTier === 'established') return 'lower';
  return 'medium';
}

/** Map protocol + risk into the axes shown on collection cards. */
export function getCardBadges(opportunity: Opportunity): CardBadges {
  const risk = RISK_BADGE[getCardRiskLevel(opportunity)];

  const battleTested =
    opportunity.protocol === 'aave-v3' ||
    opportunity.protocol === 'compound-v3' ||
    opportunity.protocol === 'lido' ||
    opportunity.protocol === 'curve' ||
    opportunity.protocol === 'sky' ||
    opportunity.protocol === 'pendle' ||
    (opportunity.protocol === 'morpho' &&
      !opportunity.protocolLabel.toLowerCase().includes('high yield'));

  const battle: CardBadge = battleTested
    ? {
        emoji: '🛡️',
        label: 'Battle-tested',
        hint: 'This protocol has been live for years and is widely used. A long track record is not a guarantee — audits do not remove smart-contract risk.',
      }
    : opportunity.protocol === 'moonwell' || opportunity.protocol === 'fluid'
      ? {
          emoji: '🧪',
          label: 'Growing protocol',
          hint: 'Live and used on this chain, with a shorter history than the largest lending markets.',
        }
      : {
          emoji: '⚡',
          label: 'Newer / layered',
          hint: 'Newer stack, or yield that sits on top of another protocol. Extra contracts mean extra things that can fail.',
        };

  const fee: CardBadge =
    opportunity.chainId === base.id || opportunity.chainId === arbitrum.id
      ? {
          emoji: '⚡',
          label: 'Lower fees',
          hint: 'This network is usually cheap to transact on. You still pay gas from your own wallet.',
        }
      : opportunity.chainId === mainnet.id
        ? {
            emoji: '⛽',
            label: 'Higher fees',
            hint: 'Ethereum gas can be expensive. Size deposits so the network fee is not a large cut of what you put in.',
          }
        : {
            emoji: '🧪',
            label: 'Testnet fees',
            hint: 'Practice network. Gas here is not real dollars.',
          };

  const liquidity: CardBadge =
    opportunity.protocol === 'pendle'
      ? {
          label: 'Fixed to maturity',
          hint: 'Implied APY assumes you hold PT until expiry. Selling early is a Pendle AMM swap with slippage, not a 1:1 redeem.',
        }
      : opportunity.liquidity === 'delayed'
        ? {
            label: 'Delayed exit',
            hint: 'Withdrawals wait in a queue — Lido is typically a few days then a claim; Maple sends USDC when the FIFO queue processes (hours to days, up to 30 days documented).',
          }
        : {
            label: 'Instant exit',
            hint: 'You can withdraw in one transaction, if the pool has enough liquidity.',
          };

  return { risk, battle, fee, liquidity };
}

export const COMPOUNDED_BADGE: CardBadge = {
  emoji: '🔁',
  label: 'Compounded',
  hint: 'This rate is compounded APY, not simple APR. Interest accrues into the receipt automatically.',
};
