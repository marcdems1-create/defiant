import { chains } from '@/lib/wagmi';
import { fetchAaveOpportunities } from './aave';
import { fetchLidoOpportunities } from './lido';
import { fetchYearnOpportunities } from './yearn';
import { fetchCurveOpportunities } from './curve';
import type { Opportunity } from './types';

export async function fetchAllOpportunities(): Promise<Opportunity[]> {
  const perChain = await Promise.all(
    chains.map(async (chain) => {
      const [aave, lido, yearn, curve] = await Promise.all([
        fetchAaveOpportunities(chain.id).catch(() => []),
        fetchLidoOpportunities(chain.id).catch(() => []),
        fetchYearnOpportunities(chain.id).catch(() => []),
        fetchCurveOpportunities(chain.id).catch(() => []),
      ]);
      return [...aave, ...lido, ...yearn, ...curve];
    }),
  );

  return perChain.flat().sort((a, b) => b.apy - a.apy);
}
