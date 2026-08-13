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
 * Curve's crvUSD/USDC "factory plain pool" on Ethereum mainnet — the pool
 * contract IS the LP token (no separate ERC-20), a standard Curve
 * StableSwap-NG factory pool with coins[0] = USDC, coins[1] = crvUSD.
 *
 * Verified 2026-08-13 against independent third-party sources (this
 * sandbox's network policy blocks reaching Curve's own
 * resources.curve.finance/api.curve.finance directly, so cross-referencing
 * substitutes for a single official-docs fetch here — re-verify against
 * Curve's own docs before a mainnet deploy, per repo convention):
 *   - rotki/rotki (`CRVUSD_PEG_KEEPERS_AND_POOLS` in
 *     rotkehlchen/chain/ethereum/modules/curve/crvusd/constants.py) maps
 *     PegKeeper 0x9201da0D97CaAAff53f01B2fB56767C7072dE340 to this pool,
 *     labeled "USDC/crvUSD".
 *   - messari/subgraphs (multiple subgraphs' prices/config/mainnet.ts) labels
 *     this exact address "Factory Plain Pool: crvUSD/USDC".
 *   - The pool's own Sourcify-verified ABI (KeystoneHQ/Smart-Contract-
 *     Metadata-Registry) confirms a 2-coin StableSwap interface exposing
 *     add_liquidity(uint256[2],uint256), remove_liquidity_one_coin,
 *     calc_token_amount, and calc_withdraw_one_coin — exactly what
 *     lib/protocols/curve.ts and lib/abi/curvePool.ts assume.
 * No official Curve testnet deployment of this pool exists, so this is
 * mainnet-only — same posture as Lido having no L2 deployment above.
 */
export const CURVE: Partial<Record<number, { pool: `0x${string}`; usdc: `0x${string}` }>> = {
  [mainnet.id]: {
    pool: '0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
};
