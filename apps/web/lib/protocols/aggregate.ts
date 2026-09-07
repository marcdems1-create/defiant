import { chains } from '@/lib/wagmi';
import { fetchAaveOpportunities } from './aave';
import { fetchLidoOpportunities } from './lido';
import { fetchYearnOpportunities } from './yearn';
import { fetchCompoundOpportunities } from './compound';
import { fetchMorphoOpportunities } from './morpho';
import { fetchFluidOpportunities } from './fluid';
import { fetchMoonwellOpportunities } from './moonwell';
import { fetchSkyOpportunities } from './sky';
import { fetchMapleOpportunities } from './maple';
import type { Opportunity } from './types';

export async function fetchAllOpportunities(): Promise<Opportunity[]> {
  const perChain = await Promise.all(
    chains.map(async (chain) => {
      const [aave, lido, yearn, compound, morpho, fluid, moonwell, sky, maple] =
        await Promise.all([
          fetchAaveOpportunities(chain.id).catch(() => []),
          fetchLidoOpportunities(chain.id).catch(() => []),
          fetchYearnOpportunities(chain.id).catch(() => []),
          fetchCompoundOpportunities(chain.id).catch(() => []),
          fetchMorphoOpportunities(chain.id).catch(() => []),
          fetchFluidOpportunities(chain.id).catch(() => []),
          fetchMoonwellOpportunities(chain.id).catch(() => []),
          fetchSkyOpportunities(chain.id).catch(() => []),
          fetchMapleOpportunities(chain.id).catch(() => []),
        ]);
      return [...aave, ...lido, ...yearn, ...compound, ...morpho, ...fluid, ...moonwell, ...sky, ...maple];
    }),
  );

  return perChain.flat().sort((a, b) => b.apy - a.apy);
}
