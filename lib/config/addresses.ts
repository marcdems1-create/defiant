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

export interface CurvePoolConfig {
  id: string;
  label: string;
  /** The swap contract — always the add_liquidity/remove_liquidity_one_coin target and the USDC approve spender. */
  pool: `0x${string}`;
  /** The LP/balance token. Equal to `pool` for modern factory pools (pool IS the ERC-20); a separate contract for 3pool. */
  lpToken: `0x${string}`;
  usdc: `0x${string}`;
  /** USDC's position in this pool's `coins` array — needed for the `i` argument everywhere and to place the deposit amount correctly. */
  usdcIndex: number;
  /** Length of this pool's `coins` array — selects which add_liquidity/calc_token_amount ABI variant applies. */
  numCoins: 2 | 3;
  /**
   * How this pool sizes its `add_liquidity`/`calc_token_amount` amounts array.
   * `'fixed'` = older `uint256[N]` (the mainnet crvUSD/USDC factory pool and
   * 3pool); `'dynamic'` = newer StableSwap-NG `uint256[]` (every Curve L2
   * stable pool here). Defaults to `'fixed'` when omitted. Verified per-pool
   * on-chain — calling the wrong selector reverts. See lib/abi/curvePool.ts.
   */
  amountsEncoding?: 'fixed' | 'dynamic';
}

/**
 * Curve's most liquid USDC-containing stable pools on Ethereum mainnet — the
 * only two candidates that are both (a) liquid enough to be worth listing
 * and (b) actually hold USDC as one of their coins, which single-sided
 * add_liquidity requires (a pool like crvUSD/USDT doesn't qualify: there's
 * no USDC in it to deposit). Confirmed as Curve's two largest USDC-adjacent
 * stable pools via a live web search (2026-08-13): "The largest Basepool on
 * Curve is the DAI/USDC/USDT pool (3pool)... the flagship... one of the most
 * liquid and widely referenced pools in all of DeFi" and "USDC/crvUSD [was]
 * the biggest TVL gainer" among crvUSD pools (Curve's own "Best Yields & Key
 * Metrics" weekly posts). No official Curve testnet deployment of either
 * pool exists, so both are mainnet-only — same posture as Lido having no L2
 * deployment above.
 *
 * This sandbox's network policy blocks Curve's own resources.curve.finance/
 * api.curve.finance directly, so every address below is cross-referenced
 * against independent third-party sources instead of a single official-docs
 * fetch — re-verify against Curve's own docs before a mainnet deploy, per
 * repo convention.
 */
