import { chains } from '@/lib/wagmi';
import { fetchAaveOpportunities } from './aave';
import { fetchLidoOpportunities } from './lido';
import { fetchYearnOpportunities } from './yearn';
import type { Opportunity } from './types';

export async function fetchAllOpportunities(): Promise<Opportunity[]> {
  const perChain = await Promise.all(
    chains.map(async (chain) => {
      const [aave, lido, yearn] = await Promise.all([
        fetchAaveOpportunities(chain.id).catch(() => []),
        fetchLidoOpportunities(chain.id).catch(() => []),
        fetchYearnOpportunities(chain.id).catch(() => []),
      ]);
      return [...aave, ...lido, ...yearn];
    }),
  );

  return perChain.flat().sort((a, b) => b.apy - a.apy);
}
