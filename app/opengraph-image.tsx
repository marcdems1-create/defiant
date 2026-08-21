import { ImageResponse } from 'next/og';

export const alt = 'Openhand — non-custodial DeFi yield';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
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
            fontSize: 48,
            fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          }}
        >
          openhand
          <span style={{ color: '#3ecf8e' }}>.</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              color: '#f4f1ea',
              fontSize: 58,
              fontWeight: 500,
              lineHeight: 1.15,
              maxWidth: 900,
            }}
          >
            Non-custodial DeFi yield
          </div>
          <div
            style={{
              display: 'flex',
              color: 'rgba(244,241,234,0.58)',
              fontSize: 28,
              maxWidth: 820,
              lineHeight: 1.35,
            }}
          >
            Compare live on-chain rates. You sign every deposit. Openhand never holds your funds.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
