import type { Opportunity, ProtocolId } from './types';

export interface OpportunityDetailContent {
  howYieldWorks: string;
  risks: string[];
  coolDetail: string;
  docsUrl: string;
  docsLabel: string;
  withdrawalNote?: string;
}

/** Card gradient tints — shared by collection cards and detail hero. */
export const PROTOCOL_TINT: Record<ProtocolId, string> = {
  'aave-v3': 'from-blue-500/20 via-blue-500/5 to-transparent',
  lido: 'from-purple-500/20 via-purple-500/5 to-transparent',
  'yearn-v3': 'from-emerald-500/20 via-emerald-500/5 to-transparent',
  curve: 'from-amber-500/20 via-amber-500/5 to-transparent',
  'frax-sfrxusd': 'from-teal-500/20 via-teal-500/5 to-transparent',
  'convex-cvxcrv': 'from-pink-500/20 via-pink-500/5 to-transparent',
  'compound-v3': 'from-sky-500/20 via-sky-500/5 to-transparent',
  morpho: 'from-cyan-500/20 via-cyan-500/5 to-transparent',
  fluid: 'from-indigo-500/20 via-indigo-500/5 to-transparent',
  moonwell: 'from-lime-500/20 via-lime-500/5 to-transparent',
  sky: 'from-yellow-500/20 via-yellow-500/5 to-transparent',
  maple: 'from-orange-500/20 via-orange-500/5 to-transparent',
  panoptic: 'from-violet-500/20 via-violet-500/5 to-transparent',
  pendle: 'from-fuchsia-500/20 via-fuchsia-500/5 to-transparent',
};

