import type { Metadata } from 'next';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from './site';

export const DEFAULT_TITLE = `${SITE_NAME} — non-custodial DeFi yield`;

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
  /** Full document title, not `{title} — Openhand`. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      type: 'website',
      url,
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
    },
  };
}

export function homeMetadata(): Metadata {
  return pageMetadata({
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    path: '/',
    absoluteTitle: true,
  });
}

export function opportunityMetadata(args: {
  protocolLabel: string;
  assetSymbol: string;
  chainName: string;
  description: string;
  id: string;
  apy: number | null;
}): Metadata {
  const title = `${args.protocolLabel} ${args.assetSymbol} on ${args.chainName}`;
  const apyBit =
    args.apy != null && Number.isFinite(args.apy) && args.apy > 0
      ? `Live ${(args.apy * 100).toFixed(2)}% APY (not guaranteed). `
      : '';
  const base = args.description.trim();
  let description = `${apyBit}${base}`;
  if (description.length > 160) {
    description = `${apyBit}${args.protocolLabel} ${args.assetSymbol} on ${args.chainName}. You sign every deposit and withdrawal. Openhand never holds your funds. Yield is not insured.`.trim();
  }
  return pageMetadata({
    title,
    description,
    path: `/opportunities/${args.id}`,
  });
}

export { SITE_URL };
