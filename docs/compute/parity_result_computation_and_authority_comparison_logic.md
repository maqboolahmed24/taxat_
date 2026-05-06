# Parity Result Computation And Authority Comparison Logic

Implemented in `packages/backend-compute` for `pc_0124`.

## Contract Sources Cross-Checked

- `PROMPT/CARDS/pc_0124.md`
- `PROMPT/shared_operating_contract_0118_to_0125.md`
- `packages/contracts-core/schemas/parity_result.schema.json`
- `packages/contracts-core/schemas/calculation_basis.schema.json`
- `Algorithm/compute_parity_and_trust_formulas.md` sections 8.6 to 8.8
- `Algorithm/exact_gate_logic_and_decision_tables.md` parity gate table
- `Algorithm/state_machines.md` parity lifecycle
- Adjacent cards `pc_0123` and `pc_0125`

## Evaluation Flow

`evaluateParity` builds one deterministic `ParityResult` artifact:

1. Enforce the compute execution boundary.
2. Resolve the frozen `CalculationBasis` through `resolveComparisonBasis`.
3. Build and validate the ordered comparison set from the parity threshold profile.
4. Build per-field deltas using exact decimal money strings.
5. Classify aggregate parity coverage, pressure, score, and reason codes.
6. Bind the result to `parity_result.schema.json` lineage and optionally persist it.

`COMPLIANCE` parity rejects counterfactual state. `ANALYSIS` parity requires a counterfactual basis and carries non-compliance config refs through the artifact.

## Comparison Basis

`resolveComparisonBasis` maps reporting scope and provider profile to `MANDATORY`, `DESIRABLE`, or `NOT_REQUIRED`.

For `MANDATORY` and `DESIRABLE`, the resolver accepts only a `CalculationBasis` whose `basis_status` is `CONFIRMED`, `parity_reusable` is `true`, and `manifest_id` matches the parity run. Missing or non-reusable basis state fails closed with a schema-valid `comparison_basis_ref` and routes the artifact to `NOT_COMPARABLE`.

## Delta Formula

For comparable fields:

- `delta_signed = internal_value - authority_value`
- `delta_abs = abs(delta_signed)`
- `effective_abs_floor = max(abs_floor, minimum_rel_floor)`
- `delta_rel = 0` only when `delta_abs = 0`; otherwise `delta_abs / max(abs(authority), abs(internal), effective_abs_floor)`
- `breach_ratio = max(breach_abs, breach_rel)`

Zero absolute or relative thresholds use the configured `blocking_ratio_cap` when the corresponding delta is non-zero. The default cap is `3.0` and must remain at least `2.5`.

## Aggregate Classification

`classifyParityResult` follows the algorithm precedence:

1. Invalid comparison set -> `NOT_COMPARABLE`
2. Required/desirable partial coverage -> `NOT_COMPARABLE`
3. Any critical blocking field -> `BLOCKING_DIFFERENCE`
4. Critical/high material field or pressure >= `1.0` -> `MATERIAL_DIFFERENCE`
5. Minor field or pressure >= `0.25` -> `MINOR_DIFFERENCE`
6. Otherwise `MATCH`

`comparison_coverage`, `weighted_parity_pressure`, and `parity_score` are deterministic numeric outputs. Invalid comparison sets always serialize score, coverage, and pressure as zero.

## Persistence

`ParityResultRepository` provides in-memory deterministic persistence for tests and service integration. The SQL register is `control_compute.parity_result_register`, with indexes for manifest, comparison basis, threshold profile, lifecycle state, and classification.
