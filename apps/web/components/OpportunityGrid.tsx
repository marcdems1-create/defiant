import type { Opportunity } from '@/lib/protocols/types';
import { OpportunityCard } from './OpportunityCard';

export function OpportunityGrid({ opportunities }: { opportunities: Opportunity[] }) {
  if (opportunities.length === 0) {
    return (
      <p className="text-ink/50 text-sm">
        Live on-chain rates load in your browser. Openhand never shows a guessed APY.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {opportunities.map((opp) => (
        <OpportunityCard key={opp.id} opportunity={opp} />
      ))}
    </div>
  );
}
