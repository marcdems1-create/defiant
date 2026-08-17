import { arbitrum, base, mainnet } from 'wagmi/chains';

export interface SwapToken {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

/**
 * Curated token registry for the /swap page (see components/SwapCard.tsx).
 *
 * The point of the swap surface is the fiat→USDC→X flow: a user onramps to
 * USDC, then sometimes needs another stablecoin or a governance token (CRV/CVX)
 * before depositing. USDC is intentionally listed first on every chain so it
 * defaults to the sell side.
 *
 * Only the three mainnet networks 0x's Swap API actually supports are listed —
 * Ethereum, Base, Arbitrum. In testnet mode (Sepolia et al.) there is no entry,
 * so SwapCard shows a "switch to a supported network" state rather than
 * offering a swap that can't be quoted.
 *
 * Every address + decimals below was verified DIRECTLY on-chain on 2026-08-15
 * by reading each token contract's own `symbol()`/`decimals()` over a public
 * RPC for that chain (the authoritative source per repo non-negotiable #5) —
 * USDC/CRV also match the addresses already used in lib/config/addresses.ts.
 * CVX (the Convex governance token, distinct from cvxCRV) is Ethereum-only;
 * Convex does not deploy it to L2s, so it appears on mainnet only.
 */
export const SWAP_TOKENS: Partial<Record<number, SwapToken[]>> = {
  [mainnet.id]: [
    { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'crvUSD', address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E', decimals: 18 },
    { symbol: 'CRV', address: '0xD533a949740bb3306d119CC777fa900bA034cd52', decimals: 18 },
    { symbol: 'CVX', address: '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B', decimals: 18 },
    // frxUSD — target for the Frax (sfrxUSD) "pay with USDC" guided swap.
    { symbol: 'frxUSD', address: '0xCAcd6fd266aF91b8AeD52aCCc382b4e165586E29', decimals: 18 },
  ],
  [base.id]: [
    { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
    { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
    { symbol: 'crvUSD', address: '0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93', decimals: 18 },
    { symbol: 'CRV', address: '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415', decimals: 18 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  ],
  [arbitrum.id]: [
    { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
    { symbol: 'USD₮0', address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', decimals: 6 },
    { symbol: 'DAI', address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', decimals: 18 },
    { symbol: 'crvUSD', address: '0x498Bf2B1e120FeD3ad3D42EA2165E9b73f99C1e5', decimals: 18 },
    { symbol: 'CRV', address: '0x11cDb42B0EB46D95f990BeDD4695A6e3fA034978', decimals: 18 },
    { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18 },
  ],
};

export function swapTokensForChain(chainId: number): SwapToken[] {
  return SWAP_TOKENS[chainId] ?? [];
}
