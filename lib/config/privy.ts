/**
 * Privy is third-party wallet infra — not Openhand custody.
 * Email/passkey users get an embedded wallet Privy holds key material for.
 * Openhand never sees a private key and must not persist the email.
 *
 * Leave NEXT_PUBLIC_PRIVY_APP_ID unset to keep RainbowKit-only connect.
 */
export function privyAppId(): string | undefined {
  const id = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  return id || undefined;
}
