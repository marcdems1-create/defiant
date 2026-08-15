/**
 * Privy is third-party wallet infra — not Openhand custody.
 * Email/passkey users get an embedded wallet Privy holds key material for.
 * Openhand never sees a private key and must not persist the email.
 *
 * The App ID is a public client identifier (same class as a WalletConnect
 * project ID). Override with NEXT_PUBLIC_PRIVY_APP_ID, or set it to "off"
 * to fall back to RainbowKit-only connect.
 */
const DEFAULT_PRIVY_APP_ID = 'cmstzz2zb009k0el4fzr8x8jb';

export function privyAppId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  if (id === 'off' || id === 'false') return undefined;
  return id || DEFAULT_PRIVY_APP_ID;
}
