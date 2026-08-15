'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { usePositions } from '@/lib/hooks/usePositions';
import {
  DEFAULT_OPPORTUNITY_FILTERS,
  filterOpportunities,
  type OpportunityFilterState,
} from '@/lib/opportunityFilters';
import { OpportunityCard } from '@/components/OpportunityCard';
import { OpportunityFilters } from '@/components/OpportunityFilters';
import { RiskDisclaimer } from '@/components/RiskDisclaimer';
import { PositionCard } from '@/components/PositionCard';
import { ConnectButtonClient } from '@/components/ConnectButtonClient';
import { InstallAppBanner } from '@/components/InstallAppBanner';

export default function CollectionPage() {
  const { isConnected } = useAccount();
  const { data, isLoading, isError } = useOpportunities();
  const { positions, isLoading: positionsLoading } = usePositions(data);
  const [filters, setFilters] = useState<OpportunityFilterState>(DEFAULT_OPPORTUNITY_FILTERS);

  const allCards = data ?? [];
  const filtered = useMemo(
    () => filterOpportunities(allCards, filters, { sortL2First: true }),
    [allCards, filters],
  );

  return (
    <div className="flex flex-col gap-10">
      <InstallAppBanner />

      <header className="flex flex-col gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/45 font-mono mb-2">
            Card collection
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Yield decks</h1>
          <p className="text-ink/55 text-sm mt-2 max-w-xl leading-relaxed">
            Compare live on-chain USDC yield on Base and Arbitrum. Connect your wallet and sign
            every deposit or withdrawal yourself.
          </p>
        </div>

        <RiskDisclaimer />

        <OpportunityFilters
          filters={filters}
          onChange={setFilters}
          opportunities={allCards}
          visibleCount={filtered.length}
          totalCount={allCards.length}
        />
      </header>

      {isConnected && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-lg font-medium">Your cards</h2>
            <span className="text-xs text-ink/45">
              {positionsLoading ? 'Loading…' : `${positions.length} held`}
            </span>
          </div>
          {!positionsLoading && positions.length === 0 && (
            <div className="border border-dashed border-border rounded-2xl p-6 text-sm text-ink/55">
              No positions yet — pick a card below and deposit from your wallet.
            </div>
          )}
          <div className="flex flex-col gap-3">
            {positions.map((p) => (
              <PositionCard key={p.opportunity.id} position={p} />
            ))}
          </div>
        </section>
      )}

      {!isConnected && (
        <div className="rounded-2xl border border-border bg-white/[0.02] p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <p className="text-sm text-ink/65 max-w-md">
            Connect to deposit. New here? Email or a passkey creates a wallet — Openhand never
            holds your keys. Already have MetaMask or Rabby? Use that instead.
          </p>
          <ConnectButtonClient />
        </div>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-lg font-medium">Collection</h2>
          <Link href="/opportunities" className="text-xs text-accent hover:underline">
            Full list →
          </Link>
        </div>

        {isLoading && <div className="text-ink/50 text-sm">Loading live rates…</div>}
        {isError && (
          <div className="text-danger text-sm">
            Couldn&apos;t load opportunities. Check your network and try again.
          </div>
        )}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-ink/50 text-sm">
            No cards match these filters. Try another chain or category, or switch network mode to
            mainnet in `.env.local` to see Base / Arbitrum yields.
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
