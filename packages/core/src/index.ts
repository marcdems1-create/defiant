/**
 * Phase 1 scaffold — empty on purpose. See CLAUDE.md ("Repo layout note") for the
 * plan: Phase 2 extracts the real YieldAdapter implementations out of
 * apps/web/components/DepositWithdrawModal.tsx (deposit/withdraw building),
 * apps/web/lib/protocols/*.ts (rate reads), and apps/web/lib/hooks/usePositions.ts
 * (position reads) into per-protocol adapters here.
 *
 * Hard constraint carried over from apps/web: adapters build unsigned
 * TxRequest objects. They never hold a signer, never call sendTransaction,
 * never call writeContract. Signing stays the caller's job (a connected
 * wallet in apps/web, or whatever holds packages/api's HTTP layer in Phase 5).
 */
export const CORE_PACKAGE_VERSION = '0.1.0';
