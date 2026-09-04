/**
 * Client-only helpers for the installable PWA.
 * Do not import from server components — reads window/navigator.
 */

export const INSTALL_DISMISS_KEY = 'oh.install.dismissedAt';

/** "Later" hides the install prompt for two weeks. */
export const INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
}

export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const iPadOs =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

export function isIosSafari(): boolean {
  if (!isIosDevice()) return false;
  const ua = window.navigator.userAgent;
  return !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
}

export function installPromptIsSnoozed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(INSTALL_DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < INSTALL_SNOOZE_MS;
  } catch {
    return false;
  }
}

export function snoozeInstallPrompt(): void {
  try {
    window.localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
  } catch {
    /* private mode / blocked storage — banner will just dismiss for this session */
  }
}
