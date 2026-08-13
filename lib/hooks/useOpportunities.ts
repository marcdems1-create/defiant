'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAllOpportunities } from '@/lib/protocols/aggregate';

export function useOpportunities() {
  return useQuery({
    queryKey: ['opportunities'],
    queryFn: fetchAllOpportunities,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
