/**
 * Privy is third-party wallet infra — not Openhand custody.
 * Email/passkey users get an embedded wallet Privy holds key material for.
 * Openhand never sees a private key and must not persist the email.
 *
 * The App ID is a public client identifier (same class as a WalletConnect
 * project ID). Override with NEXT_PUBLIC_PRIVY_APP_ID, or set it to "off"
 * to fall back to RainbowKit-only connect.
 *
 * Never put the Privy App Secret in NEXT_PUBLIC_* — that value is baked into
 * the browser bundle. A secret here crashes Privy ("invalid Privy app ID")
 * and leaks the key.
 */
const DEFAULT_PRIVY_APP_ID = 'cmstzz2zb009k0el4fzr8x8jb';

function looksLikePrivyAppId(id: string): boolean {
  // Dashboard App IDs look like cmstzz2zb009k0el4fzr8x8jb. Secrets start with
  // privy_app_secret_ and must never be used here.
  if (id.startsWith('privy_app_secret_')) return false;
  return /^c[lm][a-z0-9]{20,32}$/i.test(id);
}

export function privyAppId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  if (!id || id === 'off' || id === 'false') {
    return id === 'off' || id === 'false' ? undefined : DEFAULT_PRIVY_APP_ID;
  }
  if (!looksLikePrivyAppId(id)) {
    return DEFAULT_PRIVY_APP_ID;
  }
  return id;
}