const BASE_DETAILS: Record<ProtocolId, OpportunityDetailContent> = {
  'aave-v3': {
    howYieldWorks:
      'You supply USDC to Aave\'s lending pool. Borrowers pay interest on what they take out, and that interest flows to suppliers like you. Your balance grows automatically as aTokens accrue value — no manual claiming needed.',
    risks: [
      'Smart contract risk — bugs in Aave\'s code could affect funds.',
      'Liquidity risk — if most USDC is borrowed, withdrawals may wait until borrowers repay.',
      'Oracle risk — price feeds determine collateral health; a bad read could cascade.',
      'Market risk — borrower defaults are absorbed by the protocol\'s safety module, but extreme events can still stress the pool.',
    ],
    coolDetail:
      'Aave pioneered the "aToken" model: your receipt token rebases daily, so your wallet balance literally grows without you doing anything. It\'s one of DeFi\'s most copied ideas.',
    docsUrl: 'https://docs.aave.com/',
    docsLabel: 'Aave documentation',
    withdrawalNote: 'Withdraw anytime, subject to available pool liquidity.',
  },
  lido: {
    howYieldWorks:
      'You send ETH to Lido and receive stETH — a liquid staking token that represents your staked ETH plus rewards. Validators earn consensus rewards on-chain, and stETH\'s balance increases daily through a rebase mechanism.',
    risks: [
      'Smart contract risk in Lido\'s staking contracts and node-operator set.',
      'Slashing risk — validator misbehavior can reduce the underlying ETH backing stETH.',
      'Liquidity risk — stETH can trade below ETH in secondary markets during stress.',
      'Withdrawal queue — exits are not instant; you request, wait, then claim.',
    ],
    coolDetail:
      'Lido made staking accessible without running your own validator (32 ETH minimum). stETH is tradable on DEXs, so you can use your staked position elsewhere while it earns.',
    docsUrl: 'https://docs.lido.fi/',
    docsLabel: 'Lido documentation',
    withdrawalNote:
      'Withdrawals use a request queue — typically 1–5 days before ETH is claimable. Not instant.',
  },
  'yearn-v3': {
    howYieldWorks:
      'You deposit USDC into a Yearn v3 vault. Yearn\'s strategists route capital across underlying DeFi venues to chase yield, and vault shares (ERC-4626) represent your claim. The share price rises as strategies earn.',
    risks: [
      'Smart contract risk across Yearn\'s vault and every strategy it uses.',
      'Strategy risk — a failing strategy can drag vault performance or cause losses.',
      'Liquidity risk — withdrawing depends on strategy liquidity being available.',
      'Governance risk — Yearn token holders can change strategy allocations.',
    ],
    coolDetail:
      'Yearn vaults are like yield autopilot: deposit once, and strategists rebalance across lending markets, liquidity pools, and more — work that would take you dozens of transactions.',
    docsUrl: 'https://docs.yearn.fi/',
    docsLabel: 'Yearn documentation',
    withdrawalNote: 'Redeem vault shares anytime via ERC-4626, subject to underlying liquidity.',
  },
  curve: {
    howYieldWorks:
      'You add USDC to a Curve stable pool alongside other stablecoins. Traders swap between coins and pay fees; those fees are distributed to liquidity providers. Your LP token represents your share of the pool.',
    risks: [
      'Smart contract risk in Curve pool contracts.',
      'Impermanent loss / depeg risk — if a pool coin loses its peg, LP value can drop sharply.',
      'Liquidity risk — large withdrawals can face slippage when exiting to a single coin.',
      'The displayed APY is base trading-fee yield only — separate CRV gauge rewards require extra staking steps.',
    ],
    coolDetail:
      'Curve\'s "StableSwap" math lets stablecoin pools handle huge volume with minimal slippage — the reason it became DeFi\'s default stablecoin trading layer.',
    docsUrl: 'https://docs.curve.fi/',
    docsLabel: 'Curve documentation',
    withdrawalNote:
      'Exit to USDC anytime via remove_liquidity_one_coin, subject to pool liquidity and price impact.',
  },
  'frax-sfrxusd': {
    howYieldWorks:
      'You deposit frxUSD into the sfrxUSD vault — an ERC-4626 wrapper that stakes your stablecoin in Frax\'s revenue-generating strategies (RWA and AMO mechanics). Vault shares appreciate as protocol revenue is distributed.',
    risks: [
      'Smart contract risk in Frax vault and underlying strategy contracts.',
      'Strategy / RWA risk — real-world asset and AMO strategies carry credit and market exposure.',
      'Stablecoin risk — frxUSD depends on Frax\'s peg and backing mechanisms.',
      'Newer product line — shorter track record than established lending markets.',
    ],
    coolDetail:
      'sfrxUSD is Frax\'s answer to "yield-bearing stablecoins" — your frxUSD earns a share of protocol revenue without you picking strategies manually.',
    docsUrl: 'https://docs.frax.finance/',
    docsLabel: 'Frax documentation',
    withdrawalNote: 'Redeem vault shares anytime via ERC-4626 redeem.',
  },
  'convex-cvxcrv': {
    howYieldWorks:
      'You convert CRV into cvxCRV and stake it in Convex\'s rewards pool. Convex aggregates Curve voting power and passes boosted CRV, CVX, and crvUSD rewards back to stakers — higher yield than staking CRV alone.',
    risks: [
      'Smart contract risk across Convex depositor and rewards contracts.',
      'One-way conversion — cvxCRV cannot be converted back to CRV through Convex.',
      'Token price risk — CRV and CVX prices are volatile; yield is paid in these tokens.',
      'Complex layered protocol — more moving parts than a simple lending deposit.',
    ],
    coolDetail:
      'Convex cracked the Curve boost game: instead of locking CRV for years yourself, you convert once and ride Convex\'s pooled voting power for outsized rewards.',
    docsUrl: 'https://docs.convexfinance.com/',
    docsLabel: 'Convex documentation',
    withdrawalNote:
      'Unstake returns cvxCRV (not CRV). To exit fully, trade cvxCRV on a DEX or hold.',
  },
  'compound-v3': {
    howYieldWorks:
      'You supply USDC to Compound III (Comet). Borrowers pay a floating rate, and suppliers earn that interest automatically. Your cUSDC balance grows as the supply rate accrues — classic money-market mechanics.',
    risks: [
      'Smart contract risk in Compound\'s Comet contracts.',
      'Liquidity risk — heavy borrowing can limit instant withdrawals.',
      'Oracle risk — collateral pricing drives liquidations and pool health.',
      'Governance risk — COMP holders can adjust parameters via governance.',
    ],
    coolDetail:
      'Compound III simplified the classic Compound model into a single-asset market per chain — cleaner for USDC suppliers and one of DeFi\'s longest-running lending protocols.',
    docsUrl: 'https://docs.compound.finance/',
    docsLabel: 'Compound documentation',
    withdrawalNote: 'Withdraw underlying USDC anytime, subject to pool liquidity.',
  },
  morpho: {
    howYieldWorks:
      'You deposit USDC into a Morpho Blue vault curated by a risk manager. The vault allocates across isolated lending markets; borrowers pay interest, and vault shares (ERC-4626) rise in value as yield accrues.',
    risks: [
      'Smart contract risk in Morpho Blue and vault contracts.',
      'Curator risk — the vault manager chooses which markets to allocate to.',
      'Market isolation risk — a bad market can affect vault performance even if others are fine.',
      'Liquidity risk — withdrawals depend on borrower repayments in allocated markets.',
    ],
    coolDetail:
      'Morpho Blue uses isolated markets — each borrower/lender pair is its own pool. Curators like Steakhouse or Gauntlet pick the mix, so you get professional risk selection without running it yourself.',
    docsUrl: 'https://docs.morpho.org/',
    docsLabel: 'Morpho documentation',
    withdrawalNote: 'Redeem vault shares anytime via ERC-4626, subject to market liquidity.',
  },
  fluid: {
    howYieldWorks:
      'You deposit USDC into Fluid\'s fToken vault (Instadapp). Fluid unifies liquidity across lending venues in a single layer, and your fUSDC shares earn the aggregated supply yield as the share price increases.',
    risks: [
      'Smart contract risk across Fluid vault and routing contracts.',
      'Newer protocol — shorter mainnet history than Aave or Compound.',
      'Liquidity risk — unified liquidity depends on underlying venue depth.',
      'Integration risk — Fluid routes through multiple protocols; more dependencies.',
    ],
    coolDetail:
      'Fluid (by Instadapp) treats liquidity like a shared resource — deposits tap into a unified layer instead of locking into one siloed market.',
    docsUrl: 'https://docs.fluid.instadapp.io/',
    docsLabel: 'Fluid documentation',
    withdrawalNote: 'Redeem fUSDC shares anytime via ERC-4626, subject to liquidity.',
  },
  moonwell: {
    howYieldWorks:
      'You supply USDC to Moonwell on Base and receive mUSDC — a receipt token that grows as borrowers pay interest. The number on this card is compounded Base APY: Moonwell accrues a per-second supply rate, and we convert it the same way their app does — ((rate × 86,400 + 1) ^ 365) − 1 — not a simple APR. Interest compounds into mUSDC automatically. WELL token incentives, if any, must be claimed separately and are not in this number.',
    risks: [
      'Smart contract risk in Moonwell\'s lending contracts.',
      'Liquidity risk — withdrawals depend on available pool liquidity.',
      'Oracle risk — price feeds drive collateral and liquidation logic.',
      'Newer L2-native protocol — smaller track record than mainnet incumbents.',
    ],
    coolDetail:
      'Moonwell is one of Base\'s home-grown lending markets — built for the chain\'s low fees, so compounding small deposits actually makes economic sense.',
    docsUrl: 'https://docs.moonwell.fi/',
    docsLabel: 'Moonwell documentation',
    withdrawalNote: 'Withdraw underlying USDC anytime, subject to pool liquidity.',
  },
  sky: {
    howYieldWorks:
      'You swap USDC 1:1 into sUSDS through Spark\'s PSM on this chain (no protocol swap fee beyond gas). sUSDS accrues the Sky protocol rate as its exchange rate vs USDC rises. Swap back to USDC the same way. This is not a bank deposit.',
    risks: [
      'Smart contract risk in Sky, Spark PSM, and the cross-chain rate oracle.',
      'Stablecoin / peg risk — USDS and USDC can trade off $1 in stress.',
      'Governance can change the Sky protocol rate, including down to zero.',
      'L2 sUSDS is a wrapped ERC-20, not the Ethereum ERC-4626 vault — bridging is a separate risk if you move it across chains.',
    ],
    coolDetail:
      'The PSM is a 1:1 converter, not a pool you trade against, so there is no Curve-style slippage on the swap itself. The number that moves is the Sky rate, not a pool price.',
    docsUrl: 'https://docs.spark.fi/dev/savings/spark-psm',
    docsLabel: 'Spark PSM documentation',
    withdrawalNote: 'Swap sUSDS back to USDC in one transaction, subject to PSM liquidity.',
  },
  maple: {
    howYieldWorks:
      'You deposit USDC into Maple\'s syrupUSDC pool, which lends to institutional borrowers. Yield is credit interest, not a money-market utilization rate. Shares are ERC-4626-style, but exits go through a FIFO withdrawal queue rather than an instant redeem.',
    risks: [
      'Credit risk — borrowers can delay or default. This is private credit, not a cash park.',
      'Liquidity risk — withdrawals wait in a FIFO queue. Maple documents typical waits of hours to two days, and up to 30 days when liquidity is tight.',
      'Smart contract and permissioning risk — first-time wallets need Maple\'s lender authorization.',
      'Share price can fall if the pool takes losses (impairment), unlike a simple lending aToken rebase.',
    ],
    coolDetail:
      'syrupUSDC is how Maple opened institutional loans to ordinary wallets — the trade-off for the extra yield is a queue, not instant cash.',
    docsUrl: 'https://docs.maple.finance/integrate/ethereum-mainnet/smart-contract-integration',
    docsLabel: 'Maple integration docs',
    withdrawalNote:
      'Call requestRedeem to enter the queue. USDC is sent to your wallet when processed — no extra claim transaction. Typical wait is hours to a couple of days; up to 30 days is documented.',
  },
  panoptic: {
    howYieldWorks:
      'You deposit USDC into Panoptic\'s Unicorn vault. A third-party curator supplies that USDC to lending markets and runs an automated options/volatility strategy. Openhand does not pick strikes, hedge, or operate the vault. Yield is not a money-market rate.',
    risks: [
      'Options and volatility risk — trades can lose USDC. This is not a cash park and is not "market-neutral" just because the strategy tries to hedge.',
      'Smart contract risk in the vault, Panoptic markets, lending venues, and Uniswap infrastructure underneath.',
      'Liquidity risk — ERC-4626 redeem depends on vault liquidity being available.',
      'Newer / emerging protocol — shorter track record than Aave or Lido.',
      'If DeFiLlama has no parseable Unicorn APY, this card is hidden rather than showing a guessed number.',
    ],
    coolDetail:
      'Unicorn is a Panoptic community vault from their own docs. Listing it in the catalog is not a recommendation and not a "start here."',
    docsUrl: 'https://panoptic.xyz/docs/getting-started/vaults',
    docsLabel: 'Panoptic vault docs',
    withdrawalNote: 'Redeem vault shares anytime via ERC-4626, subject to vault liquidity.',
  },
  pendle: {
    howYieldWorks:
      'You buy Pendle Principal Tokens (PT) with USDC or ETH. PT trades at a discount to the accounting asset and is redeemable 1:1 of that asset at expiry. The number on the card is implied APY — the discount annualized to maturity — not a lending utilization rate. Openhand does not list Yield Tokens (YT) or Pendle LP.',
    risks: [
      'You only earn the implied rate if you hold PT until expiry. Selling early is an AMM swap: price, depth, and slippage can all move against you.',
      'Smart contract risk in Pendle markets, the SY wrapper, and the underlying protocol (Sky, Ethena, or Lido).',
      'Underlying risk is not removed: sUSDe carries Ethena/USDe risk; wstETH carries LST/validator risk; sUSDS carries Sky/USDS risk.',
      'Aggregator routing (USDC or ETH into SY) adds swap risk on the way in.',
      'Markets expire. A new expiry is a different token — this card is not a rolling vault.',
    ],
    coolDetail:
      'Pendle split yield-bearing tokens into PT and YT so the discount to maturity is a visible rate. Listing the long-running books (sUSDS, sUSDe, wstETH) is catalog, not a recommendation.',
    docsUrl: 'https://docs.pendle.finance/pendle-v2-dev/Quickstart',
    docsLabel: 'Pendle developer docs',
    withdrawalNote:
      'Before expiry, sell PT through Pendle\'s router (1% slippage bound). At expiry, redeem PT for the accounting asset via the same convert flow.',
  },
};

