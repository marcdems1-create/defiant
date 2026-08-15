'use client';

import { useMemo, useState } from 'react';
import type { Opportunity } from '@/lib/protocols/types';
import type { ApyHistoryPoint } from '@/lib/protocols/apyHistory';
import { useApyHistory } from '@/lib/hooks/useApyHistory';
import { formatApy } from '@/lib/format';

type Period = '30D' | '90D' | '1Y';

const PERIOD_MS: Record<Period, number> = {
  '30D': 30 * 86_400_000,
  '90D': 90 * 86_400_000,
  '1Y': 365 * 86_400_000,
};

function formatDay(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function filterPeriod(points: ApyHistoryPoint[], period: Period): ApyHistoryPoint[] {
  const cutoff = Date.now() - PERIOD_MS[period];
  const sliced = points.filter((p) => p.timestamp >= cutoff);
  return sliced.length >= 2 ? sliced : points.slice(-Math.min(points.length, 30));
}

function ApyChartSvg({
  points,
  liveApy,
}: {
  points: ApyHistoryPoint[];
  liveApy: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const width = 400;
  const height = 180;
  const padX = 48;
  const padY = 22;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const values = points.map((p) => p.apy);
  const minY = Math.min(...values, liveApy) * 0.92;
  const maxY = Math.max(...values, liveApy) * 1.08;
  const rangeY = maxY - minY || 0.01;
  const minX = points[0].timestamp;
  const maxX = points[points.length - 1].timestamp;
  const rangeX = maxX - minX || 1;

  const coords = points.map((p) => ({
    ...p,
    x: padX + ((p.timestamp - minX) / rangeX) * chartW,
    y: padY + chartH - ((p.apy - minY) / rangeY) * chartH,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(2)} ${padY + chartH} L ${coords[0].x.toFixed(2)} ${padY + chartH} Z`;

  const liveY = padY + chartH - ((liveApy - minY) / rangeY) * chartH;
  const hovered = hover !== null ? coords[hover] : null;

  function onMove(event: React.MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const d = Math.abs(coords[i].x - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    setHover(best);
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Historical APY chart"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="apyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => {
          const y = padY + chartH * (1 - t);
          const val = minY + rangeY * t;
          return (
            <g key={t}>
              <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="#1e232b" strokeWidth="1" />
              <text x={padX - 6} y={y + 3.5} textAnchor="end" fill="#f2f4f7" opacity="0.35" fontSize="9">
                {formatApy(val)}
              </text>
            </g>
          );
        })}

        <line
          x1={padX}
          y1={liveY}
          x2={width - padX}
          y2={liveY}
          stroke="#3ecf8e"
          strokeWidth="1"
          strokeDasharray="4 3"
          opacity="0.45"
        />

        <path d={areaPath} fill="url(#apyFill)" />
        <path d={linePath} fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round" />

        <text x={padX} y={height - 2} fill="#f2f4f7" opacity="0.4" fontSize="9">
          {formatDay(minX)}
        </text>
        <text x={width - padX} y={height - 2} textAnchor="end" fill="#f2f4f7" opacity="0.4" fontSize="9">
          {formatDay(maxX)}
        </text>

        {hovered && (
          <g>
            <line
              x1={hovered.x}
              y1={padY}
              x2={hovered.x}
              y2={padY + chartH}
              stroke="#f2f4f7"
              strokeWidth="1"
              opacity="0.2"
            />
            <circle cx={hovered.x} cy={hovered.y} r="4" fill="#0b0e11" stroke="#3ecf8e" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hovered && (
        <div className="absolute top-1 right-2 rounded-lg border border-border bg-paper/95 px-2.5 py-1.5 text-xs font-mono">
          <div className="text-ink/45">{formatDay(hovered.timestamp)}</div>
          <div className="text-accent">{formatApy(hovered.apy)}</div>
        </div>
      )}
    </div>
  );
}

export function ApyHistoryChart({ opportunity }: { opportunity: Opportunity }) {
  const { data, isLoading, isError } = useApyHistory(opportunity);
  const [period, setPeriod] = useState<Period>('90D');

  const points = useMemo(
    () => (data && data.length >= 2 ? filterPeriod(data, period) : []),
    [data, period],
  );

  const stats = useMemo(() => {
    if (points.length < 2) return null;
    const apys = points.map((p) => p.apy);
    return {
      min: Math.min(...apys),
      max: Math.max(...apys),
      latest: points[points.length - 1].apy,
    };
  }, [points]);

  return (
    <section className="rounded-2xl border border-border bg-white/[0.02] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.12em] text-accent">
            APY history
          </h2>
          <p className="text-xs text-ink/50 mt-1 max-w-md leading-relaxed">
            {opportunity.apyCompounded
              ? 'Daily compounded base APY (borrower interest). Dashed line is today’s live on-chain rate. WELL rewards are not included.'
              : 'Daily APY snapshots. Dashed line is today’s live rate. Not a forecast.'}
          </p>
        </div>
        <div className="flex gap-1.5">
          {(['30D', '90D', '1Y'] as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                period === p
                  ? 'bg-accent text-paper border-accent'
                  : 'border-border text-ink/70 hover:border-ink/40'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-44 text-sm text-ink/45">
          Loading APY history…
        </div>
      )}

      {!isLoading && (isError || points.length < 2) && (
        <div className="flex items-center justify-center h-44 text-sm text-ink/45 border border-dashed border-border rounded-xl">
          No historical APY series for this market right now.
        </div>
      )}

      {!isLoading && points.length >= 2 && (
        <>
          <ApyChartSvg points={points} liveApy={opportunity.apy} />
          {stats && (
            <div className="flex flex-wrap gap-4 mt-3 text-xs font-mono text-ink/55">
              <span>
                Window min <span className="text-ink/80">{formatApy(stats.min)}</span>
              </span>
              <span>
                Window max <span className="text-ink/80">{formatApy(stats.max)}</span>
              </span>
              <span>
                Latest snapshot <span className="text-ink/80">{formatApy(stats.latest)}</span>
              </span>
              <span>
                Live now <span className="text-accent">{formatApy(opportunity.apy)}</span>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
