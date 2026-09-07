'use client';

import { useQuery } from '@tanstack/react-query';
import type { StockArbRow } from '@/lib/lifi/stockArb';

/** Refetch on a slower cadence than the catalog — this backs a 5-min server cache that fires real LI.FI quotes. */
export function useStockArbRows() {
  return useQuery({
    queryKey: ['lifi-stock-arb'],
    queryFn: async (): Promise<StockArbRow[]> => {
      const res = await fetch('/api/lifi/stock-arb');
      if (!res.ok) return [];
      const json = (await res.json()) as { rows?: StockArbRow[] };
      return Array.isArray(json.rows) ? json.rows : [];
    },
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
