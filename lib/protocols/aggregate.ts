import { chains } from '@/lib/wagmi';
import { fetchAaveOpportunities } from './aave';
import { fetchLidoOpportunities } from './lido';
import { fetchYearnOpportunities } from './yearn';
import { fetchCurveOpportunities } from './curve';
import { fetchFraxOpportunities } from './frax';
import { fetchConvexOpportunities } from './convex';
import { fetchCompoundOpportunities } from './compound';
import { fetchMorphoOpportunities } from './morpho';
import { fetchFluidOpportunities } from './fluid';
import { fetchMoonwellOpportunities } from './moonwell';
import { fetchSkyOpportunities } from './sky';
import { fetchMapleOpportunities } from './maple';
import { fetchPanopticOpportunities } from './panoptic';
import type { Opportunity } from './types';

export async function fetchAllOpportunities(): Promise<Opportunity[]> {
  const perChain = await Promise.all(
    chains.map(async (chain) => {
      const [
        aave,
        lido,
        yearn,
        curve,
        frax,
        convex,
        compound,
        morpho,
        fluid,
        moonwell,
        sky,
        maple,
        panoptic,
      ] = await Promise.all([
        fetchAaveOpportunities(chain.id).catch(() => []),
        fetchLidoOpportunities(chain.id).catch(() => []),
        fetchYearnOpportunities(chain.id).catch(() => []),
        fetchCurveOpportunities(chain.id).catch(() => []),
        fetchFraxOpportunities(chain.id).catch(() => []),
        fetchConvexOpportunities(chain.id).catch(() => []),
        fetchCompoundOpportunities(chain.id).catch(() => []),
        fetchMorphoOpportunities(chain.id).catch(() => []),
        fetchFluidOpportunities(chain.id).catch(() => []),
        fetchMoonwellOpportunities(chain.id).catch(() => []),
        fetchSkyOpportunities(chain.id).catch(() => []),
        fetchMapleOpportunities(chain.id).catch(() => []),
        fetchPanopticOpportunities(chain.id).catch(() => []),
      ]);
      return [
        ...aave,
        ...lido,
        ...yearn,
        ...curve,
        ...frax,
        ...convex,
        ...compound,
        ...morpho,
        ...fluid,
        ...moonwell,
        ...sky,
        ...maple,
        ...panoptic,
      ];
    }),
  );

  return perChain.flat().sort((a, b) => b.apy - a.apy);
}
