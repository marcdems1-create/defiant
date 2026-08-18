import { createPublicClient, http } from 'viem';
import type { Opportunity } from './types';
import { PANOPTIC, AAVE_V3 } from '@/lib/config/addresses';
import { erc4626Abi } from '@/lib/abi/erc4626';
import { chains, type SupportedChainId } from '@/lib/wagmi';
import { findDefiLlamaApyAnyProject } from './defillama';

type PanopticVaultId = 'unicorn' | 'plp-weth';

/**
 * Panoptic community vaults — third-party options/vol strategies from
 * Panoptic's own deployment docs
 * (https://panoptic.xyz/docs/contracts/deployment-addresses), 2026-08-18.
 * Ethereum mainnet only. Skip a card if `asset()` is not the expected token
 * or APY cannot be parsed for *that* vault — do not invent a vol-selling
 * number, and do not reuse the other vault's APY.
 */
export async function fetchPanopticUnicornApy(): Promise<number | null> {
  const byName = await findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('UNICORN'),
  );
  if (byName !== null) return byName;
  return findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('USDC'),
    (m) => m.toUpperCase().includes('UNICORN'),
  );
}

/** PLP only — never fall back to a generic WETH or Unicorn pool. */
export async function fetchPanopticPlpApy(): Promise<number | null> {
  const byName = await findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('PLP'),
  );
  if (byName !== null) return byName;
  return findDefiLlamaApyAnyProject(
    ['panoptic', 'panoptic-v2'],
    'Ethereum',
    (s) => s.includes('WETH') || s.includes('ETH'),
    (m) => m.toUpperCase().includes('PLP'),
  );
}

interface VaultSpec {
  id: PanopticVaultId;
  vaultAddress: `0x${string}`;
  expectedAsset: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  protocolLabel: string;
  description: string;
  fetchApy: () => Promise<number | null>;
}

async function readShareDecimals(
  chain: (typeof chains)[number],
  vault: `0x${string}`,
  expectedAsset: `0x${string}`,
): Promise<number | null> {
  const client = createPublicClient({ chain, transport: http() });
  try {
    const [underlying, decimals] = await Promise.all([
      client.readContract({
        address: vault,
        abi: erc4626Abi,
        functionName: 'asset',
      }),
      client.readContract({
        address: vault,
        abi: erc4626Abi,
        functionName: 'decimals',
      }),
    ]);
    if (underlying.toLowerCase() !== expectedAsset.toLowerCase()) return null;
    if (typeof decimals === 'number' && decimals > 0 && decimals <= 18) {
      return decimals;
    }
    return 18;
  } catch {
    return null;
  }
}

async function fetchOneVault(
  chainId: SupportedChainId,
  spec: VaultSpec,
): Promise<Opportunity | null> {
  const chain = chains.find((c) => c.id === chainId);
  if (!chain) return null;

  const shareDecimals = await readShareDecimals(
    chain,
    spec.vaultAddress,
    spec.expectedAsset,
  );
  if (shareDecimals === null) return null;

  const apy = await spec.fetchApy();
  if (apy === null) return null;

  return {
    id: `panoptic-${spec.id}-${chainId}`,
    protocol: 'panoptic',
    protocolLabel: spec.protocolLabel,
    chainId,
    asset: {
      address: spec.expectedAsset,
      symbol: spec.assetSymbol,
      decimals: spec.assetDecimals,
    },
    apy,
    description: spec.description,
    depositTarget: spec.vaultAddress,
    positionToken: spec.vaultAddress,
    positionDecimals: shareDecimals,
    positionSymbol: 'vault shares',
    liquidity: 'instant',
    riskTier: 'emerging',
    panoptic: { vault: spec.id },
  };
}

export async function fetchPanopticOpportunities(
  chainId: SupportedChainId,
): Promise<Opportunity[]> {
  const cfg = chainId in PANOPTIC ? PANOPTIC[chainId as keyof typeof PANOPTIC] : undefined;
  const usdc = AAVE_V3[chainId]?.usdc;
  if (!cfg || !usdc) return [];

  const specs: VaultSpec[] = [
    {
      id: 'unicorn',
      vaultAddress: cfg.unicornUsdc,
      expectedAsset: usdc,
      assetSymbol: 'USDC',
      assetDecimals: 6,
      protocolLabel: 'Panoptic (Unicorn USDC)',
      description:
        'Deposit USDC into Panoptic\'s Unicorn vault, a third-party automated strategy that lends USDC and runs options/volatility trades. Yield is not a money-market rate — you can lose USDC. Withdraw via ERC-4626, subject to vault liquidity.',
      fetchApy: fetchPanopticUnicornApy,
    },
    {
      id: 'plp-weth',
      vaultAddress: cfg.plpWeth,
      expectedAsset: cfg.weth,
      assetSymbol: 'WETH',
      assetDecimals: 18,
      protocolLabel: 'Panoptic (PLP WETH)',
      description:
        'Deposit WETH into Panoptic\'s PLP vault, a third-party strategy that lends WETH and market-makes on Panoptic. Relatively more conservative among Panoptic\'s community vaults — still options infrastructure, not a cash park. You can lose WETH. Withdraw via ERC-4626, subject to vault liquidity.',
      fetchApy: fetchPanopticPlpApy,
    },
  ];

  const results = await Promise.all(specs.map((spec) => fetchOneVault(chainId, spec)));
  return results.filter((o): o is Opportunity => o !== null);
}
