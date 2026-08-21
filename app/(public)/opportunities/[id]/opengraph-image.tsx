import { ImageResponse } from 'next/og';
import { getCatalogEntry } from '@/lib/protocols/catalog';
import { chainName } from '@/lib/format';

export const alt = 'Openhand yield card';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: { id: string } }) {
  const catalog = getCatalogEntry(params.id);
  const protocol = catalog?.protocolLabel ?? 'Openhand';
  const chain = catalog ? chainName(catalog.chainId) : '';
  const asset = catalog?.assetSymbol ?? '';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b0e11',
          padding: 72,
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#f4f1ea',
            fontSize: 36,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}
        >
          openhand
          <span style={{ color: '#3ecf8e' }}>.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {chain ? (
            <div
              style={{
                display: 'flex',
                color: 'rgba(244,241,234,0.45)',
                fontSize: 22,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              }}
            >
              {chain}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              color: '#f4f1ea',
              fontSize: 64,
              fontWeight: 500,
              lineHeight: 1.1,
            }}
          >
            {protocol}
          </div>
          <div style={{ display: 'flex', color: '#3ecf8e', fontSize: 36 }}>
            {asset ? `${asset} yield` : 'Non-custodial DeFi yield'}
          </div>
          <div style={{ display: 'flex', color: 'rgba(244,241,234,0.55)', fontSize: 24, maxWidth: 860 }}>
            You sign every deposit. Openhand never holds your funds. Yield is not insured.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
