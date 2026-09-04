# @defiant/api

Thin HTTP layer over `@defiant/core` + `@defiant/risk`.

**Status: Phase 1 scaffold. No server exists yet.** Depends on
`@defiant/core` and `@defiant/risk` via npm workspace links and TS project
references, wired now so Phase 5 has somewhere to land — neither dependency
is actually imported yet.

## Planned routes (Phase 5)

```
GET  /v1/opportunities?asset=&chain=&maxRisk=
GET  /v1/opportunities/:id
GET  /v1/positions/:address
POST /v1/tx/deposit    -> unsigned TxRequest
POST /v1/tx/withdraw   -> unsigned TxRequest
```

No auth or rate limiting yet — note where they'd go, per the original spec,
rather than skip mentioning it. This package never holds a signer: both
`/v1/tx/*` routes return an unsigned `TxRequest` built by `@defiant/core`.
An OpenAPI spec ships alongside the routes.
