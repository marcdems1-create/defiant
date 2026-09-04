'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllOpportunities } from '@/lib/protocols/aggregate';
import type { Opportunity } from '@/lib/protocols/types';

export function useOpportunities(initialData?: Opportunity[]) {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchAllOpportunities,
    staleTime: 60_000,
    refetchInterval: 60_000,
    ...(initialData && initialData.length > 0 ? { initialData } : {}),
  });
}
