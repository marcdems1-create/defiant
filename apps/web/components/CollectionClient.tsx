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
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { OpportunityGrid } from '@/components/OpportunityGrid';
import { PositionCard } from '@/components/PositionCard';
import { FirstRunHero } from '@/components/FirstRunHero';
import { WalletOnly } from '@/components/WalletOnly';
import { chains } from '@/lib/wagmi';
import type { Opportunity } from '@/lib/protocols/types';

export function CollectionClient({
  initialOpportunities,
}: {
  initialOpportunities: Opportunity[];
}) {
  return (
    <WalletOnly fallback={<StaticCollection opportunities={initialOpportunities} />}>
      <LiveCollection initialOpportunities={initialOpportunities} />
    </WalletOnly>
  );
}

function StaticCollection({ opportunities }: { opportunities: Opportunity[] }) {
  return (
    <section aria-labelledby="collection-heading">
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="collection-heading" className="text-lg font-medium">
          Collection
        </h2>
      </div>
      <OpportunityGrid opportunities={opportunities} />
    </section>
  );
}

function LiveCollection({ initialOpportunities }: { initialOpportunities: Opportunity[] }) {
  const { isConnected, address } = useAccount();
  const { data, isLoading, isError } = useOpportunities(initialOpportunities);
  const { positions, isLoading: positionsLoading } = usePositions(data, {
    catalogLoading: isLoading,
  });
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const allCards = data ?? initialOpportunities;
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
    <>
      {firstRun && (
        <FirstRunHero
          connected={isConnected}
          address={address}
          starter={starter}
          usdcBalance={usdcValue}
          usdcReady={usdcReady}
        />
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

      <section aria-labelledby="collection-heading">
        <div className="flex items-baseline justify-between mb-4">
          <h2 id="collection-heading" className="text-lg font-medium">
            Collection
          </h2>
        </div>

        <OpportunityFilters
          filters={filters}
          onChange={setFilters}
          opportunities={allCards}
          visibleCount={filtered.length}
          totalCount={allCards.length}
          className="mb-6"
        />

        {isLoading && allCards.length === 0 && (
          <div className="text-ink/50 text-sm">Loading live rates…</div>
        )}
        {isError && allCards.length === 0 && (
          <div className="text-danger text-sm">
            Couldn&apos;t load opportunities. Check your network and try again.
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && allCards.length > 0 && (
          <div className="text-ink/50 text-sm">
            No cards match these filters. Try another chain or asset.
          </div>
        )}

        <OpportunityGrid opportunities={filtered} />
      </section>
    </>
  );
}
