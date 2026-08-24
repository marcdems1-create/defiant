import Link from 'next/link';
import { OpportunityDetailClient } from '@/components/OpportunityDetailClient';
import { fetchOpportunitiesForSsr } from '@/lib/protocols/ssr';

export const dynamic = 'force-dynamic';

export default async function OpportunityDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const opportunities = await fetchOpportunitiesForSsr();
  const initial = opportunities.find((o) => o.id === params.id);

  return (
    <OpportunityDetailClient
      id={params.id}
      initial={initial}
      notFoundFallback={
        <div className="max-w-md">
          <h1 className="text-xl font-medium mb-2">Card not found</h1>
          <p className="text-sm text-ink/55 mb-4">
            This yield card may have rotated off the live list, or the link is outdated. Live
            rates load in the browser — Openhand never invents an APY.
          </p>
          <Link href="/" className="text-sm text-accent hover:underline">
            ← Browse the collection
          </Link>
        </div>
      }
    />
  );
}
