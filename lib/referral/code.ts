import { getAddress } from 'viem';

/**
 * Stable wallet-derived referral code for v1 growth sharing.
 * Uses lowercase hex (address without 0x) so any connected wallet can
 * generate and verify its own code without another write path.
 */
export function referralCodeFromAddress(address: string): string {
  return getAddress(address).toLowerCase().slice(2);
}
