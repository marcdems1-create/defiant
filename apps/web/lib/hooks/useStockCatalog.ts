'use client';

import { useQuery } from '@tanstack/react-query';
import type { StockToken } from '@/lib/lifi/stocks';

export function useStockCatalog() {
  return useQuery({
    queryKey: ['lifi-stocks'],
    queryFn: async (): Promise<StockToken[]> => {
      const res = await fetch('/api/lifi/stocks');
      if (!res.ok) return [];
      const json = (await res.json()) as { tokens?: StockToken[] };
      return Array.isArray(json.tokens) ? json.tokens : [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
