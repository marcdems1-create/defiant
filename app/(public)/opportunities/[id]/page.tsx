import { notFound } from 'next/navigation';
import { OpportunityDetailView } from '@/components/OpportunityDetailView';
import { OpportunityDeposit, OpportunityDepositUnavailable } from '@/components/OpportunityDeposit';
import { ApyHistoryChart } from '@/components/ApyHistoryChart';
import { SITE_NAME, absoluteUrl } from '@/lib/config/site';
import { chainName } from '@/lib/format';
import { getCatalog } from '@/lib/protocols/catalog';
import { loadOpportunityPage } from '@/lib/protocols/opportunityPage';

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
  return getCatalog().map((entry) => ({ id: entry.id }));
}

export default async function OpportunityDetailPage({ params }: { params: { id: string } }) {
  const data = await loadOpportunityPage(params.id);
  if (!data) notFound();

  const { catalog, live } = data;
  const apy = live && live.apy > 0 ? live.apy : null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${catalog.protocolLabel} ${catalog.assetSymbol} on ${chainName(catalog.chainId)}`,
    description: catalog.description,
    url: absoluteUrl(`/opportunities/${catalog.id}`),
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: absoluteUrl('/') },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OpportunityDetailView
        catalog={catalog}
        apy={apy}
        chart={live ? <ApyHistoryChart opportunity={live} /> : null}
        actions={
          live ? (
            <OpportunityDeposit opportunity={live} />
          ) : (
            <OpportunityDepositUnavailable assetSymbol={catalog.assetSymbol} />
          )
        }
      />
    </>
  );
}