export const CURVE: Partial<Record<number, CurvePoolConfig[]>> = {
  [mainnet.id]: [
    {
      // Factory plain pool, coins[0] = USDC, coins[1] = crvUSD. The pool
      // contract IS the LP token (no separate ERC-20) — standard for
      // Curve's newer StableSwap-NG factory pools.
      //   - rotki/rotki (`CRVUSD_PEG_KEEPERS_AND_POOLS` in
      //     rotkehlchen/chain/ethereum/modules/curve/crvusd/constants.py)
      //     maps PegKeeper 0x9201da0D97CaAAff53f01B2fB56767C7072dE340 to
      //     this pool, labeled "USDC/crvUSD".
      //   - messari/subgraphs (multiple subgraphs' prices/config/mainnet.ts)
      //     labels this exact address "Factory Plain Pool: crvUSD/USDC".
      //   - The pool's own Sourcify-verified ABI (KeystoneHQ/Smart-Contract-
      //     Metadata-Registry) confirms a 2-coin StableSwap interface
      //     exposing add_liquidity(uint256[2],uint256),
      //     remove_liquidity_one_coin, calc_token_amount, and
      //     calc_withdraw_one_coin — exactly what lib/protocols/curve.ts
      //     and lib/abi/curvePool.ts assume.
      id: 'crvusd-usdc',
      label: 'crvUSD/USDC',
      pool: '0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E',
      lpToken: '0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdcIndex: 0,
      numCoins: 2,
    },
    {
      // 3pool — Curve's original, most iconic stable pool. Unlike the
      // factory pool above, the swap contract and the LP token (3Crv) are
      // TWO SEPARATE contracts — an old-style Curve pool predating the
      // pool-is-its-own-ERC20 factory pattern. coins[0] = DAI, coins[1] =
      // USDC, coins[2] = USDT.
      //   - curvefi/curve-contract's own README
      //     (contracts/pools/3pool/README.md, official Curve repo) lists
      //     `StableSwap3Pool`: 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7
      //     and `CurveContractV2` (the LP token, 3Crv):
      //     0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490.
      //   - Independently corroborated by curvefi/metaregistry
      //     (`get_pool_name("0xbEbc...")` → `'3pool'`), curvefi/curve-dao-
      //     contracts, and multiple unrelated production repos (Cyfrin's
      //     advanced-defi-2024 course constants, OriginProtocol/
      //     origin-dollar, stakewithus/defi-by-example) all agreeing on
      //     both addresses and the DAI/USDC/USDT coin order.
      //   - Function signatures (uint256[3] add_liquidity/calc_token_amount,
      //     int128 i on calc_withdraw_one_coin/remove_liquidity_one_coin)
      //     confirmed against a full ABI embedded in OriginProtocol/
      //     origin-dollar's brownie/world.py.
      id: '3pool',
      label: '3pool (DAI/USDC/USDT)',
      pool: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
      lpToken: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
      usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      usdcIndex: 1,
      numCoins: 3,
    },
  ],
  // Curve on Base and Arbitrum — added to give a low-gas L2 route into Curve,
  // since the mainnet pools above cost far more per deposit/withdraw. Every
  // address, coin ordering, LP token, and the dynamic-array ABI below was
  // verified DIRECTLY against Curve's own API and the live pool contracts on
  // 2026-08-14 (unlike the mainnet pools, which had to be cross-referenced
  // via third parties because the original build sandbox blocked Curve):
  //   - https://api.curve.finance/v1/getPools/all/{base,arbitrum} returns each
  //     pool's address, coins[] (with symbol+address), lpTokenAddress, and
  //     `implementation` ("plainstableng"). Both pools below hold native
  //     (Circle) USDC as a coin and are their own LP token (factory NG pool).
  //   - An on-chain eth_call to each pool confirmed coins[0]=native USDC and
  //     that `calc_token_amount`/`add_liquidity` answer to the DYNAMIC
  //     `uint256[]` selector (not the mainnet `uint256[2]` one), while
  //     `calc_withdraw_one_coin(uint256,int128)` matches the shared shape. A
  //     1000-USDC round-trip (deposit-preview then withdraw-preview) returned
  //     ~999.85 USDC, confirming both are healthy, correctly-pegged pools.
  //   - Base/Arbitrum native USDC addresses reused verbatim from AAVE_V3 above.
  // Curve L2 stable-pool TVL is far smaller than mainnet's, so large single-
  // sided deposits will hit the modal's 1% min-out slippage guard (and fail
  // safely rather than execute a bad trade) — see README "Known simplifications".
  [base.id]: [
    {
      // getPools/all/base → "USDC/Savings crvUSD", coins[0]=USDC,
      // coins[1]=scrvUSD (0x646A737B9B6024e49f5908762B3fF73e65B5160c), impl
      // plainstableng, pool is its own LP token. The most liquid crvUSD-family
      // USDC stable pool on Base with a live base-trading APY.
      id: 'crvusd-usdc-savings',
      label: 'USDC/scrvUSD',
      pool: '0x5aB01ee6208596f2204B85bDFA39d34c2aDD98F6',
      lpToken: '0x5aB01ee6208596f2204B85bDFA39d34c2aDD98F6',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      usdcIndex: 0,
      numCoins: 2,
      amountsEncoding: 'dynamic',
    },
  ],
  [arbitrum.id]: [
    {
      // getPools/all/arbitrum → "Strategic USD Reserves", coins[0]=native
      // USDC, coins[1]=USD₮0 (0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9, the
      // canonical bridged USDT on Arbitrum), impl plainstableng, pool is its
      // own LP token. The most liquid native-USDC/USD-stable pool on Arbitrum
      // with a live base-trading APY.
      id: 'usdc-usdt0',
      label: 'USDC/USD₮0',
      pool: '0x49b720F1Aab26260BEAec93A7BeB5BF2925b2A8F',
      lpToken: '0x49b720F1Aab26260BEAec93A7BeB5BF2925b2A8F',
      usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      usdcIndex: 0,
      numCoins: 2,
      amountsEncoding: 'dynamic',
    },
  ],
};

