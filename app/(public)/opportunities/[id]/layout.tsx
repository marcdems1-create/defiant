import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { opportunityMetadata } from '@/lib/config/seo';
import { chainName } from '@/lib/format';
import { getCatalogEntry } from '@/lib/protocols/catalog';
import { loadOpportunityPage } from '@/lib/protocols/opportunityPage';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const data = await loadOpportunityPage(params.id);
  const catalog = data?.catalog ?? getCatalogEntry(params.id);
  if (!catalog) {
    return { title: 'Card not found', robots: { index: false, follow: false } };
  }
  const apy = data?.live && data.live.apy > 0 ? data.live.apy : null;
  return opportunityMetadata({
    protocolLabel: catalog.protocolLabel,
    assetSymbol: catalog.assetSymbol,
    chainName: chainName(catalog.chainId),
    description: catalog.description,
    id: catalog.id,
    apy,
  });
}

export default function OpportunityLayout({ children }: { children: ReactNode }) {
  return children;
}
