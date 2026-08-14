import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';

/**
 * Every address below was pulled from bgd-labs/aave-address-book (Aave's own
 * canonical address registry) on 2026-08-13. Re-verify against
 * https://github.com/bgd-labs/aave-address-book before any mainnet deploy —
 * addresses here are read at runtime, never assumed silently correct.
 */
export const AAVE_V3: Partial<
  Record<number, { pool: `0x${string}`; poolAddressesProvider: `0x${string}`; uiPoolDataProvider: `0x${string}`; usdc: `0x${string}` }>
> = {
  [mainnet.id]: {
    pool: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    poolAddressesProvider: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
    uiPoolDataProvider: '0x2dAd8162A989cd99D673dE4425Bb2298Db1E1aA2',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  [base.id]: {
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    poolAddressesProvider: '0xe20fCBdBfFC4Dd138cE8b2E6FBb6CB49777ad64D',
    uiPoolDataProvider: '0x0C6BC4a12039788be08F87e87Cff87FEDbd1D386',
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  [arbitrum.id]: {
    pool: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
    poolAddressesProvider: '0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb',
    uiPoolDataProvider: '0x91E04cf78e53aEBe609e8a7f2003e7EECD743F2B',
    // Native (Circle-issued) USDC, not bridged USDC.e.
    usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  },
  [sepolia.id]: {
    pool: '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
    poolAddressesProvider: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    uiPoolDataProvider: '0x69529987FA4A075D0C00B0128fa848dc9ebbE9CE',
    usdc: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  },
  [baseSepolia.id]: {
    pool: '0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27',
    poolAddressesProvider: '0xE4C23309117Aa30342BFaae6c95c6478e0A4Ad00',
    uiPoolDataProvider: '0x3cB7B00B6C09B71998124196691e8bF2694De863',
    usdc: '0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f',
  },
  [arbitrumSepolia.id]: {
    pool: '0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff',
    poolAddressesProvider: '0xB25a5D144626a0D488e52AE717A051a2E9997076',
    uiPoolDataProvider: '0x97Cf44bF6a9A3D2B4F32b05C480dBEdC018F72A9',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  },
};

/** stETH only exists on Ethereum mainnet and its testnets — Lido does not deploy to L2s. */
export const LIDO = {
  [mainnet.id]: {
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84' as `0x${string}`,
    withdrawalQueue: '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1' as `0x${string}`,
  },
  [sepolia.id]: {
    stETH: '0x3e3FE7dBc6B4C189E7128855dD526361c49b40Af' as `0x${string}`,
    withdrawalQueue: '0x1583C7b3f4C3B008720E6BcE5726336b0aB25fdd' as `0x${string}`,
  },
} as const;

/**
 * CRV, cvxCRV, and the Convex CRV Depositor / cvxCRV Rewards (staking) contracts.
 * Verified directly against official sources on 2026-08-12:
 *  - CRV token: cross-checked against multiple independent Etherscan listings
 *    (https://etherscan.io/token/0xd533a949740bb3306d119cc777fa900ba034cd52).
 *  - cvxCRV token, CRV Depositor, cvxCRV Rewards, Booster: pulled directly from
 *    Convex's own contract-address registry
 *    (https://docs.convexfinance.com/convexfinance/faq/contract-addresses), fetched live.
 * Convex/Curve do not deploy these to any testnet — this only ever resolves on mainnet.
 * Re-verify before any mainnet deploy, same as every other entry in this file.
 */
export const CONVEX = {
  [mainnet.id]: {
    crv: '0xd533a949740bb3306d119cc777fa900ba034cd52' as `0x${string}`,
    cvxCrv: '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7' as `0x${string}`,
    crvDepositor: '0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae' as `0x${string}`,
    cvxCrvRewards: '0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e' as `0x${string}`,
    /** Main Booster contract — not used by the cvxCRV-only flow below, kept for the
     * future full LP-staking integration (Convex Booster.deposit(pid, amount, stake)). */
    booster: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31' as `0x${string}`,
  },
} as const;

/**
 * Curve's Savings crvUSD (scrvUSD) vault — an ERC-4626 vault built on an unmodified
 * Yearn V3 Vault instance. Address pulled directly from Curve's own technical docs
 * (https://docs.curve.fi/scrvusd/overview, fetched live 2026-08-12) and cross-checked
 * against an independent Etherscan listing. Mainnet only in this config; scrvUSD does
 * have cross-chain deployments (Base, Optimism, Fraxtal, etc.) not wired up here yet.
 */
export const CURVE = {
  [mainnet.id]: {
    scrvUSD: '0x0655977FEb2f289A4aB78af67BAB0d17aAb84367' as `0x${string}`,
  },
} as const;

/**
 * Frax's sfrxUSD — an ERC-4626 vault for the staked version of frxUSD, Frax's newer
 * fiat-redeemable, fully-collateralized stablecoin. CORRECTION (2026-08-13): frxUSD/
 * sfrxUSD is NOT a rename of the original FRAX/sFRAX line — both pairs coexist as
 * separate live tokens (FRAX 0x853d955acef822db058eb8505911ed77f175b99e, sFRAX
 * 0xA663B02CF0a4b149d2aD41910CB81e23e1c41c32, distinct from frxUSD
 * 0xcacd6fd266af91b8aed52accc382b4e165586e29 and this sfrxUSD address). The earlier
 * "Feb-2026 North Star hard fork" framing was wrong and has been removed — no such
 * rename exists in any source checked.
 *
 * Address re-verified 2026-08-13 via two independent sources beyond the original
 * Etherscan-search check: Etherscan's own curated address tag reads "Frax Finance:
 * sfrxUSD Token" for this exact address, and CoinGecko's contract lookup
 * (api.coingecko.com/api/v3/coins/ethereum/contract/<address>) independently returns
 * "Frax Staked frxUSD" / symbol "sfrxusd" for the same address. docs.frax.finance's
 * specific frxUSD/sfrxUSD address-table page could not be loaded directly in this
 * environment (only their legacy sFRAX page resolved, correctly showing the different
 * sFRAX address above) — re-confirm against that page directly if it becomes reachable,
 * but two independent authoritative-adjacent sources agreeing removes this from "treat
 * as unverified." Note the code never hardcodes frxUSD's own address anywhere —
 * lib/protocols/frax.ts reads the vault's `asset()` on-chain instead, so correctness
 * here self-verifies against whatever this address actually deploys to.
 */
export const FRAX = {
  [mainnet.id]: {
    sfrxUSD: '0xcf62f905562626cfcdd2261162a51fd02fc9c5b6' as `0x${string}`,
  },
} as const;

/**
 * Compound III (Comet) USDC markets on Base + Arbitrum.
 * Addresses from compound-finance/comet deployment roots (fetched 2026-08-13):
 *   Base:     deployments/base/usdc/roots.json → comet
 *   Arbitrum: deployments/arbitrum/usdc/roots.json → comet
 * Re-verify at https://docs.compound.finance before mainnet deploy.
 */
export const COMPOUND_V3 = {
  [base.id]: {
    comet: '0xb125E6687d4313864e53df431d5425969c15Eb2F' as `0x${string}`,
  },
  [arbitrum.id]: {
    comet: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf' as `0x${string}`,
  },
} as const;

/**
 * Morpho (MetaMorpho) USDC vaults on Base + Arbitrum — ERC-4626.
 * Gauntlet USDC Prime: pharos.watch + app.morpho.org (2026-08-13).
 * Steakhouse USDC (Prime Instant) Base: steakhouse.financial docs.
 * Steakhouse High Yield Instant: steakhouse.financial high-yield-instant docs.
 * Re-verify on app.morpho.org before mainnet deploy.
 */
export const MORPHO = {
  [base.id]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0xee8f4ec5672f09119b96ab6fb59c27e1b7e44b61' as `0x${string}`,
      risk: 'medium' as const,
      poolMeta: 'Gauntlet USDC Prime',
    },
    {
      id: 'steakhouse-usdc',
      label: 'Steakhouse USDC',
      vault: '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183' as `0x${string}`,
      risk: 'medium' as const,
      poolMeta: 'Steakhouse USDC',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0xbeeff7aE5E00Aae3Db302e4B0d8C883810a58100' as `0x${string}`,
      risk: 'higher' as const,
      poolMeta: 'Steakhouse High Yield',
    },
  ],
  [arbitrum.id]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0x7c574174DA4b2be3f705c6244B4BfA0815a8B3Ed' as `0x${string}`,
      risk: 'medium' as const,
      poolMeta: 'Gauntlet USDC Prime',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0xbeeff77CE5C059445714E6A3490E273fE7F2492F' as `0x${string}`,
      risk: 'higher' as const,
      poolMeta: 'Steakhouse High Yield',
    },
  ],
} as const;

/**
 * Fluid (Instadapp) fUSDC lending vaults — ERC-4626.
 * Base: 0xf42f…9169 / Arbitrum: 0x1A99…6096 from yield.xyz Fluid docs (2026-08-13).
 */
export const FLUID = {
  [base.id]: {
    fUSDC: '0xf42f5795d9ac7e9d757db633d693cd548cfd9169' as `0x${string}`,
  },
  [arbitrum.id]: {
    fUSDC: '0x1A996cb54bb95462040408C06122D45D6Cdb6096' as `0x${string}`,
  },
} as const;

/**
 * Moonwell mUSDC on Base only (Compound V2-style mToken).
 * From docs.moonwell.fi protocol contracts (2026-08-13).
 */
export const MOONWELL = {
  [base.id]: {
    mUSDC: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as `0x${string}`,
  },
} as const;
