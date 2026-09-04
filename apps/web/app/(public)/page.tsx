import { CollectionClient } from '@/components/CollectionClient';
import { HowItWorks } from '@/components/HowItWorks';
import { ProductIntro } from '@/components/ProductIntro';
import { RiskDisclaimer } from '@/components/RiskDisclaimer';
import { fetchOpportunitiesForSsr } from '@/lib/protocols/ssr';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const opportunities = await fetchOpportunitiesForSsr();

  return (
    <div className="flex flex-col gap-10">
      <ProductIntro />
      <HowItWorks />
      <RiskDisclaimer compact />
      <CollectionClient initialOpportunities={opportunities} />
    </div>
  );
}
