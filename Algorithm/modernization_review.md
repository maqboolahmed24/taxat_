# Modernization Review

This note records the review findings that motivated the modernization merge and the contract repairs
that remain intentionally explicit in the current tree.

- **Implicit parent-config inheritance** was present in `core_engine.md` Phase 2, where every
  continuation materialized from `prior_manifest.config_freeze`; that bypassed the documented
  child-manifest inheritance policy and risked leaking historical non-live config into new
  amendment, remediation, analysis, or drift branches.
- **Branch-ladder reuse logic was ordered incorrectly**: exact idempotent retries were evaluated
  after generic continuation checks, so a same-request terminal or still-sealed manifest could
  allocate a child manifest instead of reusing the persisted bundle or sealed context.
- **Assertion-driven validation was used for request and lineage compatibility** (`runtime_scope`,
  tenant/client/period/mode, continuation legality), which is a legacy crash-oriented pattern for
  externally sourced inputs; these checks needed to fail closed with typed reasons.
- **Contract drift existed across the spec surface** and has now been reduced to targeted cleanup:
  `continuation_set.config_inheritance_mode` is present in `schemas/run_manifest.schema.json`, the
  remaining work is tightening nullability and lineage invariants so root manifests and true child
  manifests cannot serialize the same inheritance posture.
- **Ordered gate persistence was expressed as record-by-record writes** even when the gate order was
  already materialized, which added transactional overhead and duplicated audit plumbing that belongs
  in a batched gate-persistence helper.
- **Schema/doc synchronization remains a standing review target**: the modernization merge fixed the
  major naming mismatch (`ALLOCATE_RUN_MANIFEST` vs. legacy `ALLOCATE_MANIFEST`) but downstream
  review still needs to keep state machines, data-model summaries, and JSON schemas aligned as new
  replay and low-noise UX contracts evolve.
