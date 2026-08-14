'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityCard } from '@/components/OpportunityCard';
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { InvestmentStyleQuestionnaire } from '@/components/InvestmentStyleQuestionnaire';
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  filterOpportunities,
  type OpportunityFilterState,
} from '@/lib/opportunityFilters';
import {
  applyPreferences,
  clearPreferences,
  getPreferences,
  markSkipped,
  setPreferences,
  wasSkipped,
  type InvestmentPreferences,
} from '@/lib/preferences';

export default function OpportunitiesPage() {
  const { data, isLoading, isError } = useOpportunities();
  const [prefs, setPrefsState] = useState<InvestmentPreferences | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  useEffect(() => {
    const stored = getPreferences();
    setPrefsState(stored);
    setShowQuestionnaire(!stored && !wasSkipped());
    setHydrated(true);
  }, []);

  function handleComplete(next: InvestmentPreferences) {
    setPreferences(next);
    setPrefsState(next);
    setShowQuestionnaire(false);
  }

  function handleSkip() {
    markSkipped();
    setShowQuestionnaire(false);
  }

  function handleReset() {
    clearPreferences();
    setPrefsState(null);
    setShowQuestionnaire(true);
  }

  const allCards = data ?? [];
  const preferenceFiltered = hydrated ? applyPreferences(allCards, prefs) : allCards;
  const visible = useMemo(
    () => filterOpportunities(preferenceFiltered, filters),
    [preferenceFiltered, filters],
  );

  const prefsReducedCount =
    hydrated && prefs !== null && preferenceFiltered.length < allCards.length;

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-medium">Opportunities</h1>
        {hydrated && !showQuestionnaire && (
          <button
            onClick={handleReset}
            className="text-xs text-accent hover:underline whitespace-nowrap mt-2"
          >
            {prefs ? 'Change filters' : 'Set filters'}
          </button>
        )}
      </div>
      <p className="text-ink/50 text-sm mb-6">
        The best live on-chain yield across DeFi. Higher yield usually means more risk (smart
        contract, market, or liquidity risk). Nothing here is principal-protected.
      </p>

      {hydrated && showQuestionnaire && (
        <InvestmentStyleQuestionnaire onComplete={handleComplete} onSkip={handleSkip} />
      )}

      {hydrated && !showQuestionnaire && (
        <OpportunityFilters
          filters={filters}
          onChange={setFilters}
          opportunities={preferenceFiltered}
          visibleCount={visible.length}
          totalCount={preferenceFiltered.length}
          className="mb-6"
        />
      )}

      {hydrated && !showQuestionnaire && prefsReducedCount && (
        <div className="text-xs text-ink/40 mb-4 -mt-2">
          Browse filters narrowed the list ({preferenceFiltered.length} of {allCards.length}{' '}
          eligible).{' '}
          <button onClick={handleReset} className="text-accent hover:underline">
            Reset filters
          </button>
        </div>
      )}

      {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
      {isError && (
        <div className="text-danger text-sm">
          Couldn&apos;t load opportunities. Check your network connection and try again.
        </div>
      )}
      {!isLoading && !isError && hydrated && visible.length === 0 && (
        <div className="text-ink/50 text-sm">
          No opportunities match your filters right now.{' '}
          <button
            onClick={() => setFilters(DEFAULT_OPPORTUNITY_FILTERS)}
            className="text-accent hover:underline"
          >
            Clear filters
          </button>
          {prefs && (
            <>
              {' '}
              or{' '}
              <button onClick={handleReset} className="text-accent hover:underline">
                reset filters
              </button>
            </>
          )}
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
