'use client';

import { useEffect, useState } from 'react';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityCard } from '@/components/OpportunityCard';
import { InvestmentStyleQuestionnaire } from '@/components/InvestmentStyleQuestionnaire';
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

  const visible = hydrated ? applyPreferences(data ?? [], prefs) : (data ?? []);

  return (
    <div>
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-medium">Opportunities</h1>
        {hydrated && !showQuestionnaire && (
          <button
            onClick={handleReset}
            className="text-xs text-accent hover:underline whitespace-nowrap mt-2"
          >
            {prefs ? 'Change preferences' : 'Set preferences'}
          </button>
        )}
      </div>
      <p className="text-ink/50 text-sm mb-6">
        Live on-chain yield across Aave v3, Lido, Yearn v3, and Curve. Higher yield usually
        means more risk (smart contract, market, or liquidity risk). Nothing here is
        principal-protected.
      </p>

      {hydrated && showQuestionnaire && (
        <InvestmentStyleQuestionnaire onComplete={handleComplete} onSkip={handleSkip} />
      )}

      {hydrated && !showQuestionnaire && prefs && visible.length < (data?.length ?? 0) && (
        <div className="text-xs text-ink/40 mb-4">
          Filtered to match your preferences ({visible.length} of {data?.length ?? 0} shown).{' '}
          <button onClick={handleReset} className="text-accent hover:underline">
            Show everything
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
          No opportunities match your preferences right now.{' '}
          <button onClick={handleReset} className="text-accent hover:underline">
            Show everything
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map((opp) => (
          <OpportunityCard key={opp.id} opportunity={opp} />
        ))}
      </div>
    </div>
  );
}
