'use client';

import type { ProjectionPoint } from '@/lib/portfolio/analytics';

interface GrowthChartProps {
  points: ProjectionPoint[];
  currentValue: number;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${(value / 1_000).toFixed(1)}k`;
  if (value >= 1_000) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2)}`;
}

export function GrowthChart({ points, currentValue }: GrowthChartProps) {
  if (currentValue <= 0 || points.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-ink/45 border border-dashed border-border rounded-xl">
        Add a stable position to see an illustrative projection.
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const minY = Math.min(...values) * 0.998;
  const maxY = Math.max(...values) * 1.002;
  const rangeY = maxY - minY || 1;

  const width = 400;
  const height = 180;
  const padX = 48;
  const padY = 28;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;
  const maxDay = points[points.length - 1]?.day ?? 365;

  const coords = points.map((p, i) => {
    const x = padX + (p.day / maxDay) * chartW;
    const y = padY + chartH - ((p.value - minY) / rangeY) * chartH;
    return { ...p, x, y, i };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padY + chartH} L ${coords[0].x} ${padY + chartH} Z`;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Illustrative growth projection chart"
      >
        <defs>
          <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ecf8e" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3ecf8e" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((t) => {
          const y = padY + chartH * (1 - t);
          const val = minY + rangeY * t;
          return (
            <g key={t}>
              <line
                x1={padX}
                y1={y}
                x2={width - padX}
                y2={y}
                stroke="#1e232b"
                strokeWidth="1"
              />
              <text x={padX - 6} y={y + 4} textAnchor="end" fill="#f2f4f7" opacity="0.35" fontSize="9">
                {formatUsd(val)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#growthFill)" />
        <path d={linePath} fill="none" stroke="#3ecf8e" strokeWidth="2" strokeLinecap="round" />

        {coords.map((c) => (
          <g key={c.day}>
            <circle cx={c.x} cy={c.y} r="4" fill="#0b0e11" stroke="#3ecf8e" strokeWidth="2" />
            <text
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              fill="#f2f4f7"
              opacity="0.5"
              fontSize="10"
            >
              {c.label}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex flex-wrap gap-4 mt-2 text-xs font-mono text-ink/55">
        {coords.slice(1).map((c) => {
          const gain = c.value - currentValue;
          const gainPct = currentValue > 0 ? (gain / currentValue) * 100 : 0;
          return (
            <span key={c.day}>
              {c.label}: {formatUsd(c.value)}{' '}
              <span className="text-accent">(+{gainPct.toFixed(1)}%)</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
