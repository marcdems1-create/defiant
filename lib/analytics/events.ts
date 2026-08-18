export const ANALYTICS_EVENTS = [
  'page_view',
  'connect_open',
  'deposit_open',
  'deposit_done',
  'withdraw_open',
  'withdraw_done',
  'onramp_open',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(value);
}

export function sanitizePath(path: unknown): string | null {
  if (typeof path !== 'string' || path.length === 0 || path.length > 120) return null;
  if (!path.startsWith('/')) return null;
  if (path.startsWith('/admin') || path.startsWith('/api')) return null;
  return path.split('?')[0]?.split('#')[0] ?? null;
}

export function sanitizeOpportunityId(id: unknown): string | null {
  if (typeof id !== 'string' || id.length === 0 || id.length > 80) return null;
  if (!/^[a-z0-9._-]+$/i.test(id)) return null;
  return id;
}
