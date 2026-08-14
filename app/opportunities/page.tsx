'use client';

import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityCard } from '@/components/OpportunityCard';

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useOpportunities();

  return (
    <div>
      <h1 className="text-2xl font-medium mb-1">All opportunities</h1>
      <p className="text-ink/50 text-sm mb-6 max-w-2xl leading-relaxed">
        Live on-chain yield across Aave, Compound, Morpho, Fluid, Moonwell, Lido, Yearn, and more.
        Prefer Base / Arbitrum cards to keep gas down. Sorted by APY — higher yield usually means
        more risk. Nothing here is principal-protected.
      </p>

      {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
      {isError && (
        <div className="text-danger text-sm">
          Couldn&apos;t load opportunities. Check your network connection and try again.
        </div>
      )}
      {!isLoading && !isError && data?.length === 0 && (
        <div className="text-ink/50 text-sm">No opportunities available right now.</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}
