# Formula Dependency and Execution Basis

This document captures how normalized helpers, core formula families, secondary families, and downstream gate bindings relate operationally.

## Dependency Graph

| Source | Target | Kind | Rationale |
| --- | --- | --- | --- |
| `standard_normalization_rules` | `data_quality_and_completeness` | `shared_helper` | Shared clamping and stable summation govern domain scoring. |
| `standard_normalization_rules` | `record_and_adjustment_compute` | `shared_helper` | Money rounding and exact-decimal aggregation boundary rules govern compute. |
| `standard_normalization_rules` | `forecast` | `shared_helper` | Forecast point and Monte Carlo outputs use round_money and deterministic seed handling. |
| `standard_normalization_rules` | `risk_scoring` | `shared_helper` | round_score and clamp01 normalize risk. |
| `standard_normalization_rules` | `per_field_parity` | `shared_helper` | Exact-decimal delta handling and minimum floors rely on normalization helpers. |
| `standard_normalization_rules` | `evidence_graph_quality` | `shared_helper` | safe_unit and stable ordering control graph-path quality. |
| `standard_normalization_rules` | `trust_scoring_bands_and_readiness` | `shared_helper` | clamp100, round_score, and safe_unit normalize trust synthesis. |
| `standard_normalization_rules` | `collaboration_orchestration_queue_routing` | `shared_helper` | half_life_score, sigmoid, and min_non_null are reused by work routing. |
| `standard_normalization_rules` | `client_flow_reliability_and_completion` | `shared_helper` | Client-flow reliability reuses shared helpers plus additional UX-specific helpers. |
| `record_and_adjustment_compute` | `forecast` | `artifact_feed` | Forecast consumes compute baseline totals and run-rate context. |
| `record_and_adjustment_compute` | `parity_comparison_set_construction` | `artifact_feed` | Parity comparison basis starts from frozen compute outputs. |
| `record_and_adjustment_compute` | `trustsummary_artifact_binding` | `artifact_feed` | ComputeResult is a required TrustSummary input artifact. |
| `risk_scoring` | `trust_scoring_bands_and_readiness` | `score_feed` | Trust uses risk_score and unresolved risk flags. |
| `aggregate_parity` | `trust_scoring_bands_and_readiness` | `score_feed` | Trust uses parity_score and comparison requirement posture. |
| `evidence_graph_quality` | `trust_scoring_bands_and_readiness` | `score_feed` | Trust uses graph_quality_score and retention penalty posture. |
| `data_quality_and_completeness` | `trust_scoring_bands_and_readiness` | `score_feed` | Trust uses data_quality_score and completeness_score. |
| `trust_authority_uncertainty` | `trust_input_admissibility_and_basis` | `state_feed` | Authority uncertainty contributes to basis ceilings. |
| `trust_input_admissibility_and_basis` | `trust_scoring_bands_and_readiness` | `hard_ceiling` | Basis ceilings cap automation and filing readiness before score math. |
| `trust_upstream_gate_cap` | `trust_scoring_bands_and_readiness` | `hard_ceiling` | Upstream gates cap legal progression even when the numeric score is green. |
| `trust_scoring_bands_and_readiness` | `formula_reason_code_emission` | `reason_contract` | Trust posture generates dominant and constrained reason-code packets. |
| `formula_reason_code_emission` | `trustsummary_artifact_binding` | `artifact_feed` | Reason codes and explainability are persisted on TrustSummary. |
| `trust_scoring_bands_and_readiness` | `trust_currency_and_recalculation` | `currency_guard` | Trust reuse depends on the persisted trust basis and score/cap posture remaining current. |
| `trust_currency_and_recalculation` | `trustsummary_artifact_binding` | `lifecycle_feed` | Supersession and append-only lineage update the TrustSummary lifecycle boundary. |
| `aggregate_parity` | `trust_upstream_gate_cap` | `gate_intersection` | Parity gate posture contributes to the frozen upstream cap before trust gating. |
| `data_quality_and_completeness` | `trust_upstream_gate_cap` | `gate_intersection` | Data-quality gate posture can force review or block before trust. |
| `evidence_graph_quality` | `trust_upstream_gate_cap` | `gate_intersection` | Retention evidence gate posture contributes to upstream legal ceilings. |
| `trust_scoring_bands_and_readiness` | `formula_layer_summary` | `summary` | The summary section compresses the full trust package into one scope statement. |

## Execution Basis

### `trustsummary_artifact_binding`

