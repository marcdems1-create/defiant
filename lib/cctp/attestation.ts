import { pad } from 'viem';
import { CCTP_IRIS_URL } from '@/lib/config/cctp';

export function addressToBytes32(address: `0x${string}`): `0x${string}` {
  return pad(address, { size: 32 });
}

export interface CctpAttestation {
  message: `0x${string}`;
  attestation: `0x${string}`;
}

export function isCctpTxHash(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function asHexBytes(value: unknown): `0x${string}` | null {
  if (typeof value !== 'string' || !value.startsWith('0x') || value.length < 10) return null;
  if (value === '0x' || value === '0x0') return null;
  return value as `0x${string}`;
}

/** Parse Circle Iris `/v2/messages` JSON. Missing/pending attestation → null. */
export function parseIrisMessages(json: unknown): CctpAttestation | null {
  if (!json || typeof json !== 'object') return null;
  const messages = (json as { messages?: unknown }).messages;
  const row = Array.isArray(messages) ? messages[0] : undefined;
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  if (typeof record.status === 'string' && record.status !== 'complete') return null;
  const message = asHexBytes(record.message);
  const attestation = asHexBytes(record.attestation);
  if (!message || !attestation) return null;
  return { message, attestation };
}

/**
 * Circle Iris attestation — public, no API key
 * (https://developers.circle.com/api-reference/iris/cctp/get-messages).
 * Server-only. Browser callers use `/api/cctp/attestation` to avoid CORS.
 * Parse-failure → null, never guessed.
 */
export async function fetchIrisAttestation(
  sourceDomain: number,
  transactionHash: `0x${string}`,
): Promise<CctpAttestation | null> {
  try {
    const res = await fetch(
      `${CCTP_IRIS_URL}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    return parseIrisMessages(await res.json());
  } catch {
    return null;
  }
}

/**
 * Same-origin wrapper so the Move page never talks to Iris from the browser.
 */
export async function fetchCctpAttestation(
  sourceDomain: number,
  transactionHash: `0x${string}`,
): Promise<CctpAttestation | null> {
  try {
    const res = await fetch(
      `/api/cctp/attestation?sourceDomain=${sourceDomain}&transactionHash=${transactionHash}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { message?: unknown; attestation?: unknown } | null;
    const message = asHexBytes(json?.message);
    const attestation = asHexBytes(json?.attestation);
    if (!message || !attestation) return null;
    return { message, attestation };
  } catch {
    return null;
  }
}
