# @defiant/risk

Risk classification for Openhand's yield opportunities.

**Status: Phase 1 scaffold. No risk logic lives here yet.** The current
(coarse, two-tier) classification is still in `apps/web/lib/protocols/`.

## Planned shape (Phase 4)

Versioned, typed records — tier, protocol maturity, fee level, exit profile
— each storing *why*, not just the label, so a rating change is diffable
over time instead of a silent overwrite.