- Mode applicability: Both COMPLIANCE and ANALYSIS; artifact flags must remain internally consistent.
- Determinism rules: Formula execution must emit schema-valid TrustSummary, ComputeResult, ForecastSet, RiskReport, and ParityResult artifacts.; Artifact binding is normative current behavior, not a deferred pack repair.
- Module phases: `P09`, `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`, `Algorithm/schemas/compute_result.schema.json`, `Algorithm/schemas/forecast_set.schema.json`, `Algorithm/schemas/risk_report.schema.json`, `Algorithm/schemas/parity_result.schema.json`, `Algorithm/schemas/trust_input_basis_contract.schema.json`, `Algorithm/schemas/trust_sensitivity_contract.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `SUBMISSION_GATE`, `AMENDMENT_GATE`

### `standard_normalization_rules`

- Mode applicability: Shared across all formula families; applies identically under compliance, analysis, workflow, and client-flow evaluation.
- Determinism rules: Weighted averages normalize only by positive active-weight sums.; Non-monetary multi-term reductions use deterministic canonical ordering plus pairwise or compensated summation.; All deterministic branches must be byte-stable under the same manifest.
- Module phases: `P09`, `P11`
- Schema touchpoints: `Algorithm/schemas/compute_result.schema.json`, `Algorithm/schemas/forecast_set.schema.json`, `Algorithm/schemas/parity_result.schema.json`, `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `DATA_QUALITY_GATE`, `PARITY_GATE`, `TRUST_GATE`, `FILING_GATE`

### `data_quality_and_completeness`

- Mode applicability: Feeds trust in both modes; projection-side confidence remains read-side only and must never re-enter compute, parity, trust, or filing readiness.
- Determinism rules: NOT_REQUESTED and NOT_APPLICABLE facts stay out of the denominator; LIMITED and NOT_YET_MATERIALIZED facts remain in scope and degrade the score.; Zero-sum domain weights, invalid error budgets, and filing-critical silent limitation ambiguity are structural failures, not soft warnings.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `DATA_QUALITY_GATE`, `TRUST_GATE`, `FILING_GATE`

### `record_and_adjustment_compute`

- Mode applicability: Compliance compute requires CANONICAL facts and executable reporting scope; analysis mode may include PROVISIONAL facts only under explicit frozen analysis policy and must remain analysis_only.
- Determinism rules: Quarterly totals remain record-layer only even under cumulative basis.; Compliance compute must derive adjustment inclusion from executable reporting scope and exact partition scope, never from requested scope or amendment posture.; RuleEvaluation uses only frozen manifest inputs and executes in deterministic order.
- Module phases: n/a
- Schema touchpoints: `Algorithm/schemas/compute_result.schema.json`
- Gate consumers: `PARITY_GATE`, `TRUST_GATE`, `FILING_GATE`, `AMENDMENT_GATE`

### `forecast`

- Mode applicability: Analysis-only; forecast artifacts must never mutate the compliance compute result in place.
- Determinism rules: The point forecast uses mass-preserving seasonality and horizon-scaled trend.; Monte Carlo residuals must be deterministically seeded from frozen controls; manifest_id alone must not perturb the seed.
- Module phases: n/a
- Schema touchpoints: `Algorithm/schemas/forecast_set.schema.json`
- Gate consumers: n/a

### `risk_scoring`

- Mode applicability: Used in both modes from frozen pre-parity artifacts.
- Determinism rules: The model is feature-calibrated and profile-driven rather than heuristic.; Zero-sum risk profiles fail closed with maximal risk and a blocking flag.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/risk_report.schema.json`, `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`

### `parity_comparison_set_construction`

- Mode applicability: Compliance parity requires canonical authority-comparable facts; analysis parity may include provisional facts only under explicit frozen analysis policy and must remain analysis_only.
- Determinism rules: K is deduplicated by field_code and ordered by criticality rank then field_code.; Invalid comparison-set construction must persist a fail-closed ParityResult rather than guessing through partial materialization.
- Module phases: `P09`
- Schema touchpoints: `Algorithm/schemas/parity_result.schema.json`
- Gate consumers: `PARITY_GATE`, `TRUST_GATE`, `AMENDMENT_GATE`

### `per_field_parity`

- Mode applicability: Applies to every frozen comparison item; numeric invalidity must stop at the per-field layer and never leak as renderer-local coercion.
- Determinism rules: Each fieldDelta persists threshold and floor inputs needed for exact replay.; Zero-threshold breaches use the profile-defined blocking_ratio_cap rather than implicit infinity semantics.
- Module phases: `P09`
- Schema touchpoints: `Algorithm/schemas/parity_result.schema.json`
- Gate consumers: `PARITY_GATE`, `TRUST_GATE`

### `aggregate_parity`

- Mode applicability: Feeds parity gating and trust synthesis in both modes.
- Determinism rules: The aggregate classification uses a strict precedence ladder; later score branches cannot override a prior match.; Top-level explanation codes are persisted in deterministic priority order.
- Module phases: `P09`, `P11`
- Schema touchpoints: `Algorithm/schemas/parity_result.schema.json`, `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `PARITY_GATE`, `TRUST_GATE`, `AMENDMENT_GATE`, `FILING_GATE`

### `evidence_graph_quality`

- Mode applicability: Feeds retention evidence gating and trust in filing-capable and review-capable runs.
- Determinism rules: Best admissible path selection is deterministic through path_tuple ordering.; Fail-closed caps are explicit and severity-ordered; silent ambiguity blocks filing-capable trust regardless of rendered narrative quality.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `RETENTION_EVIDENCE_GATE`, `TRUST_GATE`, `FILING_GATE`

