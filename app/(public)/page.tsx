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
import { OpportunityCard, OpportunityListRow } from '@/components/OpportunityCard';
import { ScreenTitle } from '@/components/AppChrome';
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { HowItWorks } from '@/components/HowItWorks';
import { RiskDisclaimer } from '@/components/RiskDisclaimer';
import { PositionCard } from '@/components/PositionCard';
import { FirstRunHero } from '@/components/FirstRunHero';
import { chains } from '@/lib/wagmi';

export default function CollectionPage() {
  const { isConnected, address } = useAccount();
  const { data, isLoading, isError } = useOpportunities();
  const { positions, isLoading: positionsLoading } = usePositions(data, {
    catalogLoading: isLoading,
  });
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const allCards = data ?? [];
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
    <div className="flex flex-col gap-6 md:gap-10">
      {firstRun ? (
        <>
          <FirstRunHero
            connected={isConnected}
            address={address}
            starter={starter}
            usdcBalance={usdcValue}
            usdcReady={usdcReady}
          />
          <div className="hidden md:block">
            <HowItWorks />
          </div>
          <RiskDisclaimer compact />
        </>
      ) : (
        <header className="flex flex-col gap-3">
          <ScreenTitle subtitle="Live on-chain rates. You sign every deposit.">Collection</ScreenTitle>
          <div className="hidden md:block">
            <RiskDisclaimer />
          </div>
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
        <div className="flex items-baseline justify-between mb-3 md:mb-4">
          <h2 className="text-lg font-medium">{firstRun ? 'Collection' : 'Browse'}</h2>
        </div>

        <OpportunityFilters
          filters={filters}
          onChange={setFilters}
          opportunities={allCards}
          visibleCount={filtered.length}
          totalCount={allCards.length}
          className="mb-4 md:mb-6"
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

        <ul className="md:hidden -mx-4 px-4 divide-y divide-border/80">
          {filtered.map((opp) => (
            <OpportunityListRow key={opp.id} opportunity={opp} />
          ))}
        </ul>
        <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((opp) => (
            <OpportunityCard key={opp.id} opportunity={opp} />
          ))}
        </div>
      </section>
    </div>
  );
}
