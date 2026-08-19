export const REFERRAL_CODE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,39}$/;
export const REFERRAL_NONCE_PATTERN = /^[a-z0-9-]{8,80}$/;
const MAX_SOURCE_PATH_LENGTH = 120;

export type ReferralSignaturePayload = {
  version: 'v1';
  refCode: string;
  address: string;
  issuedAt: string;
  nonce: string;
};

export function sanitizeReferralCode(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (!REFERRAL_CODE_PATTERN.test(normalized)) return null;
  return normalized;
}

export function sanitizeReferralSourcePath(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > MAX_SOURCE_PATH_LENGTH) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('/admin') || value.startsWith('/api')) return null;
  return value.split('?')[0]?.split('#')[0] ?? null;
}

export function createReferralSignaturePayload(
  refCode: string,
  address: string,
): ReferralSignaturePayload {
  return {
    version: 'v1',
    refCode,
    address,
    issuedAt: new Date().toISOString(),
    nonce: createNonce(),
  };
}

export function buildReferralSignatureMessage(payload: ReferralSignaturePayload): string {
  return [
    'Openhand referral attribution',
    `Version: ${payload.version}`,
    `Referral code: ${payload.refCode}`,
    `Wallet address: ${payload.address}`,
    `Issued at (UTC): ${payload.issuedAt}`,
    `Nonce: ${payload.nonce}`,
    'Statement: I opt in to link this referral code to this wallet for Openhand referral attribution.',
  ].join('\n');
}

export function isReferralPayloadFresh(
  issuedAt: string,
  maxAgeMs = 15 * 60 * 1000,
  maxClockSkewMs = 5 * 60 * 1000,
): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;
  const ageMs = Date.now() - parsed;
  if (ageMs < -maxClockSkewMs) return false;
  return ageMs <= maxAgeMs;
}

function createNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
