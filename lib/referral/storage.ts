'use client';

import { sanitizeReferralCode, sanitizeReferralSourcePath } from './shared';

const STORAGE_KEY = 'openhand.referral.pending.v1';

export type PendingReferral = {
  code: string;
  capturedAt: string;
  sourcePath: string | null;
};

export function readPendingReferral(): PendingReferral | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingReferral>;
    const code = sanitizeReferralCode(parsed.code);
    if (!code) return null;
    return {
      code,
      capturedAt: typeof parsed.capturedAt === 'string' ? parsed.capturedAt : new Date().toISOString(),
      sourcePath: sanitizeReferralSourcePath(parsed.sourcePath),
    };
  } catch {
    return null;
  }
}

export function capturePendingReferral(code: string, sourcePath: string): PendingReferral {
  const normalizedCode = sanitizeReferralCode(code);
  if (!normalizedCode) {
    throw new Error('invalid referral code');
  }
  const existing = readPendingReferral();
  if (existing) return existing;

  const pending: PendingReferral = {
    code: normalizedCode,
    capturedAt: new Date().toISOString(),
    sourcePath: sanitizeReferralSourcePath(sourcePath),
  };
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pending));
  }
  return pending;
}

export function clearPendingReferral(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
