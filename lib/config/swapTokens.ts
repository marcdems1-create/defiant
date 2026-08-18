import { arbitrum, base, mainnet } from 'wagmi/chains';
import { AAVE_V3, CONVEX } from '@/lib/config/addresses';

export interface SwapToken {
  symbol: string;
  address: `0x${string}`;
  decimals: number;
}

/**
 * Curated tokens for the same-chain /swap page (0x). This is a different use
 * case from cross-chain USDC:
 *   - Move (`/move`) = Circle CCTP, native USDC between Ethereum/Base/Arbitrum
 *   - Deposit-modal Move = LI.FI router (already live — do not replace)
 *   - Dashboard stocks = LI.FI catalog (already live — do not replace)
 * /swap only converts tokens on one chain.
 *
 * USDC comes from AAVE_V3 (Circle native). CRV/CVX on Ethereum from CONVEX
 * (docs.convexfinance.com, 2026-08-12). Remaining addresses were verified
 * on-chain 2026-08-15 by reading each contract's `symbol()`/`decimals()`
 * (PR #4). Mainnet only — 0x has no testnet liquidity.
 */
export const SWAP_TOKENS: Partial<Record<number, SwapToken[]>> = {
  [mainnet.id]: [
    { symbol: 'USDC', address: AAVE_V3[mainnet.id]!.usdc, decimals: 6 },
    { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
    { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 },
    { symbol: 'crvUSD', address: '0xf939E0A03FB07F59A73314E73794Be0E57ac1b4E', decimals: 18 },
    { symbol: 'CRV', address: CONVEX[mainnet.id].crv, decimals: 18 },
    { symbol: 'CVX', address: CONVEX[mainnet.id].cvx, decimals: 18 },
    { symbol: 'frxUSD', address: '0xCAcd6fd266aF91b8AeD52aCCc382b4e165586E29', decimals: 18 },
  ],
  [base.id]: [
    { symbol: 'USDC', address: AAVE_V3[base.id]!.usdc, decimals: 6 },
    { symbol: 'DAI', address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', decimals: 18 },
    { symbol: 'crvUSD', address: '0x417Ac0e078398C154EdFadD9Ef675d30Be60Af93', decimals: 18 },
    { symbol: 'CRV', address: '0x8Ee73c484A26e0A5df2Ee2a4960B789967dd0415', decimals: 18 },
    { symbol: 'WETH', address: '0x4200000000000000000000000000000000000006', decimals: 18 },
  ],
  [arbitrum.id]: [
    { symbol: 'USDC', address: AAVE_V3[arbitrum.id]!.usdc, decimals: 6 },
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
