'use client';

import { useQuery } from '@tanstack/react-query';
import type { GoldToken } from '@/lib/lifi/gold';

export function useGoldCatalog() {
  return useQuery({
    queryKey: ['lifi-gold'],
    queryFn: async (): Promise<GoldToken[]> => {
      const res = await fetch('/api/lifi/gold');
      if (!res.ok) return [];
      const json = (await res.json()) as { tokens?: GoldToken[] };
      return Array.isArray(json.tokens) ? json.tokens : [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