### `trust_authority_uncertainty`

- Mode applicability: Always required when trust synthesis evaluates live authority progression or baseline submission posture.
- Determinism rules: Authority uncertainty is quantitative and source-weighted; it may not be replaced by a prose-only heuristic.; The same frozen observation set must reproduce the same uncertainty score and emitted reasons.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`, `Algorithm/schemas/trust_input_basis_contract.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `AMENDMENT_GATE`

### `trust_input_admissibility_and_basis`

- Mode applicability: Required before any trust score or band math; applies in both modes and across continuation/replay lineage admitted by policy.
- Determinism rules: Missing, superseded, manifest-mismatched, inconsistent, or silently limited inputs fail closed with explicit reason codes.; The trust_input_basis_contract freezes typed basis states and ceilings so downstream consumers cannot flatten them into a generic score.
- Module phases: `P11`, `P15`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`, `Algorithm/schemas/trust_input_basis_contract.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `SUBMISSION_GATE`

### `trust_upstream_gate_cap`

- Mode applicability: Applies whenever trust reads prior non-access gate posture.
- Determinism rules: Trust cannot outrank earlier non-access gates.; The progression order AUTO_ELIGIBLE > NOTICE_ONLY > REVIEW_ONLY > BLOCKED is frozen and persisted.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`

### `trust_scoring_bands_and_readiness`

- Mode applicability: Core trust family for both modes; ANALYSIS mode is explicitly capped and must never publish greener machine progression than READY_REVIEW/LIMITED.
- Determinism rules: Trust is conjunctive and uses a weighted geometric mean over normalized axes.; score_band, cap_band, and trust_band are distinct persisted fields; cap-band restrictions may be stricter than the numeric score.; The trust sensitivity contract freezes the score-vs-cap relation, edge triggers, margins, and exactly six perturbation probes.; The bridge ALLOWED <-> READY_TO_SUBMIT, LIMITED <-> READY_REVIEW, BLOCKED <-> NOT_READY is exact and stage-monotone.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`, `Algorithm/schemas/trust_sensitivity_contract.schema.json`, `Algorithm/schemas/trust_sensitivity_analysis_contract.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `AMENDMENT_GATE`, `SUBMISSION_GATE`

### `collaboration_orchestration_queue_routing`

- Mode applicability: Operational secondary family; must remain separate from core filing trust even though it reuses shared helpers.
- Determinism rules: Ordering is frozen per snapshot and must not vary with websocket arrival order or local sort heuristics.; Assignment and queue health reuse the same deterministic helper surface as core formulas without feeding filing trust.
- Module phases: n/a
- Schema touchpoints: n/a
- Gate consumers: n/a

### `trust_currency_and_recalculation`

- Mode applicability: Applies after synthesis on any filing-capable reuse path, rerun, continuation, replay, or amendment lineage.
- Determinism rules: A trust artifact becomes non-current whenever any listed dependency changes after synthesized_at.; Continuation, rerun, amendment, and replay create new trust artifacts; trust history is append-only lineage.
- Module phases: `P15`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`, `Algorithm/schemas/trust_input_basis_contract.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `SUBMISSION_GATE`

### `client_flow_reliability_and_completion`

- Mode applicability: Secondary client and portal reliability family; normative for governed UX artifacts but must remain distinct from filing trust.
- Determinism rules: These metrics are materialized onto governed client artifacts rather than recomputed ad hoc in renderers.; Successful client continuity actions must not decrease flow_stability_score absent exogenous state changes.
- Module phases: n/a
- Schema touchpoints: n/a
- Gate consumers: n/a

### `formula_reason_code_emission`

- Mode applicability: Applies whenever formula outcomes materially affect trust posture, automation, or filing readiness.
- Determinism rules: TrustSummary.reason_codes preserves the terminal band code together with every applicable penalty or cap code.; dominant_reason_code is the first reason in the frozen trust priority order corresponding to the decisive cap or blocker.; decision_explainability_contract reuses the same ordered reason basis without local recomputation.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`

### `formula_layer_summary`

- Mode applicability: Summary anchor spanning both modes.
- Determinism rules: This section is a prose summary anchor for the full formula layer and keeps the implementation package tied to the source’s one-sentence scope claim.
- Module phases: `P11`
- Schema touchpoints: `Algorithm/schemas/trust_summary.schema.json`
- Gate consumers: `TRUST_GATE`, `FILING_GATE`, `AMENDMENT_GATE`

## Key Separation Rules

- The money contract lives in the shared helper layer and is reused by compute, forecast, and parity rather than being restated per module.
- `trust_input_state`, `threshold_stability_state`, and `upstream_gate_cap` are independent trust inputs and must not be inferred from `trust_score` alone.
- The collaboration and client-flow families reuse the normalization surface but remain out of the filing-trust dependency chain.

