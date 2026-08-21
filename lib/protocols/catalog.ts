import { chains, type SupportedChainId } from '@/lib/wagmi';
import {
  AAVE_V3,
  COMPOUND_V3,
  CONVEX,
  CURVE,
  FLUID,
  FRAX,
  LIDO,
  MAPLE,
  MOONWELL,
  MORPHO,
  PANOPTIC,
  SPARK_PSM,
} from '@/lib/config/addresses';
import type { Opportunity, ProtocolId } from './types';

/**
 * Static yield-card inventory for SEO (sitemap, metadata, SSR copy).
 * IDs match the live adapters. APY is never stored here — live rates still
 * come from protocol APIs and are omitted rather than guessed.
 */
export interface CatalogEntry {
  id: string;
  protocol: ProtocolId;
  protocolLabel: string;
  chainId: SupportedChainId;
  assetSymbol: string;
  description: string;
  liquidity: Opportunity['liquidity'];
  riskTier: Opportunity['riskTier'];
  apyCompounded?: boolean;
  curve?: Opportunity['curve'];
}

function chainNameOf(chainId: SupportedChainId): string {
  return chains.find((c) => c.id === chainId)?.name ?? `Chain ${chainId}`;
}

function buildCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];

  for (const chain of chains) {
    const chainId = chain.id as SupportedChainId;
    const name = chainNameOf(chainId);

    if (AAVE_V3[chainId]) {
      out.push({
        id: `aave-v3-${chainId}-usdc`,
        protocol: 'aave-v3',
        protocolLabel: 'Aave v3',
        chainId,
        assetSymbol: 'USDC',
        description: `Supply USDC to Aave v3 on ${name} and earn variable interest paid by borrowers. Withdraw anytime, subject to available pool liquidity.`,
        liquidity: 'instant',
        riskTier: 'established',
      });
    }

    if ((LIDO as Record<number, unknown>)[chainId]) {
      out.push({
        id: `lido-${chainId}-steth`,
        protocol: 'lido',
        protocolLabel: 'Lido',
        chainId,
        assetSymbol: 'ETH',
        description:
          'Stake ETH with Lido and receive stETH, which accrues staking rewards daily via rebase. Withdrawals go through a request queue and typically take 1-5 days to become claimable — not instant.',
        liquidity: 'delayed',
        riskTier: 'established',
      });
    }

    const curvePools = CURVE[chainId];
    if (curvePools) {
      for (const cfg of curvePools) {
        out.push({
          id: `curve-${chainId}-${cfg.id}`,
          protocol: 'curve',
          protocolLabel: 'Curve',
          chainId,
          assetSymbol: 'USDC',
          description: `Provide USDC to Curve's ${cfg.label} stable pool and earn trading fees from swaps between its coins. This is the base LP yield only — it excludes this pool's separate CRV gauge rewards, which require staking the LP token and aren't covered by this app. Withdraw anytime back to USDC, subject to pool liquidity and price impact.`,
          liquidity: 'instant',
          riskTier: 'established',
          curve: { numCoins: cfg.numCoins, coinIndex: cfg.usdcIndex },
        });
      }
    }

    if ((FRAX as Record<number, unknown>)[chainId]) {
      out.push({
        id: `frax-sfrxusd-${chainId}`,
        protocol: 'frax-sfrxusd',
        protocolLabel: 'Frax (sfrxUSD)',
        chainId,
        assetSymbol: 'frxUSD',
        description:
          'Deposit frxUSD into sfrxUSD, an ERC-4626 vault that distributes Frax protocol revenue (RWA/AMO strategy yield) to stakers weekly. Withdraw anytime via redeem.',
        liquidity: 'instant',
        riskTier: 'emerging',
      });
    }

    if ((CONVEX as Record<number, unknown>)[chainId]) {
      out.push({
        id: `convex-cvxcrv-${chainId}`,
        protocol: 'convex-cvxcrv',
        protocolLabel: 'Convex (cvxCRV)',
        chainId,
        assetSymbol: 'CRV',
        description:
          "Convert CRV to cvxCRV and stake it in one transaction, earning a share of Convex's boosted Curve rewards (CRV, CVX, and crvUSD). This conversion is one-way — cvxCRV cannot be converted back to CRV, only traded or unstaked as cvxCRV.",
        liquidity: 'instant',
        riskTier: 'emerging',
      });
    }

    if ((COMPOUND_V3 as Record<number, unknown>)[chainId]) {
      out.push({
        id: `compound-v3-${chainId}`,
        protocol: 'compound-v3',
        protocolLabel: 'Compound V3',
        chainId,
        assetSymbol: 'USDC',
        description:
          'Supply USDC to Compound III (Comet). Earn the floating supply APY; withdraw anytime. Battle-tested lending market on L2.',
        liquidity: 'instant',
        riskTier: 'established',
      });
    }

    const morphoVaults = (MORPHO as Record<
      number,
      readonly { id: string; label: string }[] | undefined
    >)[chainId];
    if (morphoVaults) {
      for (const v of morphoVaults) {
        out.push({
          id: `morpho-${v.id}-${chainId}`,
          protocol: 'morpho',
          protocolLabel: `Morpho · ${v.label}`,
          chainId,
          assetSymbol: 'USDC',
          description: `${v.label} — curated Morpho Blue vault. Deposit USDC, earn borrower interest across allocated markets. ERC-4626 withdraw anytime (subject to market liquidity).`,
          liquidity: 'instant',
          riskTier: v.id.includes('hy') ? 'emerging' : 'established',
        });
      }
    }

    if ((FLUID as Record<number, unknown>)[chainId]) {
      out.push({
        id: `fluid-usdc-${chainId}`,
        protocol: 'fluid',
        protocolLabel: 'Fluid USDC',
        chainId,
        assetSymbol: 'USDC',
        description:
          'Deposit USDC into Fluid (Instadapp) fUSDC — unified liquidity layer earning lending yield. ERC-4626 redeem anytime subject to liquidity.',
        liquidity: 'instant',
        riskTier: 'emerging',
      });
    }

    if ((MOONWELL as Record<number, unknown>)[chainId]) {
      out.push({
        id: `moonwell-usdc-${chainId}`,
        protocol: 'moonwell',
        protocolLabel: 'Moonwell USDC',
        chainId,
        assetSymbol: 'USDC',
        description:
          'Supply USDC to Moonwell on Base (mUSDC). The rate shown is compounded Base APY (borrower interest auto-compounds into mUSDC) — the same figure moonwell.fi labels Supply APY. WELL rewards are a separate claim and are not included. Withdraw underlying anytime.',
        liquidity: 'instant',
        riskTier: 'emerging',
        apyCompounded: true,
      });
    }

    if (SPARK_PSM[chainId]) {
      out.push({
        id: `sky-susds-${chainId}`,
        protocol: 'sky',
        protocolLabel: 'Sky (sUSDS)',
        chainId,
        assetSymbol: 'USDC',
        description:
          "Swap USDC 1:1 into sUSDS through Spark's PSM (no protocol swap fee beyond gas). sUSDS accrues the Sky protocol rate. Swap back to USDC the same way. Not deposit-insured.",
        liquidity: 'instant',
        riskTier: 'established',
        apyCompounded: true,
      });
    }

    if ((MAPLE as Record<number, unknown>)[chainId]) {
      out.push({
        id: `maple-syrupusdc-${chainId}`,
        protocol: 'maple',
        protocolLabel: 'Maple (syrupUSDC)',
        chainId,
        assetSymbol: 'USDC',
        description:
          "Deposit USDC into Maple's syrupUSDC pool (institutional private credit). Withdrawals enter a FIFO queue — often hours to a couple of days, and Maple documents waits of up to 30 days when liquidity is tight. First-time wallets must complete Maple's lender authorization on syrup.fi.",
        liquidity: 'delayed',
        riskTier: 'emerging',
      });
    }

    if ((PANOPTIC as Record<number, unknown>)[chainId]) {
      out.push({
        id: `panoptic-unicorn-${chainId}`,
        protocol: 'panoptic',
        protocolLabel: 'Panoptic (Unicorn USDC)',
        chainId,
        assetSymbol: 'USDC',
        description:
          "Deposit USDC into Panoptic's Unicorn vault, a third-party automated strategy that lends USDC and runs options/volatility trades. Yield is not a money-market rate — you can lose USDC. Withdraw via ERC-4626, subject to vault liquidity.",
        liquidity: 'instant',
        riskTier: 'emerging',
      });
    }
  }

  return out;
}

const CATALOG = buildCatalog();

export function getCatalog(): CatalogEntry[] {
  return CATALOG;
}

export function getCatalogEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((e) => e.id === id);
}

export function catalogFromOpportunity(opportunity: Opportunity): CatalogEntry {
  return {
    id: opportunity.id,
    protocol: opportunity.protocol,
    protocolLabel: opportunity.protocolLabel,
    chainId: opportunity.chainId,
    assetSymbol: opportunity.asset.symbol,
    description: opportunity.description,
    liquidity: opportunity.liquidity,
    riskTier: opportunity.riskTier,
    apyCompounded: opportunity.apyCompounded,
    curve: opportunity.curve,
  };
}

export function opportunityPath(id: string): string {
  return `/opportunities/${id}`;
}
