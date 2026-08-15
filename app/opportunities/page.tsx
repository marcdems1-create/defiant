'use client';

import { useMemo, useState } from 'react';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityCard } from '@/components/OpportunityCard';
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { RiskDisclaimer } from '@/components/RiskDisclaimer';
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  filterOpportunities,
  type OpportunityFilterState,
} from '@/lib/opportunityFilters';

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useOpportunities();
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const allCards = data ?? [];
  const visible = useMemo(
    () => filterOpportunities(allCards, filters),
    [allCards, filters],
  );

  return (
    <div>
      <h1 className="text-2xl font-medium mb-1">Opportunities</h1>
      <p className="text-ink/50 text-sm mb-4">
        Live on-chain yield. Higher yield usually means more risk.
      </p>

      <RiskDisclaimer className="mb-6" />

      <OpportunityFilters
        filters={filters}
        onChange={setFilters}
        opportunities={allCards}
        visibleCount={visible.length}
        totalCount={allCards.length}
        className="mb-6"
      />

      {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
      {isError && (
        <div className="text-danger text-sm">
          Couldn&apos;t load opportunities. Check your network connection and try again.
        </div>
      )}
      {!isLoading && !isError && visible.length === 0 && (
        <div className="text-ink/50 text-sm">
          No opportunities match your filters right now.{' '}
          <button
            onClick={() => setFilters(DEFAULT_OPPORTUNITY_FILTERS)}
            className="text-accent hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}
