# Risk Report Derivation And Materiality Threshold Services

## Scope

`pc_0123` adds the schema-backed `RiskReport` path in `packages/backend-compute`.
Risk scoring is driven by one frozen `risk_threshold_profile_ref`; it does not read live config, UI
state, or authority state.

## Profile Boundary

The in-repo threshold profile shape is:

- `risk_threshold_profile_ref`
- ordered active `features[]`
- `feature_code`
- `feature_weight > 0`
- `material_threshold in (0,1]`
- `blocking_threshold in [material_threshold,1]`
- optional `extractor_code`, defaulting to `FROZEN_FEATURE_VALUE`

Duplicate active feature codes, empty active feature sets, non-positive weights, invalid thresholds,
or `blocking_threshold < material_threshold` are treated as `RISK_WEIGHT_PROFILE_INVALID`.
That emits the schema-defined fail-closed report:

- `risk_score = 100`
- `feature_scores = []`
- `flags = ["RISK_WEIGHT_PROFILE_INVALID"]`
- `unresolved_material_blocking_risk_flag = true`
- `unresolved_blocking_risk_flag = false`

## Feature Registry

`RiskFeatureRegistry` maps frozen feature codes to deterministic extractors. The default extractor,
`FROZEN_FEATURE_VALUE`, reads `feature_context.frozen_feature_values[feature_code]`.

The extractor accepts either a raw number or `{ value|feature_value, resolved|feature_resolved }`.
Resolved posture can also be overridden by `resolved_feature_codes[]` and
`unresolved_feature_codes[]` supplied in the frozen feature context.

Out-of-range feature values are clamped to `[0,1]` before scoring and persistence because the
formula defines `clamp01(feature_value_m)` and the schema requires persisted values inside `[0,1]`.
Missing feature values fail closed at the feature level by scoring that feature as `1` and unresolved.

## Ordering And Flags

`feature_scores[]` are ordered by `feature_code asc`. `flags[]` are deduped and ordered by:

1. `RISK_WEIGHT_PROFILE_INVALID`
2. `BLOCKING_RISK_UNRESOLVED`
3. `MATERIAL_RISK_UNRESOLVED`
4. any extension flags in lexical order

Feature flag derivation follows section `8.5A`:

- unresolved and `feature_value >= blocking_threshold` => `BLOCKING_UNRESOLVED`
- unresolved and `feature_value >= material_threshold` => `MATERIAL_UNRESOLVED`
- resolved features always emit `NONE`

Internal material/blocking counts are computed in `risk_flag_deriver.ts` and returned to the
scoring service for tests and future diagnostics, but the public artifact persists only the schema
fields: feature rows, flags, and the two aggregate unresolved booleans.

## Score Formula

For valid profiles:

```text
risk_score = round_score(100 * sum(feature_weight * clamp01(feature_value)) / sum(feature_weight))
round_score(x) = floor(clamp100(x) + 0.5)
```

Weighted reductions are performed in canonical feature order with compensated summation, preserving
byte-stable behavior for the same frozen profile and feature values.

## Execution Boundary

`RiskReport` supports both schema postures:

- `COMPLIANCE`: `analysis_only = false`, no counterfactual basis, no non-compliance config refs.
- `ANALYSIS`: `analysis_only = true`, a non-empty counterfactual basis, and sorted
  non-compliance config refs.

If a `ComputeResult` is supplied, it must be `COMPUTED` or `SUPERSEDED`. Compliance risk scoring
requires a compliance compute basis. Analysis risk scoring may consume a compliance compute basis
only when a counterfactual basis is explicitly supplied for the risk artifact.

## Persistence

`RiskReportRepository` is an in-memory deterministic repository with indexes by manifest,
threshold profile, and execution mode. `db/migrations/phase03_0123_risk_report.sql` defines the
durable register shape, analysis/compliance boundary checks, invalid-profile checks, indexes, and
RLS posture for the control compute schema.
