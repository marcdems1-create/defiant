import { createPublicClient, http } from 'viem';
import { mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';
import { CURVE, AAVE_V3 } from '@/lib/config/addresses';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { erc20Abi } from '@/lib/abi/erc20';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

/**
 * Curve's Savings crvUSD (scrvUSD) — an ERC-4626 vault, same deposit()/redeem() shape as
 * lib/protocols/yearn.ts. Mainnet only: Curve does not deploy scrvUSD to any testnet, so
 * this returns [] everywhere else — same pattern as lib/protocols/lido.ts.
 */
export async function fetchCurveOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = (CURVE as Record<number, { scrvUSD: `0x${string}` }>)[chainId];
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });

  let underlying: `0x${string}`;
  try {
    underlying = await client.readContract({
      address: cfg.scrvUSD,
      abi: erc4626Abi,
      functionName: 'asset',
    });
  } catch {
    return [];
  }

  let underlyingDecimals: number;
  let underlyingSymbol: string;
  try {
    const [decimals, symbol] = await Promise.all([
      client.readContract({ address: underlying, abi: erc20Abi, functionName: 'decimals' }),
      client.readContract({ address: underlying, abi: erc20Abi, functionName: 'symbol' }),
    ]);
    underlyingDecimals = decimals;
    underlyingSymbol = symbol;
  } catch {
    return [];
  }

  const apy = await findDefiLlamaApy('curve-dex', 'Ethereum', (s) => s.includes('SCRVUSD'));
  if (apy === null) return [];

  const usdc = AAVE_V3[mainnet.id]?.usdc;

  return [
    {
      id: `curve-scrvusd-${chainId}`,
      protocol: 'curve-scrvusd',
      protocolLabel: 'Curve (scrvUSD)',
      chainId,
      asset: {
        address: underlying,
        symbol: underlyingSymbol,
        decimals: underlyingDecimals,
      },
      apy,
      description:
        "Deposit crvUSD into Curve's Savings vault (scrvUSD), an ERC-4626 vault that passes through a share of crvUSD interest fees. Withdraw anytime via redeem — the vault does not lend deposits out elsewhere.",
      risk: 'higher',
      depositTarget: cfg.scrvUSD,
      positionToken: cfg.scrvUSD,
      convertibleFrom: usdc ? { address: usdc, symbol: 'USDC', decimals: 6 } : undefined,
    },
  ];
}
