'use client';

import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityCard } from '@/components/OpportunityCard';

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useOpportunities();

  return (
    <div>
      <h1 className="text-2xl font-medium mb-1">Opportunities</h1>
      <p className="text-ink/50 text-sm mb-6">
        Live on-chain yield across Aave v3, Lido, and Yearn v3. Sorted by APY — higher yield
        usually means more risk (smart contract, market, or liquidity risk). Nothing here is
        principal-protected.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data?.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}
