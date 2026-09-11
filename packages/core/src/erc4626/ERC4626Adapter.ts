import type { PublicClient } from 'viem';
import { erc4626Abi } from '../abi/erc4626';
import type { Address, ExitProfile, Position, RateQuote, TxRequest, YieldAdapter } from '../types';

export interface Erc4626AdapterConfig {
  id: string;
  chainId: number;
  protocol: string;
  /** The vault contract — deposit target, position token, and the ERC-4626 interface all in one address. */
  vault: Address;
  asset: Address;
}

/**
 * Pure tx builders, no adapter instance required. Useful for a caller that
 * already knows an opportunity's vault/chain (e.g. apps/web's
 * DepositWithdrawModal working from its own Opportunity catalog entry) and
 * just needs the unsigned request — instantiating a concrete YearnAdapter/
 * MorphoAdapter/FluidAdapter would be unnecessary ceremony for that. The
 * `ERC4626Adapter` instance methods below delegate to these, so there's one
 * source of truth either way.
 */
export function buildErc4626Deposit(vault: Address, chainId: number, user: Address, amount: bigint): TxRequest {
  return { address: vault, abi: erc4626Abi, functionName: 'deposit', args: [amount, user], chainId };
}

export function buildErc4626Withdraw(vault: Address, chainId: number, user: Address, shares: bigint): TxRequest {
  return { address: vault, abi: erc4626Abi, functionName: 'redeem', args: [shares, user, user], chainId };
}

/**
 * Base class for every protocol that implements plain ERC-4626
 * `deposit(assets, receiver)` / `redeem(shares, owner, owner)` — Yearn v3,
 * Morpho, and Fluid, per the Phase 0 survey. `buildDeposit`/`buildWithdraw`/
 * `exitProfile` never touch `client` and never need one — a caller building
 * a transaction for an opportunity it already knows the vault address for
 * (e.g. apps/web's DepositWithdrawModal) can construct an instance without
 * a client at all. Only `getRate`/`getPosition` require one, and throw a
 * clear error if called without it instead of failing silently.
 */
export abstract class ERC4626Adapter implements YieldAdapter {
  readonly id: string;
  readonly chainId: number;
  readonly asset: Address;
  readonly protocol: string;
  /** The vault contract — also the deposit target and position/balance token. Public: callers (e.g. apps/web) need it for approvals and balance reads. */
  readonly vault: Address;
  protected readonly client?: PublicClient;

  constructor(cfg: Erc4626AdapterConfig, client?: PublicClient) {
    this.id = cfg.id;
    this.chainId = cfg.chainId;
    this.protocol = cfg.protocol;
    this.vault = cfg.vault;
    this.asset = cfg.asset;
    this.client = client;
  }

  private requireClient(): PublicClient {
    if (!this.client) {
      throw new Error(`${this.id}: a client is required for on-chain reads (getRate/getPosition)`);
    }
    return this.client;
  }

  /** Rate sourcing is protocol-specific (on-chain read vs. third-party API) — no default. */
  abstract getRate(): Promise<RateQuote | null>;

  async getPosition(user: Address): Promise<Position> {
    const client = this.requireClient();
    const shares = await client.readContract({
      address: this.vault,
      abi: erc4626Abi,
      functionName: 'balanceOf',
      args: [user],
    });
    if (shares === 0n) return { balance: 0n };
    const balance = await client.readContract({
      address: this.vault,
      abi: erc4626Abi,
      functionName: 'convertToAssets',
      args: [shares],
    });
    return { balance };
  }

  async buildDeposit(user: Address, amount: bigint): Promise<TxRequest> {
    return buildErc4626Deposit(this.vault, this.chainId, user, amount);
  }

  async buildWithdraw(user: Address, shares: bigint): Promise<TxRequest> {
    return buildErc4626Withdraw(this.vault, this.chainId, user, shares);
  }

  exitProfile(): ExitProfile {
    return { type: 'instant' };
  }
}
