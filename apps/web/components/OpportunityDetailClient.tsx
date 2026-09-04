'use client';

import { OpportunityDetail } from '@/components/OpportunityDetail';
import { WalletOnly } from '@/components/WalletOnly';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import type { Opportunity } from '@/lib/protocols/types';
import type { ReactNode } from 'react';

export function OpportunityDetailClient({
  id,
  initial,
  notFoundFallback,
}: {
  id: string;
  initial?: Opportunity;
  notFoundFallback: ReactNode;
}) {
  const fallback = initial ? (
    <OpportunityDetail opportunity={initial} />
  ) : (
    <div className="text-ink/50 text-sm">Loading card details…</div>
  );

  return (
    <WalletOnly fallback={fallback}>
      <OpportunityDetailLive id={id} initial={initial} notFoundFallback={notFoundFallback} />
    </WalletOnly>
  );
}

function OpportunityDetailLive({
  id,
  initial,
  notFoundFallback,
}: {
  id: string;
  initial?: Opportunity;
  notFoundFallback: ReactNode;
}) {
  const { data, isLoading, isError } = useOpportunities();
  const opportunity =
    data?.find((o) => o.id === id) ?? (initial?.id === id ? initial : undefined);

  if (isLoading && !opportunity) {
    return <div className="text-ink/50 text-sm">Loading card details…</div>;
  }

  if (isError && !opportunity) {
    return (
      <div className="text-danger text-sm">
        Couldn&apos;t load this opportunity. Check your network and try again.
      </div>
    );
  }

  if (!opportunity) return <>{notFoundFallback}</>;

  return <OpportunityDetail opportunity={opportunity} />;
}
