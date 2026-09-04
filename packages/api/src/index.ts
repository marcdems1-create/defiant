/**
 * Phase 1 scaffold — empty on purpose. Phase 5 adds the HTTP layer:
 *
 *   GET  /v1/opportunities?asset=&chain=&maxRisk=
 *   GET  /v1/opportunities/:id
 *   GET  /v1/positions/:address
 *   POST /v1/tx/deposit    -> unsigned TxRequest
 *   POST /v1/tx/withdraw   -> unsigned TxRequest
 *
 * Every response from the two tx routes is a TxRequest built by
 * @defiant/core and never signed here — this package holds no signer either.
 * No auth or rate limiting yet; note where they'd go when this gets built.
 */
export const API_PACKAGE_VERSION = '0.1.0';