function pendleOverrides(opportunity: Opportunity): Partial<OpportunityDetailContent> {
  const name = opportunity.pendle?.name;
  if (name === 'sUSDe' || name === 'USDe') {
    return {
      risks: [
        'Ethena / USDe risk — the basis trade and stablecoin design can fail. PT does not remove that.',
        'You only earn the implied rate if you hold PT until expiry. Selling early is an AMM swap.',
        'Smart contract risk in Pendle, the SY wrapper, and Ethena.',
        'Aggregator routing into the market adds swap risk on the way in.',
      ],
    };
  }
  if (name === 'wstETH') {
    return {
      howYieldWorks:
        'You buy Pendle PT-wstETH with ETH. The token is redeemable for wstETH at expiry; implied APY is the discount to that date. Early exit is an AMM swap, not Lido\'s withdrawal queue.',
      risks: [
        'LST / validator risk in Lido wstETH is still there.',
        'You only earn the implied rate if you hold PT until expiry. Selling early is an AMM swap with slippage.',
        'Smart contract risk in Pendle markets and the SY wrapper.',
      ],
    };
  }
  return {};
}

function morphoOverrides(opportunity: Opportunity): Partial<OpportunityDetailContent> {
  const isHighYield = opportunity.protocolLabel.toLowerCase().includes('high yield');
  if (!isHighYield) return {};

  return {
    risks: [
      'Smart contract risk in Morpho Blue and vault contracts.',
      'Curator risk — this vault targets higher-yield, higher-risk market allocations.',
      'Market isolation risk — a distressed market can drag vault returns.',
      'Liquidity risk — aggressive allocations may slow withdrawals during stress.',
      'Higher advertised APY often means accepting more borrower credit risk.',
    ],
    coolDetail:
      'High-yield Morpho vaults lean into less crowded markets where borrowers pay more — the trade-off is less liquidity and more credit exposure than conservative vaults.',
  };
}

