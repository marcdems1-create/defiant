# @defiant/core

Protocol adapters for Openhand's yield opportunities.

**Status: Phase 1 scaffold. No adapter logic lives here yet.** The real
deposit/withdraw/rate/position logic is still in `apps/web` — see the
`CLAUDE.md` "Repo layout note" at the repo root for exactly where.

## Hard constraint

Adapters **build** unsigned transaction requests. They never sign, never
send, never hold a private key or a signer. Every value-moving call stays
something the caller (today: a connected wallet in `apps/web`) signs itself.

## Planned shape (Phase 2)

```ts
interface YieldAdapter {
  id: string;
  chainId: number;
  asset: Address;
  protocol: string;

  getRate(): Promise<RateQuote>;
  getPosition(user: Address): Promise<Position>;
  buildDeposit(user: Address, amount: bigint): Promise<TxRequest>;
  buildWithdraw(user: Address, shares: bigint): Promise<TxRequest>;
  exitProfile(): ExitProfile;
}
```

Kept protocols (per the Phase 0 survey decision): Aave v3, Compound III,
Morpho, Yearn v3, Fluid, Sky, Moonwell, Maple, Lido. A shared
`ERC4626Adapter` base class covers Yearn v3, Morpho, and Fluid; the rest are
one-offs. `exitProfile()` distinguishes instant vs. queued (Lido, Maple) —
no one-way category needed since Convex (the only one-way exit) was cut.
