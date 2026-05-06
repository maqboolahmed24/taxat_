# Trust Summary Formula Engine And Threshold Stability Analysis

Implemented in `packages/backend-compute` for `pc_0125`.

## Contract Sources Cross-Checked

- `PROMPT/CARDS/pc_0125.md`
- `PROMPT/shared_operating_contract_0118_to_0125.md`
- `packages/contracts-core/schemas/trust_summary.schema.json`
- `packages/contracts-core/schemas/trust_input_basis_contract.schema.json`
- `packages/contracts-core/schemas/trust_sensitivity_contract.schema.json`
- `packages/contracts-core/schemas/execution_mode_boundary_contract.schema.json`
- `Algorithm/compute_parity_and_trust_formulas.md` sections 8.10 and 8.11
- `Algorithm/trust_sensitivity_and_threshold_stability_contract.md`
- `Algorithm/modules.md` trust input and synthesis modules
- `Algorithm/state_machines.md` TrustSummary lifecycle
- Adjacent cards `pc_0124` and `pc_0126`

## Synthesis Flow

`synthesizeTrust` builds one deterministic `TrustSummary` artifact:

1. Enforce the compliance or analysis execution boundary across upstream compute, risk, and parity artifacts.
2. Freeze admissibility/currentness in `TrustInputBasisContract`.
3. Compute the trust core score from data quality, parity, graph quality, and risk confidence.
4. Apply override, retention, and authority penalties.
5. Derive score band, cap band, trust band, automation level, filing readiness, and ordered reasons.
6. Persist threshold margins and the six canonical sensitivity probes.
7. Bind the result to `trust_summary.schema.json` lineage and optionally persist it.

`COMPLIANCE` synthesis rejects counterfactual state. `ANALYSIS` synthesis requires a counterfactual basis, carries non-compliance config refs, and caps trust below green.

## Score Formula

The core score is the weighted geometric mean from the algorithm:

- `Q = data_quality_score`
- `P = parity_score`
- `G = graph_quality_score`
- `R = 100 - risk_score`
- `trust_core_score = 0` if any axis is zero
- otherwise `100 * exp(0.30 ln(Q/100) + 0.25 ln(P/100) + 0.25 ln(G/100) + 0.20 ln(R/100))`

Penalties are deterministic:

- `override_penalty = min(20, 5 * active_filing_critical_override_count)`
- `retention_penalty = 20` when any critical retention limit is active
- `authority_penalty = round(0.30 * authority_uncertainty_score)`, capped at `30`
- `baseline_submission_state = NOT_APPLICABLE` forces authority uncertainty and penalty to zero

`trust_score` is the rounded, clamped core score minus penalties.

## Caps And Threshold Stability

`threshold_stability_analyzer` persists green, amber, risk, completeness, graph, and authority margins. Guard-band hits emit `EDGE_REVIEW` plus the active edge trigger codes; otherwise the state is `STABLE`.

`trust_sensitivity_analyzer` separates numeric score posture from legal and operational caps. It emits the required six projected cases in contract order:

1. `TRUST_SCORE_MINUS_ONE`
2. `TRUST_SCORE_PLUS_ONE`
3. `RISK_SCORE_PLUS_ONE`
4. `AUTHORITY_UNCERTAINTY_PLUS_ONE`
5. `FRESHNESS_INVALIDATED`
6. `INVALID_OVERRIDE_RELIED_UPON`

Cap drivers are only populated when the cap band is stricter than the score band, matching `trust_sensitivity_contract.schema.json`.

## Persistence

`TrustSummaryRepository` provides deterministic in-memory persistence for tests and integration. The SQL register is `control_compute.trust_summary_register`, with indexes for manifest, trust band, automation level, threshold stability, upstream gate cap, and lifecycle state. The register keeps explicit constraints for execution boundary, lifecycle supersession, automation/readiness bridge, trust band posture, input-state fail-closed behavior, edge review, upstream gate caps, and sensitivity projection shape.
