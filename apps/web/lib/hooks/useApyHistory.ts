'use client';

import { useQuery } from '@tanstack/react-query';
import type { Opportunity } from '@/lib/protocols/types';
import { fetchApyHistory } from '@/lib/protocols/apyHistory';

export function useApyHistory(opportunity: Opportunity) {
  return useQuery({
    queryKey: ['apy-history', opportunity.id],
    queryFn: () => fetchApyHistory(opportunity),
    staleTime: 5 * 60_000,
  });
}
