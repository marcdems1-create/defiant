'use client';

import { useQuery } from '@tanstack/react-query';
import type { CryptoToken } from '@/lib/lifi/crypto';

export function useCryptoCatalog() {
  return useQuery({
    queryKey: ['lifi-crypto'],
    queryFn: async (): Promise<CryptoToken[]> => {
      const res = await fetch('/api/lifi/crypto');
      if (!res.ok) return [];
      const json = (await res.json()) as { tokens?: CryptoToken[] };
      return Array.isArray(json.tokens) ? json.tokens : [];
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
