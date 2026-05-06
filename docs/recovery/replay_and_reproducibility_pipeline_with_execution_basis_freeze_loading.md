# Replay And Reproducibility Pipeline With Execution Basis Freeze Loading

`pc_0201` centralizes exact replay and same-attempt recovery orchestration in
`packages/backend-recovery`.

## Authoritative Flow

1. `validateReplayPreconditions(...)` checks replay legality before any replay work starts.
   It rejects missing `execution_basis_hash`, invalid replay or recovery lineage, non-exact
   inheritance modes, live mutation scopes, fresh config resolution, fresh source collection,
   fresh authority reads, late-data rescans, schema-reader incompatibility, missing historical
   artifacts, corrupt retained artifacts, and non-persisted outcome material.

2. The historical loaders explicitly reload retained truth from the source manifest:
   - `loadHistoricalConfigFreeze(...)`
   - `loadHistoricalInputFreeze(...)`
   - `loadHistoricalPresealGateContext(...)`
   - `loadHistoricalPostSealBasis(...)`

   Each loader verifies presence, artifact type, retained refs, retained content hashes,
   reader compatibility, decryptability policy, and retention/build availability. Loader failures
   are typed and do not substitute live state.

3. `executeReplayAgainstHistoricalBasis(...)` compares replay output against historical basis and
   builds a schema-compatible `ReplayAttestation`. Exact replay and same-attempt recovery preserve
   the historical `execution_basis_hash`; `COUNTERFACTUAL_ANALYSIS` records declared basis
   differences and analysis posture.

4. `resolveIdempotentReplayRerun(...)` returns an existing replay child plus attestation for the
   exact same replay intent. The idempotency key binds tenant, source manifest, replay class,
   execution mode, request idempotency key, source execution basis, source deterministic outcome,
   and declared counterfactual dimensions.

5. `orchestrateReplayPipeline(...)` composes idempotency, preconditions, historical loading, and
   attestation execution. It returns either an existing replay result, a typed blocker, or an
   attestation-compatible execution result.

## Fail-Closed Rules

- Exact replay without source or child `execution_basis_hash` is blocked.
- Exact replay and exact recovery reject fresh config, source, authority, and late-data collection.
- Same-attempt recovery requires `RECOVERY_EXACT` config and input inheritance and preserves the
  parent execution basis.
- Counterfactual replay requires a non-null `counterfactual_basis` plus explicit declared basis
  dimensions and never exposes `EXACT_HASH_MATCH`.
- Transport metadata such as resume tokens, frame epochs, and shell stability tokens is ignored for
  replay legality.
- Non-persisted outcome material is represented in the basis-integrity contract and cannot support
  exact deterministic comparison claims.

## Verification

Focused Playwright unit coverage:

```bash
pnpm exec playwright test --config=playwright.config.ts --project=unit \
  tests/unit/backend_recovery/replay_preconditions.spec.ts \
  tests/unit/backend_recovery/replay_pipeline_exactness.spec.ts
```

The tests cover exact replay, same-attempt recovery, counterfactual analysis, schema-reader
incompatibility, corrupt historical basis, idempotent replay reruns, observable component refs, and
schema validation for replay attestation outputs.
