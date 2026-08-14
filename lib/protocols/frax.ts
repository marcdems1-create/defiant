import { createPublicClient, http } from 'viem';
import { mainnet } from 'wagmi/chains';
import type { Opportunity } from './types';
import { FRAX, AAVE_V3 } from '@/lib/config/addresses';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { erc20Abi } from '@/lib/abi/erc20';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApy } from './defillama';

/**
 * Frax's sfrxUSD — an ERC-4626 vault, direct port of lib/protocols/yearn.ts's pattern
 * (same deposit()/redeem() interface, no new ABI needed). Mainnet only for now; Frax's
 * sfrxUSD address here is flagged unverified in lib/config/addresses.ts — re-confirm
 * before trusting this adapter with real funds.
 */
export async function fetchFraxOpportunities(chainId: SupportedChainId): Promise<Opportunity[]> {
  const cfg = (FRAX as Record<number, { sfrxUSD: `0x${string}` }>)[chainId];
  const chain = chains.find((c) => c.id === chainId);
  if (!cfg || !chain) return [];

  const client = createPublicClient({ chain, transport: http() });

  let underlying: `0x${string}`;
  try {
    underlying = await client.readContract({
      address: cfg.sfrxUSD,
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

  const apy = await findDefiLlamaApy('frax', 'Ethereum', (s) => s.includes('FRXUSD') || s.includes('SFRAX'));
  if (apy === null) return [];

  const usdc = AAVE_V3[mainnet.id]?.usdc;

  return [
    {
      id: `frax-sfrxusd-${chainId}`,
      protocol: 'frax-sfrxusd',
      protocolLabel: 'Frax (sfrxUSD)',
      chainId,
      asset: {
        address: underlying,
        symbol: underlyingSymbol,
        decimals: underlyingDecimals,
      },
      apy,
      description:
        'Deposit frxUSD into sfrxUSD, an ERC-4626 vault that distributes Frax protocol revenue (RWA/AMO strategy yield) to stakers weekly. Withdraw anytime via redeem.',
      risk: 'higher',
      depositTarget: cfg.sfrxUSD,
      positionToken: cfg.sfrxUSD,
      convertibleFrom: usdc ? { address: usdc, symbol: 'USDC', decimals: 6 } : undefined,
    },
  ];
}
