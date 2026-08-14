'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOpportunities } from '@/lib/hooks/useOpportunities';
import { OpportunityDetail } from '@/components/OpportunityDetail';

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, isLoading, isError } = useOpportunities();

  const opportunity = data?.find((o) => o.id === params.id);

  if (isLoading) {
    return <div className="text-ink/50 text-sm">Loading card details…</div>;
  }

  if (isError) {
    return (
      <div className="text-danger text-sm">
        Couldn&apos;t load this opportunity. Check your network and try again.
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="max-w-md">
        <h1 className="text-xl font-medium mb-2">Card not found</h1>
        <p className="text-sm text-ink/55 mb-4">
          This yield card may have rotated off the live list, or the link is outdated.
        </p>
        <Link href="/opportunities" className="text-sm text-accent hover:underline">
          ← Browse all opportunities
        </Link>
      </div>
    );
  }

  return <OpportunityDetail opportunity={opportunity} />;
}
