'use client';

import type { Opportunity } from '@/lib/protocols/types';
import {
  assetFilterOptions,
  CHAIN_FILTER_OPTIONS,
  hasActiveOpportunityFilters,
  RISK_FILTER_OPTIONS,
  type AssetFilter,
  type ChainFilter,
  type OpportunityFilterState,
  type RiskFilter,
} from '@/lib/opportunityFilters';

interface OpportunityFiltersProps {
  filters: OpportunityFilterState;
  onChange: (filters: OpportunityFilterState) => void;
  opportunities: Opportunity[];
  visibleCount: number;
  totalCount: number;
  className?: string;
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
        active
          ? 'bg-accent text-paper border-accent'
          : 'border-border text-ink/70 hover:border-ink/40'
      }`}
    >
      {children}
    </button>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] uppercase tracking-[0.16em] text-ink/40 font-mono">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function OpportunityFilters({
  filters,
  onChange,
  opportunities,
  visibleCount,
  totalCount,
  className = '',
}: OpportunityFiltersProps) {
  const assets = assetFilterOptions(opportunities);
  const showCount =
    hasActiveOpportunityFilters(filters) || visibleCount !== totalCount;

  function patch(partial: Partial<OpportunityFilterState>) {
    onChange({ ...filters, ...partial });
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <FilterGroup label="Chain">
        {CHAIN_FILTER_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            active={filters.chain === option.id}
            onClick={() => patch({ chain: option.id as ChainFilter })}
          >
            {option.label}
          </FilterPill>
        ))}
      </FilterGroup>

      <FilterGroup label="Risk">
        {RISK_FILTER_OPTIONS.map((option) => (
          <FilterPill
            key={option.id}
            active={filters.risk === option.id}
            onClick={() => patch({ risk: option.id as RiskFilter })}
          >
            {option.label}
          </FilterPill>
        ))}
      </FilterGroup>

      {assets.length > 1 && (
        <FilterGroup label="Asset">
          <FilterPill active={filters.asset === 'all'} onClick={() => patch({ asset: 'all' })}>
            All assets
          </FilterPill>
          {assets.map((symbol) => (
            <FilterPill
              key={symbol}
              active={filters.asset === symbol}
              onClick={() => patch({ asset: symbol as AssetFilter })}
            >
              {symbol}
            </FilterPill>
          ))}
        </FilterGroup>
      )}

      {showCount && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/45">
          <span>
            Showing {visibleCount} of {totalCount}{' '}
            {totalCount === 1 ? 'card' : 'cards'}
          </span>
          {hasActiveOpportunityFilters(filters) && (
            <button
              type="button"
              onClick={() =>
                onChange({
                  chain: 'all',
                  risk: 'all',
                  asset: 'all',
                })
              }
              className="text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
