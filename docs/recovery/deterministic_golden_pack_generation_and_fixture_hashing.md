# Deterministic Golden Pack Generation And Fixture Hashing

`DeterministicGoldenPack` is the durable fixture boundary for the blocking
`DETERMINISTIC_AND_STATE_MACHINE` suite. It is persisted as a first-class artifact, not inferred
from a green test summary.

## Generation

Golden packs are built through `buildDeterministicGoldenPack(...)` after each fixture family has
been frozen:

- module fixtures from `buildModuleGoldenFixture(...)`
- state-transition fixtures from `buildStateTransitionGoldenFixture(...)`
- replay fixtures from `buildReplayGoldenFixture(...)`
- cadence fixtures from `buildCadenceGoldenFixture(...)`

The pack always binds:

- `candidate_identity_hash`
- `candidate_identity_contract`
- `schema_bundle_hash`
- `config_bundle_hash`

The schema/config hashes must mirror the embedded release candidate identity contract.

## Module Fixtures

Module fixtures freeze three deterministic surfaces:

- `canonical_payload_hash`, computed from canonical JSON
- `expected_null_field_paths`, sorted and non-empty
- `expected_decimal_fields`, sorted by `field_path`, with values serialized as exact decimal
  strings
- `expected_ordered_array_fields`, sorted by `field_path`, with
  `ordering_policy = PRESERVE_DECLARED_ORDER`

Decimal expectations reject locale strings, exponents, floats, missing values, and duplicate field
paths. Null-slot expectations are captured from explicit `null` values in the payload unless a
caller provides explicit paths, in which case every path must resolve to an explicit `null`.

## State, Replay, And Cadence Fixtures

State-transition fixtures embed the full `state_transition_contract` and mirror:

- `expected_current_state`
- `expected_previous_state_or_null`
- `expected_transition_event_code`

Replay fixtures retain expected `execution_basis_hash` and `deterministic_outcome_hash`; exact hash
matching requires `expected_outcome_class = EXACT_MATCH`. Counterfactual and incomplete/corrupt
basis cases are rejected when their tuple is contradictory.

Cadence fixtures retain deterministic retry/reconciliation schedule derivation and require
`jitter_policy = NONE`.

## Hashing And Release Binding

`computeDeterministicGoldenPackHash(...)` matches the contract validator hash surface. The hash
input excludes `golden_pack_id`, `golden_pack_hash`, and the embedded candidate contract object, and
includes the candidate/schema/config hashes, policy constants, and the canonicalized fixture arrays.

Green deterministic release evidence must carry the same golden-pack ref through:

- `VerificationSuiteResult.deterministic_golden_pack_ref`
- `GateAdmissibilityRecord.deterministic_golden_pack_ref`
- `ReleaseVerificationManifest.deterministic_golden_pack_ref`
- `ReleaseVerificationManifestAssemblyContract.deterministic_golden_pack_ref_or_null`

Non-green deterministic release gates clear the ref. Release-manifest binding recomputes the
assembly contract hash after the ref is propagated or cleared.
