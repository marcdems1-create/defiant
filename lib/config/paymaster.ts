import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { AAVE_V3 } from '@/lib/config/addresses';

/**
 * Circle Paymaster (permissionless ERC-4337) — user pays gas in USDC, Circle
 * fronts ETH. Openhand never holds, relays, or sponsors funds.
 *
 * Addresses verified 2026-08-18 against Circle's own registry:
 * https://developers.circle.com/paymaster/addresses-and-events
 *
 * We use Paymaster v0.8 (EntryPoint 0.8) because viem's
 * `toSimple7702SmartAccount` defaults to EntryPoint 0.8. Same contract
 * address on every v0.8 chain.
 *
 * Do not substitute a v0.7 address here — the UserOp encoding will not match.
 */
export const CIRCLE_PAYMASTER_V08 = {
  [mainnet.id]: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
  [base.id]: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
  [arbitrum.id]: '0x0578cFB241215b77442a541325d6A4E6dFE700Ec',
  [sepolia.id]: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
  [baseSepolia.id]: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
  [arbitrumSepolia.id]: '0x3BA9A96eE3eFf3A69E2B18886AcF52027EFF8966',
} as const satisfies Record<number, `0x${string}`>;

/**
 * eth-infinitism Simple7702Account implementation that viem 2.55 delegates to.
 * Circle's EIP-7702 paymaster guide uses this same address.
 * https://github.com/eth-infinitism/account-abstraction/blob/develop/contracts/accounts/Simple7702Account.sol
 */
export const SIMPLE_7702_IMPLEMENTATION =
  '0xe6Cae83BdE06E4c305530e199D7217f42808555B' as const;

/**
 * USDC the paymaster is allowed to pull for one UserOp. Unused is refunded in
 * `_postOp`. Not `uint256.max` — non-negotiable #2. Circle still requires the
 * EIP-2612 *deadline* to be max uint256 (paymaster cannot read block.timestamp).
 *
 * L2 gas is cents; Ethereum UserOps can be dollars. Headroom, not a fee.
 */
export function gasPermitAmount(chainId: number): bigint {
  return chainId === mainnet.id || chainId === sepolia.id ? 5_000_000n : 1_000_000n;
}

export function circlePaymasterAddress(chainId: number): `0x${string}` | undefined {
  return CIRCLE_PAYMASTER_V08[chainId as keyof typeof CIRCLE_PAYMASTER_V08];
}

export function circleUsdcAddress(chainId: number): `0x${string}` | undefined {
  return AAVE_V3[chainId]?.usdc;
}

export function bundlerUrl(chainId: number): string {
  const override = process.env.NEXT_PUBLIC_BUNDLER_URL?.trim();
  if (override) return override.replace('{chainId}', String(chainId));
  // Circle's paymaster quickstart uses Pimlico's public bundler.
  // Override with NEXT_PUBLIC_BUNDLER_URL if this endpoint rate-limits.
  return `https://public.pimlico.io/v2/${chainId}/rpc`;
}

export function paymasterConfigured(chainId: number): boolean {
  return Boolean(circlePaymasterAddress(chainId) && circleUsdcAddress(chainId));
}

/** EIP-7702 delegated implementation, or null if the address is still a plain EOA. */
export function parseEip7702Implementation(
  code: string | undefined | null,
): `0x${string}` | null {
  if (!code || code === '0x' || code === '0x0') return null;
  const normalized = code.toLowerCase();
  if (!normalized.startsWith('0xef0100') || normalized.length < 48) return null;
  return `0x${normalized.slice(8, 48)}` as `0x${string}`;
}

export function isSimple7702Delegated(code: string | undefined | null): boolean {
  const impl = parseEip7702Implementation(code);
  return Boolean(impl && impl.toLowerCase() === SIMPLE_7702_IMPLEMENTATION.toLowerCase());
}