/**
 * CRV, cvxCRV, Convex CRV Depositor / cvxCRV Rewards — docs.convexfinance.com (2026-08-12).
 */
export const CONVEX = {
  [mainnet.id]: {
    crv: '0xd533a949740bb3306d119cc777fa900ba034cd52' as `0x${string}`,
    cvxCrv: '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7' as `0x${string}`,
    crvDepositor: '0x8014595F2AB54cD7c604B00E9fb932176fDc86Ae' as `0x${string}`,
    cvxCrvRewards: '0x3Fe65692bfCD0e6CF84cB1E7d24108E434A7587e' as `0x${string}`,
    booster: '0xF403C135812408BFbE8713b5A23a04b3D48AAE31' as `0x${string}`,
  },
} as const;

/** Frax sfrxUSD — Etherscan tag + CoinGecko cross-check (2026-08-13). */
export const FRAX = {
  [mainnet.id]: {
    sfrxUSD: '0xcf62f905562626cfcdd2261162a51fd02fc9c5b6' as `0x${string}`,
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

/** Morpho MetaMorpho USDC vaults — api.morpho.org GraphQL (listed vaults, 2026-08-13). */
export const MORPHO = {
  [base.id]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0xee8f4ec5672f09119b96ab6fb59c27e1b7e44b61' as `0x${string}`,
      defiLlamaSymbol: 'GTUSDCP',
    },
    {
      id: 'steakhouse-usdc',
      label: 'Steakhouse USDC',
      vault: '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183' as `0x${string}`,
      defiLlamaSymbol: 'STEAKUSDC',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0xBEEFA7B88064FeEF0cEe02AAeBBd95D30df3878F' as `0x${string}`,
      defiLlamaSymbol: 'SIRLOINUSDC',
    },
  ],
  [arbitrum.id]: [
    {
      id: 'gauntlet-usdc-prime',
      label: 'Gauntlet USDC Prime',
      vault: '0x7c574174DA4b2be3f705c6244B4BfA0815a8B3Ed' as `0x${string}`,
      defiLlamaSymbol: 'GTUSDCP',
    },
    {
      id: 'steakhouse-hy-usdc',
      label: 'Steakhouse High Yield USDC',
      vault: '0x5c0C306Aaa9F877de636f4d5822cA9F2E81563BA' as `0x${string}`,
      defiLlamaSymbol: 'BBQUSDC',
    },
  ],
} as const;

/** Fluid fUSDC — yield.xyz Fluid docs (2026-08-13). */
export const FLUID = {
  [base.id]: {
    fUSDC: '0xf42f5795d9ac7e9d757db633d693cd548cfd9169' as `0x${string}`,
  },
  [arbitrum.id]: {
    fUSDC: '0x1A996cb54bb95462040408C06122D45D6Cdb6096' as `0x${string}`,
  },
} as const;

/** Moonwell mUSDC — docs.moonwell.fi (2026-08-13). */
export const MOONWELL = {
  [base.id]: {
    mUSDC: '0xEdc817A28E8B93B03976FBd4a3dDBc9f7D176c22' as `0x${string}`,
  },
} as const;
