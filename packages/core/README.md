# @defiant/core

Protocol adapters for Openhand's yield opportunities — unsigned tx builders, rate reads,
position reads. Consumed by `apps/web` via Next's `transpilePackages` (this package ships
its TypeScript source directly, `package.json`'s `main`/`types` point at `src/index.ts`,
not a compiled `dist/` — see the note under "Build" below before this package gets a second
consumer that runs outside a bundler).

## Hard constraint

Adapters **build** unsigned transaction requests. They never sign, never send, never hold a
private key or a signer. Every value-moving call stays something the caller (today: a
connected wallet in `apps/web`, via wagmi's `writeContract`) signs itself. `TxRequest` is
the boundary: an adapter hands one back, the caller decides how to get it signed.

## Interface

```ts
interface YieldAdapter {
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
```

`getRate()` returns `null` rather than a guessed number when a live source can't be read
with confidence — the adapter-level version of non-negotiable #3 in the repo's `CLAUDE.md`.
`exitProfile()` is `{ type: 'instant' }` or `{ type: 'queued', description }` — no one-way
variant, since Convex (the only one-way exit among the original 13 opportunities) was cut
during the Phase 0 review before this package existed.

## What's here (Phase 2, in progress)

- `ERC4626Adapter` (`src/erc4626/`) — base class for every protocol using plain ERC-4626
  `deposit(assets, receiver)` / `redeem(shares, owner, owner)`. `getPosition()` does
  `balanceOf` → `convertToAssets`; `buildDeposit`/`buildWithdraw`/`exitProfile()` never touch
  the injected `client` — a caller building a tx for an opportunity it already knows the
  vault address for doesn't need one. `buildErc4626Deposit`/`buildErc4626Withdraw` (plain
  functions, no instance needed) are exported for exactly that case —
  `apps/web/components/DepositWithdrawModal.tsx` uses them directly rather than
  constructing a `YearnAdapter`/`MorphoAdapter`/`FluidAdapter` just to call two methods it
  doesn't otherwise need.
- `YearnAdapter` / `discoverYearnAdapters` (`src/adapters/yearn.ts`) — Yearn's vault set is
  discovered dynamically from yDaemon, not configured statically, so discovery returns one
  adapter per vault already carrying its APY (`getRate()` just returns that, rather than
  re-fetching yDaemon's whole vault list per instance).
- `MorphoAdapter` / `createMorphoAdapters`, `FluidAdapter` / `createFluidAdapter`
  (`src/adapters/`) — static per-chain vault/vault-token config (`src/addresses.ts`),
  `getRate()` hits Morpho's GraphQL API or DeFiLlama respectively.
- `src/addresses.ts` — USDC per chain, Morpho vault config, Fluid `fUSDC` addresses. Moved
  (not re-derived) from `apps/web/lib/config/addresses.ts` — same values, same original
  citations, now owned here since these three adapters need them and this package can't
  depend on `apps/web`.
- `src/defillama.ts` — a **focused copy**, not a move, of the relevant parts of
  `apps/web/lib/protocols/defillama.ts`. That file's other consumers (Compound, Moonwell,
  Sky, Maple) aren't part of this extraction batch yet, so the `apps/web` copy can't be
  deleted without breaking them. Once every DeFiLlama-dependent protocol has an adapter
  here, delete the `apps/web` copy — tracked in `CLAUDE.md` so this doesn't linger
  unnoticed as accidental duplication.

**Not extracted yet:** Aave v3, Compound III, Sky, Maple, Lido — one-offs, per the original
plan, handled individually after this ERC-4626 batch is done and passing. Their
adapter/rate/tx-building logic is still inline in `apps/web`.

**Not wired into `apps/web`'s position display.** `getPosition()` works and is exercised by
nothing in `apps/web` yet — `lib/hooks/usePositions.ts` still reads all nine protocols'
balances through one batched `useReadContracts` call, which is a real performance property
(one multicall-shaped round trip instead of N separate reads) worth keeping deliberately
rather than trading away for interface purity in this batch. `getPosition()` exists for
Phase 3's fork tests and for `packages/api` (Phase 5) regardless.

## Build

`npm run build` (`tsc -b`) type-checks and would emit to `dist/`, but nothing in this repo
consumes that `dist/` output today — `apps/web` transpiles `src/` directly via Next's
`transpilePackages`. `tsconfig.base.json` (repo root) uses `moduleResolution: "bundler"` to
match that consumption path, which means relative imports here don't need explicit `.js`
extensions. If `packages/api` (Phase 5) ends up running as a plain `node` process outside a
bundler, Node's ESM loader *will* require those extensions at runtime — resolve that then
(add extensions, switch to `NodeNext`, or give `packages/api` its own bundler-based build
step) rather than assuming this config carries over unchanged.
