import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const COOKIE = 'oh_admin';

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

function sessionToken(): string | null {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  return createHmac('sha256', secret).update('openhand-admin-v1').digest('hex');
}

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const a = createHash('sha256').update(password).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function isAdminSession(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  const got = cookies().get(COOKIE)?.value;
  if (!got || got.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(token));
}

export function adminCookieValue(): string | null {
  return sessionToken();
}

export const ADMIN_COOKIE = COOKIE;

export function visitorHash(ip: string | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.ADMIN_PASSWORD || process.env.DATABASE_URL || 'openhand';
  const day = new Date().toISOString().slice(0, 10);
  return createHash('sha256').update(`${salt}:${day}:${ip}`).digest('hex').slice(0, 16);
}
