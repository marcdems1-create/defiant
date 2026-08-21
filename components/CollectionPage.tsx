'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { usePositions } from '@/lib/hooks/usePositions';
import { useErc20Balance } from '@/lib/hooks/useErc20Balance';
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  filterOpportunities,
  type OpportunityFilterState,
} from '@/lib/opportunityFilters';
import { pickStarterOpportunity } from '@/lib/firstRun';
import { OpportunityCard } from '@/components/OpportunityCard';
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { RiskDisclaimer } from '@/components/RiskDisclaimer';
import { PositionCard } from '@/components/PositionCard';
import { FirstRunHero } from '@/components/FirstRunHero';
import { chains } from '@/lib/wagmi';

export function CollectionPage() {
  const { isConnected, address } = useAccount();
  const { data, isLoading, isError } = useOpportunities();
  const { positions, isLoading: positionsLoading } = usePositions(data, {
    catalogLoading: isLoading,
  });
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const allCards = useMemo(() => data ?? [], [data]);
  const starter = useMemo(() => pickStarterOpportunity(allCards), [allCards]);
  const usdcBalance = useErc20Balance(
    starter?.asset.address,
    address,
    starter?.chainId ?? chains[0].id,
  );
  const usdcValue = (usdcBalance.data as bigint | undefined) ?? 0n;
  const usdcReady = Boolean(address && starter && !usdcBalance.isLoading);

  const hasPosition = positions.length > 0;
  const firstRun = !isConnected || (!positionsLoading && !hasPosition);

  const filtered = useMemo(
    () => filterOpportunities(allCards, filters),
    [allCards, filters],
  );

  return (
    <div className="flex flex-col gap-10">
      {firstRun ? (
        <>
          <FirstRunHero
            connected={isConnected}
            address={address}
            starter={starter}
            usdcBalance={usdcValue}
            usdcReady={usdcReady}
          />
          <RiskDisclaimer compact />
        </>
      ) : (
        <header className="flex flex-col gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
              Your cards
            </p>
            <h1 className="text-3xl font-medium tracking-tight">Yield decks</h1>
            <p className="text-ink/55 text-sm mt-2 max-w-xl leading-relaxed">
              Live on-chain rates. You sign every deposit and withdrawal. Openhand never holds
              your funds.
            </p>
          </div>
          <RiskDisclaimer />
        </header>
      )}

      {isConnected && (hasPosition || positionsLoading) && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-medium">Your cards</h2>
            <span className="text-xs text-ink/45">
              {positionsLoading && !hasPosition ? 'Loading…' : `${positions.length} held`}
            </span>
          </div>
          {positionsLoading && !hasPosition && (
            <div className="border border-dashed border-border rounded-2xl p-6 text-sm text-ink/55">
              Reading your on-chain positions…
            </div>
          )}
          <div className="flex flex-col gap-3">
            {positions.map((p) => (
              <PositionCard key={p.opportunity.id} position={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-medium">Collection</h2>
        </div>

        <OpportunityFilters
          filters={filters}
          onChange={setFilters}
          opportunities={allCards}
          visibleCount={filtered.length}
          totalCount={allCards.length}
          className="mb-6"
        />

        {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
        {isError && (
          <div className="text-danger text-sm">
            Couldn&apos;t load opportunities. Check your network and try again.
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-ink/50 text-sm">
            No cards match these filters. Try another chain or asset.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      </section>
    </div>
  );
}
