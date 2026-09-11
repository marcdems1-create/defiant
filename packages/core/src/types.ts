import type { Address } from 'viem';

export type { Address };

/**
 * An unsigned transaction request. Adapters build these; they never sign or
 * send them — that stays the caller's job (a connected wallet in apps/web
 * today; whatever holds packages/api's HTTP layer in Phase 5). This is the
 * hard constraint carried over from the non-custodial web app: an adapter
 * that called `sendTransaction`/`writeContract` itself, or held a signer,
 * would break it.
 */
export interface TxRequest {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
  value?: bigint;
  chainId: number;
}

/** Annualized yield. `null` means "couldn't read a confident rate" — never a guessed number. */
export interface RateQuote {
  /** Decimal, e.g. 0.045 = 4.5%. */
  apy: number;
  /** True when `apy` is already-compounded APY, not a simple annualized rate (APR). */
  apyCompounded?: boolean;
}

export interface Position {
  /** Balance denominated in the adapter's underlying `asset` units. */
  balance: bigint;
}

/**
 * Distinguishes how an exit actually behaves. Two shapes today — Phase 0's
 * survey found exactly two real ones among the kept protocols once the
 * one-way Convex cvxCRV opportunity was cut, so a third "one-way" variant
 * isn't modeled here. Add one if a future adapter needs it rather than
 * flattening it into 'instant'.
 */
export type ExitProfile =
  | { type: 'instant' }
  | { type: 'queued'; description: string };

/**
 * A single yield opportunity's adapter. Reads (`getRate`, `getPosition`) may
 * touch a chain via an injected client; `buildDeposit`/`buildWithdraw` never
 * do I/O and never sign — see `TxRequest`.
 */
export interface YieldAdapter {
  readonly id: string;
  readonly chainId: number;
  readonly asset: Address;
  readonly protocol: string;

  getRate(): Promise<RateQuote | null>;
  getPosition(user: Address): Promise<Position>;
  buildDeposit(user: Address, amount: bigint): Promise<TxRequest>;
  buildWithdraw(user: Address, shares: bigint): Promise<TxRequest>;
  exitProfile(): ExitProfile;
}
