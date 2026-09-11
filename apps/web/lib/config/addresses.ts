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

/** Compound III Comet USDC — compound-finance/comet deployment roots (2026-08-13). */
export const COMPOUND_V3 = {
  [base.id]: {
    comet: '0xb125E6687d4313864e53df431d5425969c15Eb2F' as `0x${string}`,
  },
  [arbitrum.id]: {
    comet: '0x9c4ec768c28520B50860ea7a15bd7213a9fF58bf' as `0x${string}`,
  },
} as const;

/** Moonwell mUSDC — docs.moonwell.fi (2026-08-13). Comptroller + WELL token: docs.moonwell.fi protocol contracts / token pages, re-verified 2026-08-18. */
export const MOONWELL = {
  [base.id]: {
    mUSDC: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as `0x${string}`,
    comptroller: '0xfBb21d0380beE3312B33c4353c8936a0F13EF26C' as `0x${string}`,
    well: '0xA88594D404727625A9437C3f886C7643872296AE' as `0x${string}`,
  },
} as const;

/**
 * Spark PSM3 — official Spark docs (https://docs.spark.fi/dev/savings/spark-psm),
 * verified 2026-08-18. Swaps USDC ↔ sUSDS ↔ USDS on L2 with no protocol fee
 * beyond gas. Token addresses are read from the PSM at runtime (`usdc()` /
 * `susds()`), not hardcoded, so a token migration cannot silently point us
 * at the wrong asset. Mainnet L2 only — Spark does not deploy PSM3 to testnets.
 */
export const SPARK_PSM: Partial<Record<number, `0x${string}`>> = {
  [base.id]: '0x1601843c5E9bC251A3272907010AFa41Fa18347E',
  [arbitrum.id]: '0x2B05F8e1cACC6974fD79A673a341Fe1f58d27266',
};

/**
 * Maple syrupUSDC — official Maple Ethereum integration docs
 * (https://docs.maple.finance/integrate/ethereum-mainnet/smart-contract-integration),
 * verified 2026-08-18. Deposit via SyrupRouter (not PoolV2.deposit). Exit via
 * PoolV2.requestRedeem into WithdrawalManagerQueue. Mainnet only here; Maple
 * Sepolia exists but needs Maple-issued test tokens and a partnership auth
 * signature, so it is not wired.
 */
export const MAPLE = {
  [mainnet.id]: {
    pool: '0x80ac24aA929eaF5013f6436cdA2a7ba190f5Cc0b' as `0x${string}`,
    router: '0x134cCaaA4F1e4552eC8aEcb9E4A2360dDcF8df76' as `0x${string}`,
    queue: '0x1bc47a0Dd0FdaB96E9eF982fdf1F34DC6207cfE3' as `0x${string}`,
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
  },
} as const;
