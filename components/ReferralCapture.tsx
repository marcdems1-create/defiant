'use client';

import { useEffect } from 'react';
import { captureRefCode } from '@/lib/referrals';

/**
 * Reads a `?ref=<address>` param on any page load and stashes it in
 * localStorage so it survives until the visitor connects a wallet and accepts
 * the invite on /refer. Renders nothing. Reads window.location directly (not
 * useSearchParams) to avoid forcing a Suspense boundary on every route.
 */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('ref');
      if (code) captureRefCode(code);
    } catch {
      // no-op — a malformed URL just means no referral is captured
    }
  }, []);

  return null;
}
