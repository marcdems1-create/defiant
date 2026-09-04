'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics/track';

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith('/admin')) return;
    track('page_view', { path: pathname });
  }, [pathname]);

  return null;
}