function curveOverrides(opportunity: Opportunity): Partial<OpportunityDetailContent> {
  const is3Pool = opportunity.curve?.numCoins === 3;
  if (!is3Pool) return {};

  return {
    howYieldWorks:
      'You add USDC to Curve\'s legendary 3pool (USDC, USDT, DAI). Traders route stablecoin swaps through the pool and pay fees; LPs earn a share. This is one of DeFi\'s deepest stable pools.',
    coolDetail:
      '3pool is DeFi history — launched before Curve\'s factory pattern, it still anchors stablecoin liquidity on Ethereum with billions in cumulative volume.',
  };
}

/** Educational copy for an opportunity — filter/sort context only, never suitability advice. */
export function getOpportunityDetails(opportunity: Opportunity): OpportunityDetailContent {
  const base = BASE_DETAILS[opportunity.protocol];
  const overrides =
    opportunity.protocol === 'morpho'
      ? morphoOverrides(opportunity)
      : opportunity.protocol === 'curve'
        ? curveOverrides(opportunity)
        : opportunity.protocol === 'pendle'
          ? pendleOverrides(opportunity)
          : {};

  return { ...base, ...overrides };
}

export function liquidityLabel(liquidity: Opportunity['liquidity']): string {
  return liquidity === 'instant' ? 'Instant exit' : 'Delayed exit';
}
