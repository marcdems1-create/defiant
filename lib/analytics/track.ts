'use client';

import type { AnalyticsEvent } from './events';

export function track(
  event: AnalyticsEvent,
  extra?: { path?: string; opportunityId?: string; chainId?: number },
): void {
  if (typeof window === 'undefined') return;
  const path = extra?.path ?? window.location.pathname;
  void fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      path,
      opportunityId: extra?.opportunityId,
      chainId: extra?.chainId,
    }),
    keepalive: true,
  }).catch(() => {
    /* swallow — analytics must never break the product */
  });
}
