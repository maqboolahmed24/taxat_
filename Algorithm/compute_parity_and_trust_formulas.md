# Compute, Parity, and Trust Formulas

## Compute, parity, and trust formulas

This section turns the engine from a conceptual workflow into a reproducible scoring and decisioning
system. It defines how record-layer facts become reportable totals, how authority comparisons are
classified, and how trust is synthesized into filing readiness.

## 8.1 TrustSummary artifact binding

These formulas are bound directly to the current `TrustSummary` artifact contract. Any implementation
of this section SHALL emit a `TrustSummary` that conforms to the live schema and includes both
execution metadata and reviewer-facing outputs:

- `artifact_type = TrustSummary`
- `execution_mode in {COMPLIANCE, ANALYSIS}`
- `analysis_only in {true,false}`
- `non_compliance_config_refs[]`
- `counterfactual_basis`
- `lifecycle_state in {SYNTHESIZED, SUPERSEDED}`
- `compute_result_ref`, `parity_result_ref`, `risk_report_ref`, `evidence_graph_ref`, and `gate_decision_refs[]`
- `comparison_requirement`
- `parity_classification`
- `baseline_submission_state`
- `live_authority_progression_requested in {true,false}`
- `trust_input_state in {ADMISSIBLE_CURRENT, ADMISSIBLE_STALE, INCOMPLETE, CONTRADICTED}`
- `trust_input_basis_contract{contract_version, basis_contract_hash, input_presence_state, manifest_binding_state, lifecycle_binding_state, consistency_state, limitation_semantics_state, freshness_state, freshness_dependency_classes[], authority_progression_state, baseline_progression_state, baseline_selection_contract_hash_or_null, baseline_automation_ceiling, baseline_limitation_reason_codes[], late_data_invalidation_state, override_dependency_state, human_step_state, trust_input_state, automation_ceiling, filing_readiness_ceiling, input_reason_codes[], blocking_dependency_refs[], trust_fresh_until}`
- `trust_sensitivity_analysis_contract{contract_version, sensitivity_contract_hash, trust_input_basis_contract_hash, execution_mode_boundary_hash, score_cap_alignment_state, cap_driver_reason_codes[], edge_trigger_codes[], trust_green_margin, trust_amber_margin, risk_automation_margin, completeness_margin, graph_filing_margin_or_null, authority_review_margin_or_null, authority_block_margin_or_null, projected_case_results[]}`
- `threshold_stability_state in {STABLE, EDGE_REVIEW}`
- `completeness_score in [0,100]`
- `data_quality_score in [0,100]`
- `parity_score in [0,100]`
- `graph_quality_score in [0,100]`
- `risk_score in [0,100]`
- `trust_core_score in [0,100]`
- `score_band in {RED, AMBER, GREEN}`
- `cap_band in {INSUFFICIENT_DATA, RED, AMBER, GREEN}`
- `trust_band in {INSUFFICIENT_DATA, RED, AMBER, GREEN}`
- `trust_score in [0,100]`
- `trust_green_margin in [-100,100]`
- `trust_amber_margin in [-100,100]`
- `risk_automation_margin in [-100,100]`
- `upstream_gate_cap in {AUTO_ELIGIBLE, NOTICE_ONLY, REVIEW_ONLY, BLOCKED}`
- `trust_fresh_until` (nullable date-time)
- `active_filing_critical_override_count >= 0`
- `critical_retention_limited_count >= 0`
- `override_penalty in {0,5,10,15,20}`
- `retention_penalty in {0,20}`
- `authority_uncertainty_score in [0,100]`
- `authority_penalty in [0,30]`
- `trust_level in {READY, REVIEW_REQUIRED, BLOCKED}`
- `automation_level in {ALLOWED, LIMITED, BLOCKED}`
- `filing_readiness in {NOT_READY, READY_REVIEW, READY_TO_SUBMIT}`
- `dominant_reason_code`
- `plain_summary`
- `decision_constraint_codes[]`
- `blocking_dependency_refs[]`
- `support_refs[]`
- `required_human_steps[]`
- `superseded_at`
- `superseded_by_trust_id`

Implementations SHALL treat this binding as current normative behavior rather than as a deferred pack
repair. Formula execution SHALL not rely on any historical schema/state-machine mismatch.

The same decision layer SHALL also validate `ComputeResult`, `ForecastSet`, `RiskReport`, and
`ParityResult` against `schemas/compute_result.schema.json`, `schemas/forecast_set.schema.json`,
`schemas/risk_report.schema.json`, and `schemas/parity_result.schema.json` so formula outputs remain
portable across replay, review, and read-side projection surfaces.

---

## 8.2 Standard normalization rules

Unless a frozen provider contract says otherwise:

- money is accumulated in exact fixed-scale decimal arithmetic in the smallest legal currency unit and rounded only at declared aggregation boundaries, not per-source-row
- binary floating-point SHALL NOT be used for money-bearing sums, deltas, threshold checks, or parity breach checks
- all formula outputs are clamped to valid ranges
- all weighted averages use frozen weights from the config profile and normalize only by the positive active-weight sum for that formula
- non-monetary reductions with more than one term SHALL use deterministic canonical ordering plus pairwise or compensated summation
- all deterministic formula branches must be byte-stable under the same manifest

Define:

- `clamp01(x) = min(1, max(0, x))`
- `clamp100(x) = min(100, max(0, x))`
- `round_score(x) = floor(clamp100(x) + 0.5)`
- `round_penalty30(x) = min(30, max(0, floor(x + 0.5)))`
- `round_money(x)` according to the frozen currency/rounding profile after exact decimal accumulation
- `safe_unit(x) = max(1e-6, clamp01(x))`
- `weighted_mean(v_i, w_i) = Σ(w_i * v_i) / Σw` when `Σw > 0`
- `min_non_null(x_1..x_n) = null` when all inputs are `null`; otherwise the minimum of the non-null inputs
- `hours_between(t0, t1) = (t1 - t0) / 3600` in hours using the frozen UTC-normalized timestamps in scope
- `half_life_score(delta_hours, half_life_hours) = 1 - exp(-ln(2) * max(0, delta_hours) / max(1e-6, half_life_hours))`
- `sigmoid(x) = 1 / (1 + exp(-min(60, max(-60, x))))`
- `Σw = sum of all active weights in the relevant profile`

Every persisted money-bearing artifact in this corpus SHALL also carry a frozen
`money_profile{ currency_code, scale, rounding_mode, aggregation_boundary, serialization_profile }`.
That profile is not descriptive metadata; it is part of the contract boundary for compute, parity,
forecast, drift, calculation-basis hashing, and replay.

For any persisted money value `m`:

- `m` SHALL be serialized as a canonical decimal string, never as a JSON number
- `m` SHALL use exactly `money_profile.scale` fractional digits, including required trailing zeros
- `m` SHALL reject exponent notation, locale separators, NaN, infinite values, and trimmed scale
- `serialization_profile = CANONICAL_DECIMAL_STRING_V1`
- `aggregation_boundary = DECLARED_AGGREGATION_BOUNDARY_ONLY`

---

## 8.3 Data-quality and completeness formulas

These formulas are upstream inputs to trust.

Facts explicitly classified as `NOT_REQUESTED` or `NOT_APPLICABLE` SHALL be excluded from the
required domain denominator. Facts in `LIMITED` or `NOT_YET_MATERIALIZED` posture SHALL remain in
scope and SHALL degrade the score rather than disappearing from the denominator.

For each required domain `d`, define:

- `C_d` = lineage-deduplicated set of required canonical facts in domain `d`
- `presence_d in [0,1]`

- `freshness_d in {0, 0.25, 0.5, 1}`
  - `0 = expired`
  - `0.25 = unknown`
  - `0.5 = stale`
  - `1 = current`

- `confidence_d in [0,1]`
- `survivability_d in [0,1]`
- `limitation_clarity_d in [0,1]`
- `privacy_projection_quality_d in [0,1]`

For each `f in C_d`, resolve under the frozen evidence-confidence, retention, and masking policy
set:

- `fact_confidence_f in [0,1]`
- `fact_weight_f >= 0`; any negative weight SHALL emit `DQ_CONFIDENCE_WEIGHT_INVALID` and SHALL be treated as `0`
- `decision_information_ratio_f in [0,1]`, the fraction of the original decisive-support information mass for `f` that remains lawfully retained and admissible for decisioning at scoring time
- `projection_information_ratio_f in [0,1]`, the fraction of the original decisive-support information mass that remains visible in the current authorized projection after masking/export policy
- `projection_information_ratio_f <= decision_information_ratio_f`; otherwise emit `PRIVACY_PROJECTION_RATIO_INVALID` and clamp it to `decision_information_ratio_f`
- `limitation_explicitness_f in [0,1]`, the fraction of any limited, expired, masked, pseudonymised, or erased decisive-support mass for `f` that is represented by typed limitation nodes, typed omission entries, or lawful tombstones with non-empty reason codes
- if `decision_information_ratio_f < 1` and `limitation_explicitness_f = 0`, emit `LIMITATION_SILENT_AMBIGUITY`
- `decision_survivability_f = clamp01(decision_information_ratio_f * limitation_explicitness_f)`
- `decision_confidence_f = clamp01(fact_confidence_f * sqrt(safe_unit(decision_information_ratio_f)) * limitation_explicitness_f)`
- `projection_fidelity_f = 0 if decision_information_ratio_f = 0 else clamp01(projection_information_ratio_f / decision_information_ratio_f)`
- `projected_confidence_f = clamp01(decision_confidence_f * sqrt(safe_unit(projection_fidelity_f)))`

`decision_confidence_f` is the only confidence term that may feed compute, parity, trust, gates, or
filing readiness. `projected_confidence_f` is a read-side or export quantity only and SHALL never
exceed `decision_confidence_f`.

Let `confidence_weight_sum_d = Σ(fact_weight_f)` across `f in C_d`. If `|C_d| > 0` and
`confidence_weight_sum_d = 0`, emit `DQ_CONFIDENCE_WEIGHT_INVALID`.

Aggregate the fact-level limitation terms into domain-level quantities:

- `presence_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * decision_information_ratio_f) / confidence_weight_sum_d)`
- `survivability_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * decision_survivability_f) / confidence_weight_sum_d)`
- `limitation_clarity_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * limitation_explicitness_f) / confidence_weight_sum_d)`
- `privacy_projection_quality_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * projection_fidelity_f) / confidence_weight_sum_d)`
- `confidence_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * decision_confidence_f) / confidence_weight_sum_d)`

- `validation_d in [0,1]`

Use:

- `error_budget_valid_d = 1` when `error_budget_d > 0`; otherwise emit `DQ_INVALID_ERROR_BUDGET` and set `error_budget_valid_d = 0`
- `validated_error_budget_d = error_budget_d` when `error_budget_d > 0`; otherwise set `validated_error_budget_d = 1`
- `validation_base_d = 1 - clamp01((1.0*critical_errors_d + 0.5*major_errors_d + 0.1*minor_errors_d) / validated_error_budget_d)`
- `validation_d = error_budget_valid_d * validation_base_d`

- `partition_integrity_d in {0, 0.5, 1}`
- `0 = blocking partition conflict`
- `0.5 = warning-level partition issue`
- `1 = clean`

Then compute:

- `effective_presence_d = presence_d * limitation_clarity_d`

`domain_quality_d = 100 * (0.22*presence_d + 0.16*freshness_d + 0.20*confidence_d + 0.14*validation_d + 0.10*partition_integrity_d + 0.10*survivability_d + 0.08*limitation_clarity_d)`

Let `Σw_domain = Σ(weight_d)` across active domains where `weight_d > 0`. If `Σw_domain = 0`, emit `DQ_WEIGHT_PROFILE_INVALID`, set `completeness_score = 0`, and set `data_quality_score = 0`.

Overall completeness:

`completeness_score = 0 if Σw_domain = 0 else round_score(100 * (Σ(weight_d * effective_presence_d) / Σw_domain))`

Overall data quality:

`data_quality_score = 0 if Σw_domain = 0 else round_score(Σ(weight_d * domain_quality_d) / Σw_domain)`

This formulation makes partial evidence loss degrade confidence continuously, keeps limited facts in
the denominator, and prevents silent ambiguity from being treated as neutral partial completeness.
`privacy_projection_quality_d` SHALL feed reviewer-facing confidence or explanation surfaces, but it
SHALL NEVER back-propagate masking-only loss into compute totals or artificially inflate trust.

An invalid domain error budget, a zero-sum domain-weight profile, or any
`LIMITATION_SILENT_AMBIGUITY` affecting a filing-critical domain or profile is a structural scoring
failure. `DATA_QUALITY_GATE` SHALL fail closed rather than treating such a condition as a soft
warning.

These scores feed the `DATA_QUALITY_GATE`, not filing directly.

---

## 8.4 Record-layer and adjustment-layer compute formulas

The compute contract must keep record totals separate from later adjustments because HMRC's quarterly
updates are category totals derived from digital records for the relevant periods, while year-end work
includes later completion logic and adjustments. GOV.UK says quarterly updates are sent every 3 months
for each self-employment and property income source, they include totals for relevant categories, and
they do not send individual digital records. [1]

Define:

- `F_record` = facts where `fact_family` is in `{TRANSACTION_FACT, RECORD_FACT}`
- `F_adjust` = facts where `fact_family = ADJUSTMENT_FACT`
- `reporting_scope(runtime_scope[])` = the single reporting-scope token contained in the canonical authorized `runtime_scope[]` array
- `selected_reporting_scope(runtime_scope[]) = reporting_scope(runtime_scope[])`; amendment-intent and amendment-submit remain action posture over a year-end reporting basis and SHALL NOT create their own adjustment scope token
- `adjustment_binding(a)` = the schema-backed adjustment binding carried on each `ADJUSTMENT_FACT`, including `applicable_reporting_scopes[]`, `quarterly_basis_profile`, `time_window_basis`, `partition_application`, and `analysis_mode_treatment`
- `eligible_compute_facts(mode)` = facts with `promotion_state = CANONICAL` when `mode = COMPLIANCE`; for `mode = ANALYSIS`, this may also include `PROVISIONAL` facts only when the frozen analysis policy explicitly allows it and the resulting output remains `analysis_only = true`
- only facts in `eligible_compute_facts(mode)` may contribute to compute; compliance-grade parity always requires `CANONICAL` authority-comparable facts, while analysis-mode parity may include `PROVISIONAL` facts only when the frozen analysis policy explicitly allows it and the resulting artifact remains `analysis_only = true`

Before any `Σ signed_amount(...)` is evaluated, the contributing facts SHALL be materialized in a
deterministic canonical order and any worker-local partial sums SHALL be merged in the same ordered
fan-in sequence. At minimum, the contribution order within a `(business_partition, category, time
window)` slice SHALL be lexicographic by `(effective_date, canonical_fact_id)`. Implementations
SHALL preserve full exact-decimal intermediate precision until the declared aggregation boundary is
reached, then apply `round_money(...)` once and only once for the persisted output.

For business partition `b`, category `c`, and time window `T`:

`record_total(b,c,T,mode) = round_money(Σ signed_amount(f)) for all f in F_record ∩ eligible_compute_facts(mode) where f.business_partition = b and f.category = c and f.effective_date in T`

`adjustment_total(b,c,T,scope_token,mode) = round_money(Σ signed_amount(a)) for all a in F_adjust ∩ eligible_compute_facts(mode) where a.business_partition = b and a.category = c and adjustment_binding(a).partition_application = EXACT_PARTITION_ONLY and scope_token in adjustment_binding(a).applicable_reporting_scopes[] and a.effective_date in T`

Compute implementations SHALL bind `ComputeResult.adjustment_scope_source` before evaluation:

- `EXECUTABLE_REPORTING_SCOPE` for all compliance runs
- `COUNTERFACTUAL_ANALYSIS_SCOPE` only for analysis runs whose frozen analysis policy explicitly permits counterfactual adjustment modelling

Compliance compute SHALL therefore derive adjustment inclusion from the executable reporting scope and executable partition scope only; it SHALL NOT widen from raw requested scope, amendment action posture, or analysis-only modeling inputs.

### Quarterly basis profile

The provider contract profile SHALL freeze:

`quarterly_basis in {PERIODIC, CUMULATIVE}`

If `quarterly_basis = PERIODIC`:

`quarterly_reportable_total(b,c,q,mode) = record_total(b,c, quarter_window(q), mode)`

If `quarterly_basis = CUMULATIVE`:

`quarterly_reportable_total(b,c,q,mode) = record_total(b,c, tax_year_start .. quarter_end(q), mode)`

For both quarterly basis profiles:

- `quarterly_reportable_total(...)` SHALL remain record-layer only
- `ADJUSTMENT_FACT` inputs SHALL NOT be folded into quarterly totals directly
- corrections that should affect later quarterly posture SHALL arrive through corrected record-layer facts or an explicit year-end carry-forward lineage, not by silently widening adjustment-layer compute

That parameter is important because HMRC's published roadmap describes a change in how periodic
obligations are marked as met, tied to submission of cumulative update data, while GOV.UK guidance
today still describes quarterly periods and corrections carrying forward through later updates. [5]

### Year-end reportable totals

For year-end/final-declaration preparation:

`annual_record_total(b,c,mode) = record_total(b,c, full_tax_year, mode)`

`annual_adjusted_total(b,c,mode) = annual_record_total(b,c,mode) + adjustment_total(b,c, full_tax_year, selected_reporting_scope(runtime_scope), mode)`

The year-end rule also governs amendment-intent and amendment-submit compute. Those runs MAY change
workflow, filing, or authority posture, but they SHALL reuse the year-end reporting basis rather
than inventing a distinct amendment reporting scope.

### Rule-evaluated outcome

The engine SHALL then apply the frozen rule version as a deterministic function.

Let `A` be the de-duplicated ordered set of `(business_partition, category)` pairs that are either required by the frozen provider/reporting profile or present in the annual record/adjustment inputs, ordered lexicographically by `(business_partition, category)`.

`annual_adjusted_totals = ordered_map((b,c) -> annual_adjusted_total(b,c,mode)) for all (b,c) in A`

Missing pairs SHALL resolve to zero rather than being omitted implicitly. This keeps `RuleEvaluation(...)` stable across sparse and dense internal representations.

`outcome_vector = RuleEvaluation(annual_adjusted_totals, profile_facts, declaration_facts, authority_reference_facts, rule_version)`

`RuleEvaluation(...)` SHALL:

- use only frozen manifest inputs
- execute in deterministic order
- emit step-level lineage refs
- produce the full internal outcome vector used for reporting, parity, trust, and filing

---

## 8.5 Forecast formula

Where forecasting is enabled in analysis mode, the point forecast SHALL use a mass-preserving seasonal profile and a horizon-scaled trend term rather than a one-step growth bump.

For forecast step `h` and category `c`, define:

- `baseline_steps(c)` = number of frozen historical steps in the baseline window used for `c`
- `baseline_run_rate(c) = baseline_total(c) / baseline_steps(c)`
- `seasonality_index(h,c) > 0` from the frozen forecast profile
- `normalized_seasonality(h,c) = seasonality_index(h,c) / mean_j(seasonality_index(j,c))` over the seasonal cycle for `c`
- `annualized_growth_rate(c)` from the frozen forecast profile
- `horizon_years(h)` = elapsed years from the baseline boundary to the midpoint of step `h`

If `baseline_steps(c) = 0`, no forecast SHALL be emitted for `c`.

`point_forecast(h,c) = round_money(baseline_run_rate(c) * normalized_seasonality(h,c) * exp(annualized_growth_rate(c) * horizon_years(h)))`

This formulation keeps a full seasonal cycle unbiased around the baseline run-rate and makes trend scaling depend on actual horizon length.

If Monte Carlo is enabled:

- `canonical_forecast_profile =` the referenced forecast profile or the canonicalized frozen `cfg.forecast_options`
- `forecast_seed = hash(deterministic_seed | hash(canonical_forecast_profile) | scenario_id)`
- `epsilon_(h,c,s)` SHALL be drawn deterministically from the seeded residual generator with zero mean and unit scale
- `simulated_forecast(h,c,s) = round_money(min(forecast_cap(c), max(forecast_floor(c), point_forecast(h,c) + residual_scale(c) * epsilon_(h,c,s))))`

`forecast_floor(c)`, `forecast_cap(c)`, and `residual_scale(c)` SHALL come from the frozen forecast profile or its defaulting rules.

Forecast artifacts SHALL never change the compliance compute result in place.

---

## 8.5A Risk scoring formula

`SCORE_RISK(...)` SHALL be a frozen feature-calibrated model rather than an implementation-specific
heuristic.

For each risk feature `m` in the frozen `risk_threshold_profile_ref`, define:

- `feature_value_m in [0,1]` = deterministic normalized risk intensity derived from the sealed snapshot, compute result, and other pre-parity frozen artifacts
- `feature_weight_m > 0`
- `material_threshold_m in (0,1]`
- `blocking_threshold_m in [material_threshold_m, 1]`
- `feature_resolved_m in {0,1}` where `0` means the condition is still unresolved at scoring time

Let `Σw_risk = Σ(feature_weight_m)` across active features.

If `Σw_risk = 0`, emit `RISK_WEIGHT_PROFILE_INVALID`, set `risk_score = 100`, and set
`unresolved_material_blocking_risk_flag = true`.

Otherwise:

`risk_score_raw = 100 * Σ(feature_weight_m * clamp01(feature_value_m)) / Σw_risk`

`risk_score = round_score(risk_score_raw)`

`material_risk_flag_count = |{m : clamp01(feature_value_m) >= material_threshold_m and feature_resolved_m = 0}|`

`blocking_risk_flag_count = |{m : clamp01(feature_value_m) >= blocking_threshold_m and feature_resolved_m = 0}|`

`unresolved_material_blocking_risk_flag = (material_risk_flag_count + blocking_risk_flag_count) > 0`

`unresolved_blocking_risk_flag = blocking_risk_flag_count > 0`

This formulation is monotone, profile-calibrated, and `O(M)` in the number of frozen risk features
while remaining reproducible across retries and replay.

---

## 8.6 Parity comparison-set construction

Before parity can be scored, the engine SHALL freeze a comparison set `K`.

The persisted `ParityResult` SHALL carry the frozen `parity_threshold_profile_ref`, one
`comparison_set_state in {VALID, INVALID}`, one deterministic `ordered_field_codes[]` projection of
`K`, and ordered top-level explanation fields `dominant_reason_code` plus `reason_codes[]`. These
fields are part of the legal-control surface for replay and review; renderers and later gates SHALL
NOT infer comparison-set validity, ordering, or the decisive parity reason from local iteration
order or rounded display text.

Each comparison item `k in K` SHALL include:

- `field_code`
- `internal_value_k`
- `authority_value_k`
- `criticality_weight_k` where `criticality_weight_k > 0`
- `abs_threshold_k` where `abs_threshold_k >= 0`
- `rel_threshold_k` where `rel_threshold_k >= 0`
- `abs_floor_k` where `abs_floor_k > 0`
- `effective_abs_floor_k` where `effective_abs_floor_k >= abs_floor_k`
- `criticality_class in {CRITICAL, HIGH, NORMAL}`

`K` SHALL be de-duplicated by `field_code` and ordered deterministically by `(criticality_rank desc, field_code asc)`, where `criticality_rank(CRITICAL)=3`, `criticality_rank(HIGH)=2`, and `criticality_rank(NORMAL)=1`. A duplicate `field_code`, non-numeric value, negative threshold, non-positive floor, or non-positive weight SHALL emit `PARITY_COMPARISON_SET_INVALID` and SHALL block parity rather than being guessed through.

If comparison-set construction fails, the engine SHALL still persist a `ParityResult`, but it SHALL
fail closed with:

- `comparison_set_state = INVALID`
- `parity_classification = NOT_COMPARABLE`
- `parity_score = 0`
- `comparison_coverage = 0`
- `weighted_parity_pressure = 0`
- `dominant_reason_code = PARITY_COMPARISON_SET_INVALID`

The engine SHALL NOT substitute `MATCH`, SHALL NOT average over a partially materialized comparison
set, and SHALL NOT silently deduplicate a broken comparison set without emitting the invalid-set
reason.

### Scope rules

For quarterly-update scopes:

- compare category totals only where an authority comparison basis exists for the frozen provider profile

For end-of-year / final-declaration scopes:

- compare liability-critical totals and declared-basis totals against the authority comparison basis frozen for that path

For amendment scopes:

- compare the proposed amended internal values against the relevant authority and filed-baseline values

The provider contract profile SHALL freeze which authority calculation path applies for the scope,
because HMRC's Individual Calculations API currently distinguishes `in-year`, `intent-to-finalise`,
`intent-to-amend`, and `final-declaration` paths for the relevant tax years. [3]

The authority comparison basis SHALL be resolved before `EVALUATE_PARITY(...)` runs and frozen as
`comparison_basis_ref`. Where the provider profile requires an authority calculation path
(for example `intent-to-finalise` or `intent-to-amend`), that path SHALL be executed or loaded
before parity evaluation, and the resulting `CalculationBasis` SHALL be reused by later filing or
amendment stages instead of recomputed on a different basis.

The comparison policy for the requested scope SHALL also be frozen as:

`comparison_requirement in {MANDATORY, DESIRABLE, NOT_REQUIRED}`

Where:

- `MANDATORY` means full comparable coverage is required for straight-through progression
- `DESIRABLE` means comparison gaps SHALL surface explicit review semantics rather than being treated as neutral
- `NOT_REQUIRED` means no authority comparison basis is expected for the scope and the not-required fallback may apply

If a required `intent-to-amend` calculation returns any non-`PASS` `validation_outcome`, parity
SHALL not be evaluated on a guessed or partial basis. The engine SHALL persist the returned
calculation context on `AmendmentCase` and route the run through `AMENDMENT_GATE(...)`. It SHALL not
route that failure through `FILING_GATE(...)` and SHALL not terminate directly from raw
`validation_outcome`.

---

## 8.7 Per-field parity formulas

For each comparison item `k`:

If `internal_value_k` or `authority_value_k` is non-numeric, NaN, or infinite, classify the item as invalid comparison input and do not propagate the numeric error downstream.

For money-bearing comparison items, `internal_value_k`, `authority_value_k`, `delta_signed_k`, and
`delta_abs_k` SHALL be exact-decimal values governed by the frozen `money_profile`. They SHALL be
computed from unrounded internal and authority intermediates, and only the persisted output strings
may be rounded to the declared scale. Threshold and floor evaluation SHALL use those exact
intermediates rather than previously rounded display totals.

`delta_signed_k = internal_value_k - authority_value_k`

`delta_abs_k = abs(delta_signed_k)`

`effective_abs_floor_k = max(abs_floor_k, minimum_rel_floor)` where `minimum_rel_floor > 0` is frozen in the parity threshold profile

`delta_rel_k = 0 if delta_abs_k = 0 else delta_abs_k / max(abs(authority_value_k), abs(internal_value_k), effective_abs_floor_k)`

`breach_abs_k = 0 if abs_threshold_k == 0 and delta_abs_k == 0 else blocking_ratio_cap if abs_threshold_k == 0 else delta_abs_k / abs_threshold_k`

`breach_rel_k = 0 if rel_threshold_k == 0 and delta_rel_k == 0 else blocking_ratio_cap if rel_threshold_k == 0 else delta_rel_k / rel_threshold_k`

`breach_ratio_k = max(breach_abs_k, breach_rel_k)`

Where `blocking_ratio_cap >= 2.5` is frozen in the parity threshold profile and defaults to `3.0`
so persisted `breach_ratio_k` remains JSON-serializable while still preserving deterministic
blocking semantics for zero-threshold breaches.

Each persisted `fieldDelta` SHALL retain the threshold and floor inputs
`criticality_weight_k`, `abs_threshold_k`, `rel_threshold_k`, `abs_floor_k`, and
`effective_abs_floor_k` together with the computed deltas so validators and replay flows can
recompute threshold-edge classification exactly instead of trusting renderer-local rounding.

### Per-field classification

If `comparison_requirement in {MANDATORY, DESIRABLE}` and no valid authority value exists, or if the
comparison input itself is invalid:

- `field_class_k = NOT_COMPARABLE`

Else if `breach_ratio_k < 0.25`:

- `field_class_k = MATCH`

Else if `0.25 <= breach_ratio_k < 1.0`:

- `field_class_k = MINOR_DIFFERENCE`

Else if `1.0 <= breach_ratio_k < 2.5`:

- `field_class_k = MATERIAL_DIFFERENCE`

Else:

- `field_class_k = BLOCKING_DIFFERENCE`

---

## 8.8 Aggregate parity formulas

Weighted parity pressure and comparison coverage:

Let `Σw_required = Σ(criticality_weight_k)` across all items in `K`.

Let `Σw_comparable = Σ(criticality_weight_k)` across items whose comparison input is valid and whose authority value is present.

`comparison_coverage = 0 if Σw_required = 0 else Σw_comparable / Σw_required`

If `Σw_required = 0`, emit `PARITY_COMPARISON_SET_INVALID`.

`weighted_parity_pressure = 0 if Σw_comparable = 0 else Σ(criticality_weight_k * min(breach_ratio_k, 3.0)) / Σw_comparable` across comparable items

Aggregate parity score:

`parity_score_raw = 100 * comparison_coverage * max(0, 1 - (weighted_parity_pressure / 3.0))`

`parity_score = 0 if Σw_required = 0 and comparison_requirement = MANDATORY else round_score(parity_score_raw)`

This coverage-adjusted form prevents a partially comparable set from looking artificially strong when required fields are missing or invalid.

This yields:

- `100` when full required coverage exists and all compared items match
- around `67` when full required coverage exists and average breach pressure is at the threshold line
- around `33` when full required coverage exists and average breach pressure is roughly double-threshold
- `0` when the set is severely divergent or wholly non-comparable

### Aggregate parity classification

Set aggregate `parity_classification` as follows:

The decision order below is a strict precedence ladder. The first matching branch SHALL win, and no
later aggregate-score branch may override it. This prevents iteration-order drift, prevents critical
fields from being diluted by non-critical averages, and makes threshold-edge behavior byte-stable.

- `NOT_COMPARABLE`
  if `comparison_set_state = INVALID`
- `NOT_COMPARABLE`
  if `comparison_requirement in {MANDATORY, DESIRABLE}` and `comparison_coverage < 1`
- `BLOCKING_DIFFERENCE`
  if any `CRITICAL` field has `field_class_k = BLOCKING_DIFFERENCE`
- `MATERIAL_DIFFERENCE`
  if no critical blocking field exists and either:
- any `CRITICAL` or `HIGH` field has `field_class_k = MATERIAL_DIFFERENCE`, or
- `weighted_parity_pressure >= 1.0`
- `MINOR_DIFFERENCE`
  if no material/blocking/not-comparable condition exists and either:
- at least one field has `field_class_k = MINOR_DIFFERENCE`, or
- `0.25 <= weighted_parity_pressure < 1.0`
- `MATCH`
  otherwise

`PARITY_PARTIAL_COVERAGE` SHALL be emitted whenever `comparison_requirement in {MANDATORY, DESIRABLE}`
and `comparison_coverage < 1`.

Top-level explanation codes SHALL be persisted in deterministic priority order:

1. `PARITY_COMPARISON_SET_INVALID`
2. `PARITY_NOT_COMPARABLE`
3. `PARITY_PARTIAL_COVERAGE`
4. `PARITY_BLOCKING_DIFFERENCE`
5. `PARITY_MATERIAL_DIFFERENCE`
6. `PARITY_MINOR_DIFFERENCE`
7. `PARITY_MATCH`

`dominant_reason_code` SHALL equal the first emitted reason code and SHALL remain stable across
replay for the same frozen parity inputs.

---

## 8.9 Evidence-graph quality formula

Trust should not use risk and parity alone. It needs a defensibility component that scores not only
whether paths exist, but whether filing-critical targets are closed, admissible, contradiction-free,
replayable, and covered by proof bundles.

Define:

- `F_return` = filing-critical figures in scope
- `F_critical` = all critical filing-capable targets in scope
- `coverage_return = 1 if |F_return| = 0 else |{f in F_return : support_state(f) in {SUPPORTED, PARTIALLY_SUPPORTED, STALE, CONTRADICTED}}| / |F_return|`
- `coverage_critical = 1 if |F_critical| = 0 else |{f in F_critical : support_state(f) in {SUPPORTED, PARTIALLY_SUPPORTED, STALE, CONTRADICTED}}| / |F_critical|`
- `closed_critical_ratio = 1 if |F_critical| = 0 else |{f in F_critical : closure_state(f) = CLOSED}| / |F_critical|`
- `proof_bundle_coverage = 1 if |F_critical| = 0 else |{f in F_critical : proof_bundle_ref(f) != None}| / |F_critical|`
- `unsupported_ratio = 0 if |F_critical| = 0 else |{f in F_critical : support_state(f) = UNSUPPORTED}| / |F_critical|`
- `contradicted_ratio = 0 if |F_critical| = 0 else |{f in F_critical : support_state(f) = CONTRADICTED}| / |F_critical|`
- `stale_ratio = 0 if |F_critical| = 0 else |{f in F_critical : support_state(f) = STALE}| / |F_critical|`
- `replay_failure_ratio = 0 if |F_critical| = 0 else |{f in F_critical : replayable(f) = false}| / |F_critical|`
- `open_closure_ratio = 0 if |F_critical| = 0 else |{f in F_critical : closure_state(f) = OPEN}| / |F_critical|`
- `explanation_failure_ratio = 0 if |F_critical| = 0 else |{f in F_critical : explanation_status(f) = FAILED}| / |F_critical|`
- For each `f in F_critical`, let `G_f` be the admissible explanation subgraph whose decisive-support edges carry:
  - `support_confidence_e in [0,1]`
  - `decision_information_ratio_e in [0,1]`
  - `limitation_explicitness_e in [0,1]`
  - `review_projection_ratio_e in [0,1]`, the fraction of original decisive-support information that remains visible under the frozen minimum lawful reviewer projection
- `path_survivability(p) = exp((1 / |p|) * Σ_{e in p} ln(safe_unit(decision_information_ratio_e)))` for any admissible decisive-support path `p`
- `path_clarity(p) = exp((1 / |p|) * Σ_{e in p} ln(safe_unit(limitation_explicitness_e)))`
- `path_review_projection_fidelity(p) = exp((1 / |p|) * Σ_{e in p} ln(safe_unit(0 if decision_information_ratio_e = 0 else clamp01(review_projection_ratio_e / decision_information_ratio_e))))`
- `path_tuple(p) = (min_{e in p}(support_confidence_e), path_survivability(p), path_clarity(p), path_review_projection_fidelity(p), -hop_count(p), lexical_path_id(p))`
- `best_admissible_path(f) = None` if no admissible path exists; otherwise the deterministic argmax admissible path under `path_tuple(p)`
- `best_path_confidence(f) = 0 if best_admissible_path(f) = None else first(path_tuple(best_admissible_path(f)))`
- `path_survivability(f) = 0 if best_admissible_path(f) = None else path_survivability(best_admissible_path(f))`
- `path_clarity(f) = 0 if best_admissible_path(f) = None else path_clarity(best_admissible_path(f))`
- `review_projection_fidelity(f) = 0 if best_admissible_path(f) = None else path_review_projection_fidelity(best_admissible_path(f))`
- `explanation_quality(f) = 0 if best_admissible_path(f) = None else clamp01(exp(0.35*ln(safe_unit(best_path_confidence(f))) + 0.25*ln(safe_unit(path_survivability(f))) + 0.25*ln(safe_unit(path_clarity(f))) + 0.15*ln(safe_unit(review_projection_fidelity(f)))))`
- `silent_ambiguity_indicator(f) = 1` iff every admissible decisive path for `f` contains at least one limited, expired, masked, pseudonymised, or erased segment whose limitation or tombstone semantics are not explicit; otherwise `0`
- `figure_weight_f >= 0` from the frozen graph-quality profile; any negative weight SHALL emit `GRAPH_WEIGHT_PROFILE_INVALID` and SHALL be treated as `0`
- `Σw_graph = Σ(figure_weight_f)` across `f in F_critical`
- `weighted_explanation_quality = 1 if |F_critical| = 0 else 0 if Σw_graph = 0 else Σ(figure_weight_f * explanation_quality(f)) / Σw_graph`
- `weighted_path_survivability = 1 if |F_critical| = 0 else 0 if Σw_graph = 0 else Σ(figure_weight_f * path_survivability(f)) / Σw_graph`
- `limitation_clarity_ratio = 1 if |F_critical| = 0 else 0 if Σw_graph = 0 else Σ(figure_weight_f * path_clarity(f)) / Σw_graph`
- `silent_ambiguity_ratio = 0 if |F_critical| = 0 else |{f in F_critical : silent_ambiguity_indicator(f) = 1}| / |F_critical|`
- `inferred_path_ratio = 0 if |F_critical| = 0 else |{f in F_critical : best_admissible_path(f) != None and best_admissible_path(f) contains inferred decisive support and no direct decisive support}| / |F_critical|`

This formulation preserves weakest-link support confidence while also degrading the score for partial
evidence loss, silent limitation ambiguity, and reviewer-visible privacy contraction. A
filing-critical target with `silent_ambiguity_indicator(f) = 1` SHALL NOT be treated as supported
for filing-capable trust or automation, even if a limited narrative can still be rendered.

Then compute the uncapped score:

`graph_quality_raw = round_score(100 * (0.16*coverage_return + 0.14*coverage_critical + 0.14*closed_critical_ratio + 0.12*proof_bundle_coverage + 0.20*weighted_explanation_quality + 0.10*weighted_path_survivability + 0.08*limitation_clarity_ratio + 0.06*(1 - inferred_path_ratio)))`

Apply explicit fail-closed penalties using the default survivability thresholds
`submit_survivability_min = 0.80`, `review_survivability_min = 0.45`, and
`audit_survivability_min = 0.15`:

- if `silent_ambiguity_ratio > 0`, cap at `29`
- else if any filing-critical target is `CONTRADICTED`, cap at `39`
- else if any filing-critical target is `UNSUPPORTED`, cap at `49`
- else if any filing-critical target has `closure_state = OPEN`, cap at `59`
- else if any filing-critical target lacks a proof bundle or has `explanation_status = FAILED`, cap at `69`
- else if any filing-critical target is non-replayable or has `path_survivability(f) < review_survivability_min`, cap at `69`
- else if stale decisive targets exist or `weighted_path_survivability < submit_survivability_min`, cap at `79` unless policy routes directly to review

Finally:

`graph_quality_score = min(graph_quality_raw, active_caps...)`

The graph-quality basis SHALL also make the following quantities directly derivable from persisted
`target_assessments[]`, `critical_paths_ref`, and `limitation_notes[]`; implementations MAY persist
them directly, but SHALL NOT reduce them to prose-only explanations:

- `weighted_explanation_quality`
- `weighted_path_survivability`
- `limitation_clarity_ratio`
- `silent_ambiguity_ratio`
- `proof_bundle_coverage`
- `unsupported_critical_target_count`
- `contradicted_critical_target_count`
- `stale_critical_target_count`
- `replay_failure_target_count`

---

## 8.10 Trust synthesis formula

Trust synthesis SHALL consume:

- `Q = data_quality_score`
- `P = parity_score`
- `G = graph_quality_score`
- `R = clamp100(100 - risk_score)`
- `required_human_steps[]`, where this array SHALL include only pre-trust human steps
- `required_human_steps_count = len(required_human_steps[])`

Packet-local declaration-basis, disclaimer, and packet-local approval notices SHALL NOT be inputs to
trust synthesis. They SHALL instead be derived only after `BUILD_FILING_PACKET(...)` and carried to
`FILING_GATE(...)` and `RESOLVE_FILING_NOTICES(...)`.

If `comparison_requirement = NOT_REQUIRED` and no valid authority basis exists, set:

- `P = 70`
- add reason code `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`

This fallback SHALL apply only when `comparison_requirement = NOT_REQUIRED`.

If `comparison_requirement = DESIRABLE` and no valid authority basis exists:

- do not synthesize a neutral parity substitute
- preserve `parity_classification = NOT_COMPARABLE`
- add reason code `PARITY_PARTIAL_COVERAGE`

If `comparison_requirement = MANDATORY` and comparison is unavailable:

- do not synthesize straight-through trust
- upstream parity gate must already block

### Required trust input

`baseline_submission_state in {KNOWN_MATCHED, KNOWN_FILED, UNKNOWN, OUT_OF_BAND_UNRECONCILED, NOT_APPLICABLE}`
SHALL be supplied by the authority-state loader and frozen for trust synthesis.

`authority_uncertainty_score in [0,100]` SHALL also be supplied by the authority-state loader and SHALL
be derived from the quantitative reconciliation-confidence and external-ambiguity model in this
section rather than from a prose-only heuristic.

`live_authority_progression_requested in {true,false}` SHALL also be supplied and set to `true` when the authorized `runtime_scope[]` includes `prepare_submission`, `submit`, or `amendment_submit`.

`execution_mode in {COMPLIANCE, ANALYSIS}` and `analysis_only in {true,false}` SHALL also be supplied
to trust synthesis and SHALL be internally consistent with the emitted `TrustSummary` artifact:

- `execution_mode = COMPLIANCE` requires `analysis_only = false`
- `execution_mode = ANALYSIS` requires `analysis_only = true`

The emitted `TrustSummary` SHALL persist those required trust inputs together with the dereferenceable
upstream artifact refs, the resolved penalty outputs, the explicit `score_band`, the explicit
`cap_band`, the current `upstream_gate_cap`, the current supersession lineage, the derived
trust-input admissibility state, the explicit `trust_input_basis_contract{...}` that freezes the
typed admissibility/currentness basis and its automation/readiness ceiling, the threshold-stability
state, any `blocking_dependency_refs[]` that explain a stale or capped posture, and the current
freshness deadline.
Downstream review, replay, or portal surfaces SHALL NOT have to infer those facts from prose or
recompute them from unrelated artifacts.

### Authority-grounded uncertainty score

Let `X = {CONFIRMED, REJECTED, PENDING_ACK, OUT_OF_BAND}` and let `O` be the lineage-deduplicated
set of admissible authority-grounded observations for the exact legal meaning in scope.
For each observation `o in O`, define:

- `src_rel_o in (0,1]` from the frozen authority-state weighting policy for that source family
- `corr_o = 1` if `correlation_status = BOUND`, `0.70` if `BOUND_WITH_AUTHORITY_REFERENCE_ONLY`, `0.20` if `AMBIGUOUS`, and `0` if `UNBOUND`
- `fresh_o = exp(-ln(2) * age_seconds(o) / half_life_seconds(source_class(o)))`
- `clarity_o = 1` for an explicit terminal authority state, `0.75` for an explicit pending/accepted state, and `0.50` for an inferred status-only observation
- `w_o = src_rel_o * corr_o * fresh_o * clarity_o`

Then compute:

- `W = Σ(w_o)`
- `p_x = 0` if `W = 0`, else `Σ(w_o * 1[state(o) = x]) / W` for each `x in X`
- `reconciliation_confidence = max_x p_x`
- `external_truth_ambiguity = 1` if `W = 0`, else `-Σ_x p_x * ln(max(p_x, 1e-9)) / ln(|X|)`
- `authority_state_staleness_score = 1 - max_o fresh_o` when `O != []`, else `1`
- `authority_uncertainty_raw = max(1 - reconciliation_confidence, external_truth_ambiguity, authority_state_staleness_score)`
- `authority_uncertainty_score = round_score(100 * authority_uncertainty_raw)`

Emit reason codes as follows:

- `TRUST_AUTHORITY_CONFIDENCE_LOW` when `1 - reconciliation_confidence > 0.15`
- `TRUST_AUTHORITY_AMBIGUITY_HIGH` when `external_truth_ambiguity > 0.35`
- `TRUST_AUTHORITY_STATE_STALE` when `authority_state_staleness_score > 0.25`
- `TRUST_AUTHORITY_STATE_UNRESOLVED` when `live_authority_progression_requested = true` and `authority_uncertainty_score >= 35`

### Trust-input admissibility state

Define the required trust inputs:

- `required_trust_artifacts[] = {snapshot, compute, parity, risk, graph_quality, upstream_gate_records[]}`
- `required_context_inputs[] = {baseline_submission_state, authority_uncertainty_score, live_authority_progression_requested, execution_mode, analysis_only, required_human_steps[]}`

Define:

- `input_presence_ok = 1` iff every required trust artifact and context input exists; otherwise `0`
- `input_manifest_ok = 1` iff every required artifact belongs to the active manifest or to an explicitly frozen continuation/replay lineage admitted by policy; otherwise `0`
- `input_lifecycle_ok = 1` iff every required artifact is the current unsuperseded artifact for its family; otherwise `0`
- `input_consistency_ok = 1` iff all of the following are true; otherwise `0`:
  - `parity.comparison_requirement = comparison_requirement`
  - `parity.parity_classification = parity_classification`
  - `risk.unresolved_blocking_risk_flag = unresolved_blocking_risk_flag`
  - `risk.unresolved_material_blocking_risk_flag = unresolved_material_blocking_risk_flag`
  - every counted filing-critical override is valid, in-scope, approved, unexpired, usage-available, and explicitly bound to the current gate family
  - no upstream gate basis contradicts the current trust inputs for the same manifest/scope
- `input_limitation_ok = 1` iff every trust-critical limited, expired, masked, pseudonymised, or erased dependency is represented by typed limitation semantics with non-empty reason codes and no hidden negative inference; otherwise `0`
- `external_freshness_deadlines[] =` the ordered non-null set of:
  - `authority_state.observed_at + authority_state_max_age`
  - `late_data_monitor.persisted_at + late_data_monitor_max_age`
  - `override.expires_at` for every override relied upon by trust
  - `authority_calculation_or_external_baseline.observed_at + external_basis_max_age` where applicable
- `trust_fresh_until = null` if `external_freshness_deadlines[] = []`; otherwise `min(external_freshness_deadlines[])`
- `input_freshness_ok = 1` iff:
  - every required artifact/context that has a freshness budget is still within budget, and
  - no required dependency has been superseded or changed after the current trust basis was frozen

Then set:

- `trust_input_state = INCOMPLETE` if `input_presence_ok = 0`
- `trust_input_state = CONTRADICTED` if `input_presence_ok = 1` and (`input_manifest_ok = 0` or `input_lifecycle_ok = 0` or `input_consistency_ok = 0` or `input_limitation_ok = 0`)
- `trust_input_state = ADMISSIBLE_STALE` if `input_presence_ok = 1`, `input_manifest_ok = 1`, `input_lifecycle_ok = 1`, `input_consistency_ok = 1`, and `input_freshness_ok = 0`
- `trust_input_state = ADMISSIBLE_CURRENT` otherwise

Whenever `trust_input_state != ADMISSIBLE_CURRENT`, `TrustSummary.blocking_dependency_refs[]` SHALL
name the decisive stale, missing, superseded, contradicted, or limitation-bearing dependencies that
forced the degraded posture.

Invalid, expired, or scope-mismatched override refs SHALL NOT silently count toward
`active_filing_critical_override_count`. They SHALL emit `TRUST_OVERRIDE_INVALID`, and if filing
progression depends on them the resulting `trust_input_state` SHALL be `CONTRADICTED`.

### TrustInputBasisContract

The emitted `TrustSummary` SHALL also persist one `trust_input_basis_contract` that freezes the
typed trust-input basis before score, risk, and upstream gate posture are combined. The contract
exists so downstream trust, filing, replay, and nightly automation consumers can consume the
currentness and admissibility ceiling directly instead of flattening it back into a generic score.

Derive:

- `input_presence_state = COMPLETE` iff `input_presence_ok = 1`; otherwise `INCOMPLETE`
- `manifest_binding_state = ACTIVE_MANIFEST_OR_ADMITTED_LINEAGE` iff `input_manifest_ok = 1`; otherwise `MANIFEST_MISMATCH`
- `lifecycle_binding_state = CURRENT_UNSUPERSEDED` iff `input_lifecycle_ok = 1`; otherwise `SUPERSEDED_OR_REPLACED`
- `consistency_state = CONSISTENT` iff `input_consistency_ok = 1`; otherwise `CONTRADICTED`
- `limitation_semantics_state = EXPLICIT_LIMITATIONS_ONLY` iff `input_limitation_ok = 1`; otherwise `SILENT_LIMITATION_AMBIGUITY`
- `freshness_state = NO_EXPIRING_DEPENDENCIES` iff `external_freshness_deadlines[] = []`
- `freshness_state = CURRENT` iff `external_freshness_deadlines[] != []` and `input_freshness_ok = 1`
- `freshness_state = STALE_OR_INVALIDATED` iff `external_freshness_deadlines[] != []` and `input_freshness_ok = 0`
- `freshness_dependency_classes[]` as the ordered non-null set from `{AUTHORITY_STATE, LATE_DATA_MONITOR, OVERRIDE_LIFECYCLE, EXTERNAL_BASELINE}` corresponding to the deadlines that contributed to `trust_fresh_until`
- `baseline_progression_state = MATCHED_OR_FILED` when `baseline_submission_state in {KNOWN_MATCHED, KNOWN_FILED}`
- `baseline_progression_state = UNKNOWN_OR_OUT_OF_BAND` when `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`
- `baseline_progression_state = NOT_APPLICABLE` when `baseline_submission_state = NOT_APPLICABLE`
- `baseline_selection_contract_hash_or_null = null` when `baseline_progression_state = NOT_APPLICABLE`; otherwise it SHALL retain the frozen baseline-selection lineage hash that produced the current baseline ceiling
- `baseline_automation_ceiling = BLOCKED` when `baseline_progression_state = UNKNOWN_OR_OUT_OF_BAND`
- `baseline_automation_ceiling = LIMITED` when baseline selection preserved the exact scope but carried non-empty baseline limitation reasons such as scope fallback, engine-only authority posture, or attenuated `baseline_anchor_weight`
- `baseline_automation_ceiling = ALLOWED` otherwise
- `baseline_limitation_reason_codes[]` SHALL be the ordered non-empty set of baseline-derived reasons whenever `baseline_automation_ceiling in {LIMITED, BLOCKED}`, and SHALL be empty when `baseline_automation_ceiling = ALLOWED`
- `authority_progression_state = BLOCKED` when live progression is requested and `authority_uncertainty_score >= 70`
- `authority_progression_state = REVIEW_LIMITED` when live progression is requested and `authority_uncertainty_score >= 35`, or when `baseline_progression_state = UNKNOWN_OR_OUT_OF_BAND`
- `authority_progression_state = NOT_REQUESTED_OR_NOT_APPLICABLE` when `baseline_progression_state = NOT_APPLICABLE`
- `authority_progression_state = CLEAR` otherwise
- `late_data_invalidation_state = INVALIDATING_FINDING_PRESENT` iff persisted late-data consequences invalidate the current trust basis; otherwise `NONE`
- `override_dependency_state = INVALID_OVERRIDE_RELIED_UPON` iff trust relied on an invalid, expired, or scope-mismatched override; otherwise `NO_ACTIVE_OR_VALID_OVERRIDES`
- `human_step_state = UNRESOLVED_PRETRUST_STEPS` iff pre-trust `required_human_steps[]` is non-empty; otherwise `CLEARED`

Then freeze the trust-input ceilings before score/risk combination:

- `automation_ceiling` SHALL remain less than or equal to `baseline_automation_ceiling`
- `automation_ceiling = BLOCKED` when `trust_input_state in {INCOMPLETE, CONTRADICTED}` or `authority_progression_state = BLOCKED`
- `automation_ceiling = LIMITED` when no `BLOCKED` condition matched and any of the following is true:
  - `trust_input_state = ADMISSIBLE_STALE`
  - `authority_progression_state = REVIEW_LIMITED`
  - `human_step_state = UNRESOLVED_PRETRUST_STEPS`
- `automation_ceiling = ALLOWED` otherwise
- `filing_readiness_ceiling = READY_TO_SUBMIT` iff `automation_ceiling = ALLOWED`
- `filing_readiness_ceiling = READY_REVIEW` iff `automation_ceiling = LIMITED`
- `filing_readiness_ceiling = NOT_READY` iff `automation_ceiling = BLOCKED`

`trust_input_basis_contract.input_reason_codes[]` SHALL contain every basis-derived reason that
limited or invalidated trust, and every non-dominant entry SHALL also appear in
`TrustSummary.decision_constraint_codes[]`. `TrustSummary.automation_level` and
`TrustSummary.filing_readiness` SHALL NOT exceed the corresponding ceilings on the persisted
`trust_input_basis_contract`.

### Upstream gate progression cap

Trust is not permitted to outrank earlier gate posture. The trust layer produces a stage-local upper
bound on legal progression; it does not reopen a review or block posture already established by an
earlier non-access gate.

Let `U = upstream_gate_records[]` restricted to non-access gates strictly earlier than
`TRUST_GATE`.

Define:

- `u_block = 1` iff any `g in U` has `decision in {HARD_BLOCK, OVERRIDABLE_BLOCK}`
- `u_review = 1` iff `u_block = 0` and any `g in U` has `decision = MANUAL_REVIEW`
- `u_notice = 1` iff `u_block = 0`, `u_review = 0`, and any `g in U` has `decision = PASS_WITH_NOTICE`
- `upstream_gate_cap in {AUTO_ELIGIBLE, NOTICE_ONLY, REVIEW_ONLY, BLOCKED}` where:
  - `BLOCKED` if `u_block = 1`
  - `REVIEW_ONLY` if `u_block = 0` and `u_review = 1`
  - `NOTICE_ONLY` if `u_block = 0`, `u_review = 0`, and `u_notice = 1`
  - `AUTO_ELIGIBLE` otherwise

Freeze the progression order:

`AUTO_ELIGIBLE > NOTICE_ONLY > REVIEW_ONLY > BLOCKED`

Any synthesized trust posture that would permit automation or readiness above this frozen upstream
cap is structurally contradictory and SHALL be treated as a conformance failure.

Emit:

- `TRUST_UPSTREAM_GATE_BLOCK` when `upstream_gate_cap = BLOCKED`
- `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED` when `upstream_gate_cap = REVIEW_ONLY`
- `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE` when `upstream_gate_cap = NOTICE_ONLY`

`TrustSummary` SHALL persist `upstream_gate_cap` directly; downstream trust and filing consumers
SHALL NOT reconstruct it from ad hoc scans over upstream gate records.

### Base trust score

Trust is conjunctive: a single weak axis should attenuate the result rather than be fully cancelled by strong unrelated axes. Use a weighted geometric mean over normalized inputs:

`q_raw = clamp01(Q / 100)`

`p_raw = clamp01(P / 100)`

`g_raw = clamp01(G / 100)`

`r_raw = clamp01(R / 100)`

`q = safe_unit(q_raw)`

`p = safe_unit(p_raw)`

`g = safe_unit(g_raw)`

`r = safe_unit(r_raw)`

`trust_core_score = 0 if min(q_raw, p_raw, g_raw, r_raw) = 0 else 100 * exp(0.30*ln(q) + 0.25*ln(p) + 0.25*ln(g) + 0.20*ln(r))`

`safe_unit(...)` exists only to make the logarithmic evaluation numerically stable; it SHALL NOT turn
an exactly zero trust axis into a positive trust result.

### Penalties

`override_penalty = min(20, 5 * active_filing_critical_override_count)`

`retention_penalty = 20 if critical_retention_limited_count > 0 else 0`

`authority_penalty = 0 if baseline_submission_state = NOT_APPLICABLE else round_penalty30(0.30 * authority_uncertainty_score)`

If `authority_penalty > 0`, emit reason code `TRUST_AUTHORITY_PENALTY`.

`trust_score = round_score(trust_core_score - override_penalty - retention_penalty - authority_penalty)`

`retention_penalty` is a legal or posture penalty, not the primary evidence-loss degrader.
Continuous degradation from expiry, masking, pseudonymisation, erasure, and explicit limitation is
already carried by `confidence_d`, `completeness_score`, and `graph_quality_score`;
implementations SHALL NOT treat the binary retention penalty as a substitute for those formulas.

### Score bands, threshold guard bands, and band caps

Define the score-only band:

- `score_band = GREEN` if `trust_score >= 85`
- `score_band = AMBER` if `65 <= trust_score < 85`
- `score_band = RED` otherwise

Freeze the filing-critical guard parameters in the trust policy:

- `green_guard_band = 2`
- `amber_guard_band = 2`
- `risk_guard_band = 2`
- `completeness_guard_band = 3`
- `graph_guard_band = 3`
- `authority_allow_guard_band = 2`
- `authority_review_guard_band = 2`
- `authority_block_guard_band = 2`

Define the explanatory margins:

- `trust_green_margin = trust_score - 85`
- `trust_amber_margin = trust_score - 65`
- `risk_automation_margin = 40 - risk_score`
- `completeness_margin = completeness_score - 60`
- `graph_filing_margin = graph_quality_score - 50` on filing-capable runs
- `authority_review_margin = 35 - authority_uncertainty_score` on live-progression runs
- `authority_block_margin = 70 - authority_uncertainty_score` on live-progression runs

Then set:

- `threshold_stability_state = EDGE_REVIEW` if any of the following is true:
  - `abs(trust_green_margin) < green_guard_band`
  - `abs(trust_amber_margin) < amber_guard_band`
- `0 <= risk_automation_margin < risk_guard_band`
- `0 <= completeness_margin < completeness_guard_band`
  - live-progression run and `0 <= authority_review_margin < authority_review_guard_band`
  - live-progression run and `0 <= authority_block_margin < authority_block_guard_band`
  - filing-capable run and `0 <= graph_filing_margin < graph_guard_band`
- `threshold_stability_state = STABLE` otherwise

If `threshold_stability_state = EDGE_REVIEW`, emit `TRUST_THRESHOLD_EDGE_REVIEW`.

`TrustSummary` SHALL also persist the exact active threshold surface set through
`trust_sensitivity_analysis_contract.edge_trigger_codes[]` using the canonical enum:

- `TRUST_GREEN_GUARD_BAND`
- `TRUST_AMBER_GUARD_BAND`
- `RISK_AUTOMATION_GUARD_BAND`
- `COMPLETENESS_GUARD_BAND`
- `GRAPH_FILING_GUARD_BAND`
- `AUTHORITY_REVIEW_GUARD_BAND`
- `AUTHORITY_BLOCK_GUARD_BAND`

Define the cap band, which represents non-score constraints that SHALL be more restrictive than the
numeric score whenever necessary:

- `cap_band = INSUFFICIENT_DATA` if any of the following is true:
  - `trust_input_state in {INCOMPLETE, CONTRADICTED}`
  - upstream gate produced `HARD_BLOCK` due to missing required evidence, missing required authority comparison, missing required authority link, missing required filing baseline, or trust-critical silent limitation ambiguity
  - `completeness_score < 60`
  - filing-capable run and `graph_quality_score < 50`
- `cap_band = RED` if none of the `INSUFFICIENT_DATA` conditions matched and any of the following is true:
  - `unresolved_blocking_risk_flag = true`
  - `upstream_gate_cap = BLOCKED`
  - `live_authority_progression_requested = true` and `authority_uncertainty_score >= 70`
- `cap_band = AMBER` if none of the `INSUFFICIENT_DATA` or `RED` conditions matched and any of the following is true:
  - `execution_mode = ANALYSIS`
  - `trust_input_state = ADMISSIBLE_STALE`
  - `threshold_stability_state = EDGE_REVIEW`
  - `risk_automation_margin < risk_guard_band`
  - `upstream_gate_cap = REVIEW_ONLY`
  - `required_human_steps_count > 0`
  - `active_filing_critical_override_count > 0`
  - `critical_retention_limited_count > 0`
  - `unresolved_material_blocking_risk_flag = true`
  - `live_authority_progression_requested = true` and `authority_uncertainty_score >= 35`
  - `live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`
- `cap_band = GREEN` otherwise

Define severity order:

`GREEN < AMBER < RED < INSUFFICIENT_DATA`

Then set:

`trust_band = most_restrictive(score_band, cap_band)`

where `most_restrictive(...)` returns the more severe band according to the frozen order above.

`TrustSummary` SHALL persist `score_band`, `cap_band`, and the resulting `trust_band` together so
downstream gates, filing cases, nightly selectors, and action surfaces consume the same frozen
ceiling instead of recomputing it from raw scores.

This split closes the prior contradiction where a high raw score plus an active filing-critical
override could bypass `GREEN` eligibility yet also fall outside the documented `AMBER` score interval.
`score_band` expresses the numeric score; `cap_band` expresses legal or operational restrictions; the
final `trust_band` is their deterministic minimum-safety meet.

### Projected human-facing level

- `trust_level = READY` if `trust_band = GREEN`
- `trust_level = REVIEW_REQUIRED` if `trust_band = AMBER`
- `trust_level = BLOCKED` if `trust_band` is in `{RED, INSUFFICIENT_DATA}`

### Automation level

- `automation_level = ALLOWED` iff all of the following are true:
  - `trust_band = GREEN`
  - `trust_input_state = ADMISSIBLE_CURRENT`
  - `threshold_stability_state = STABLE`
  - `risk_automation_margin >= risk_guard_band`
  - `upstream_gate_cap in {AUTO_ELIGIBLE, NOTICE_ONLY}`
  - `active_filing_critical_override_count = 0`
  - `critical_retention_limited_count = 0`
  - `required_human_steps_count = 0`
  - `execution_mode = COMPLIANCE`
  - not (`live_authority_progression_requested = true` and `authority_uncertainty_score >= 20`)
  - not (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`)
- `automation_level = LIMITED` if `trust_band = AMBER`
- `automation_level = BLOCKED` otherwise

Emit `TRUST_AUTOMATION_LIMITED` whenever `automation_level = LIMITED`.

`automation_level` is a trust-layer capability summary, not a blanket unattended-action permit.
Portfolio or nightly control planes SHALL intersect it with the frozen per-stage unattended policy
matrix plus current approval, step-up, and authority-ambiguity posture before allowing autonomous
progression. It SHALL also remain less than or equal to
`trust_input_basis_contract.automation_ceiling`.

### Trust sensitivity analyzer

Every persisted `TrustSummary` SHALL also carry one deterministic
`trust_sensitivity_analysis_contract` derived from the frozen trust inputs above. That contract SHALL
freeze:

- the exact current score/cap posture
- the explicit score-versus-cap relation through `score_cap_alignment_state`
- the decisive non-score cap reasons through `cap_driver_reason_codes[]`
- the exact current guard-band triggers through `edge_trigger_codes[]`
- the current trust, risk, completeness, graph, and authority margins
- the canonical ordered perturbation probes:
  `TRUST_SCORE_MINUS_ONE`, `TRUST_SCORE_PLUS_ONE`, `RISK_SCORE_PLUS_ONE`,
  `AUTHORITY_UNCERTAINTY_PLUS_ONE`, `FRESHNESS_INVALIDATED`, and
  `INVALID_OVERRIDE_RELIED_UPON`

Each projected case SHALL persist the resulting score/cap/trust bands, trust-input posture,
threshold-stability state, automation level, filing readiness, updated margins, edge-trigger set,
and reason-code additions/removals. `TRUST_SCORE_PLUS_ONE` is the only `NON_DEGRADING` probe; every
other probe is `NON_IMPROVING`.

### Filing readiness

Freeze the ordinal bridge between automation and trust-stage readiness:

- `automation_rank(ALLOWED) = 2`, `automation_rank(LIMITED) = 1`, `automation_rank(BLOCKED) = 0`
- `readiness_rank(READY_TO_SUBMIT) = 2`, `readiness_rank(READY_REVIEW) = 1`, `readiness_rank(NOT_READY) = 0`

For every persisted `TrustSummary`, require:

`readiness_rank(filing_readiness) = automation_rank(automation_level)`

Equivalently:

- `filing_readiness = READY_TO_SUBMIT` iff `automation_level = ALLOWED`
- `filing_readiness = READY_REVIEW` iff `automation_level = LIMITED`
- `filing_readiness = NOT_READY` iff `automation_level = BLOCKED`

`filing_readiness` SHALL also remain less than or equal to
`trust_input_basis_contract.filing_readiness_ceiling`.

This field is a trust-stage upper bound on legal progression. Later stages may only tighten it.
Define the stage-monotone legal progression rank:

`legal_progression_rank = min(readiness_rank(filing_readiness), amendment_gate_rank, filing_gate_rank, submission_gate_rank)`

where absent later gates are omitted from the minimum for scopes that do not authorize them, and
where each later gate rank is frozen as `2` for `{PASS, PASS_WITH_NOTICE}`, `1` for
`MANUAL_REVIEW`, and `0` for `{OVERRIDABLE_BLOCK, HARD_BLOCK}`. No later stage may raise the legal
progression rank above the trust-stage value, and no read-side surface may claim a higher
progression posture than that minimum.

If `execution_mode = ANALYSIS`, trust synthesis SHALL still compute the underlying trust posture, but
it SHALL cap machine progression as follows:

- `trust_band SHALL NOT exceed AMBER`
- `automation_level SHALL NOT exceed LIMITED`
- `filing_readiness SHALL NOT exceed READY_REVIEW`
- reason code `TRUST_ANALYSIS_MODE_CAP` SHALL be emitted

### Amendment freshness and retroactive caps

For amendment submission scopes, reuse of a previously captured calculation basis and user
confirmation SHALL also satisfy freshness predicates:

- same `DriftBaselineEnvelope.frozen_hash`
- no widened `difference_classes[]` or filing-critical field deltas
- no widened `RetroactiveImpactAnalysis`
- no provider-profile or amendment-window change

If any predicate fails, set `amendment_freshness_penalty = 1`, emit
`TRUST_AMENDMENT_FRESHNESS_STALE`, and cap automation/readiness before submission.

Let:

- `retroactive_penalty = 1` when replay or prior-position restatement remains unresolved, else `0`
- `amendment_freshness_penalty = 1` when a reused amendment readiness context is stale, else `0`

Then the trust synthesis layer SHALL additionally apply:

- reason code `TRUST_RETROACTIVE_IMPACT_UNRESOLVED` when `retroactive_penalty = 1`
- `automation_level SHALL NOT exceed LIMITED` when `amendment_freshness_penalty = 1` or `retroactive_penalty = 1`
- `filing_readiness SHALL NOT exceed READY_REVIEW` for amendment submission scopes while either penalty remains `1`

---

## 8.10A Collaboration orchestration, queue, and routing formulas

Workflow orchestration SHALL NOT rely on ad hoc queue heuristics, UI arrival order, or manually tuned
per-screen ranking shortcuts. Assignment, escalation, inbox order, and queue health SHALL be derived
from persisted state and frozen routing parameters. All half-lives, thresholds, staffing ceilings,
and rolling-window lengths in this section SHALL come from the frozen collaboration routing profile.

For each active work item `i` evaluated at time `t`, define:

- `effective_due_at_i = min_non_null(sla_due_at_i, customer_due_at_i, due_at_i)`
- `remaining_hours_i = +∞` if `effective_due_at_i = null`; otherwise `hours_between(t, effective_due_at_i)`
- `item_age_hours_i = max(0, hours_between(queue_entered_at_i, t))`
- `waiting_age_hours_i = max(0, hours_between(waiting_since_at_i, t))`
- `priority_base_i in [0,1]` from the frozen mapping `{LOW:0.15, NORMAL:0.35, HIGH:0.60, URGENT:0.80, CRITICAL:1.00}`
- `age_pressure_i = half_life_score(item_age_hours_i, item_age_half_life_hours(type_i))`
- `customer_wait_pressure_i = 0` when `waiting_on_actor_i != CUSTOMER`; otherwise `half_life_score(waiting_age_hours_i, customer_wait_half_life_hours(type_i))`
- `staff_wait_pressure_i = 0` when `waiting_on_actor_i != STAFF`; otherwise `half_life_score(waiting_age_hours_i, staff_wait_half_life_hours(type_i))`
- `authority_wait_pressure_i = 0` when `waiting_on_actor_i != AUTHORITY`; otherwise `half_life_score(waiting_age_hours_i, authority_wait_half_life_hours(type_i))`
- `due_soon_signal_i = 0` if `effective_due_at_i = null`; otherwise `sigmoid((due_soon_window_hours(policy_i) - remaining_hours_i) / max(1, due_soon_smoothing_hours(policy_i)))`
- `breach_signal_i = 0` if `effective_due_at_i = null`; otherwise `1 - exp(-max(0, -remaining_hours_i) / max(1, breach_half_life_hours(policy_i)))`

Then:

- `sla_pressure_raw_i = 0.25 * age_pressure_i` if `effective_due_at_i = null`; otherwise `clamp01(0.65 * due_soon_signal_i + 0.35 * breach_signal_i)`
- `sla_pressure_score_i = round_score(100 * sla_pressure_raw_i)`

If `effective_due_at_i = null`, emit `WORK_SLA_UNBOUND`. Missing due-time structure SHALL lower
ordering confidence rather than defaulting silently to a neutral posture.

### Assignment efficiency and ownership confidence

Let `A_i` be the frozen eligible assignee set for item `i`. For each eligible assignee `a in A_i`,
define deterministic feature inputs:

- `skill_fit_(i,a) in [0,1]` from the frozen skill/rule map for `type_i`, queue, and required authority domain
- `queue_affinity_(i,a) in [0,1]` from the frozen routing policy for `routing_queue_ref_i`
- `context_reuse_(i,a) in [0,1]` from prior ownership, recent participation, and open linked-context continuity
- `availability_fit_(i,a) in [0,1]` from scheduled availability and active-step-up eligibility
- `load_ratio_a = weighted_open_item_load_a / max(1e-6, staffed_capacity_a)`
- `capacity_fit_a = exp(-max(0, load_ratio_a - 1))`

Then compute candidate efficiency with a weighted geometric mean so one weak axis cannot be fully
cancelled by unrelated strength:

`assignment_efficiency_(i,a) = clamp01(exp(0.35*ln(safe_unit(skill_fit_(i,a))) + 0.25*ln(safe_unit(capacity_fit_a)) + 0.20*ln(safe_unit(context_reuse_(i,a))) + 0.10*ln(safe_unit(queue_affinity_(i,a))) + 0.10*ln(safe_unit(availability_fit_(i,a)))))`

Let:

- `best_assign_score_i = 0` if `|A_i| = 0`; otherwise `max_a assignment_efficiency_(i,a)`
- `second_best_assign_score_i = 0` if `|A_i| <= 1`; otherwise the second-largest candidate score under deterministic tie-break
- `assignment_margin_i = max(0, best_assign_score_i - second_best_assign_score_i)`
- `current_assign_score_i = 0` if `current_assignee_ref_i = null`; otherwise `assignment_efficiency_(i,current_assignee_ref_i)`
- `assignment_efficiency_score_i = round_score(100 * (best_assign_score_i if current_assignee_ref_i = null else current_assign_score_i))`
- `ownership_confidence_raw_i = clamp01(0.70 * best_assign_score_i + 0.30 * assignment_margin_i)`
- `ownership_confidence_score_i = round_score(100 * ownership_confidence_raw_i)`

If `|A_i| = 0` or `ownership_confidence_score_i < ownership_confidence_floor`, emit
`WORK_OWNERSHIP_AMBIGUOUS`. If `current_assignee_ref_i != null` and
`best_assign_score_i - current_assign_score_i >= reassignment_gain_threshold`, emit
`WORK_ASSIGNMENT_LOW_EFFICIENCY` and surface reassignment as a recommendation, but never silently
transfer ownership while a user has an active draft or unconfirmed command.

### Resolution confidence

Define:

- `evidence_readiness_i in [0,1]` from linked trust/gate/remediation posture for the item's decisive dependency set
- `next_action_clarity_i = 1` when exactly one legal next actor and one dominant semantic action family remain; `0.5` when actor is known but more than one action family remains; else `0`
- `response_integrity_i = 1` iff every open `RequestInfoRecord` has exactly one live `request_info_ref`, every `REQUEST_INFO_RESPONSE` cites that exact ref, and every reply chain is anchored by `causal_parent_entry_ref`; otherwise `0`
- `lane_integrity_i = 1` iff the visibility-scoped guard vector is current and no hidden-lane mutation can invalidate the caller's visible compare set; otherwise `0`
- `freshness_integrity_i in {1, 0.6, 0.25}` from the route-visible freshness posture `{CURRENT, CATCHING_UP, STALE_OR_DEGRADED}`
- `ownership_integrity_i = clamp01(ownership_confidence_score_i / 100)`

Then:

`resolution_confidence_raw_i = 100 * exp(0.25*ln(safe_unit(ownership_integrity_i)) + 0.20*ln(safe_unit(evidence_readiness_i)) + 0.15*ln(safe_unit(next_action_clarity_i)) + 0.15*ln(safe_unit(response_integrity_i)) + 0.15*ln(safe_unit(lane_integrity_i)) + 0.10*ln(safe_unit(freshness_integrity_i)))`

Apply fail-closed caps:

- if `response_integrity_i = 0` or `lane_integrity_i = 0`, cap at `39` and emit `WORK_RESPONSE_GUARD_STALE`
- else if `next_action_clarity_i = 0`, cap at `49`
- else if `current_assignee_ref_i = null`, cap at `69`

Finally:

- `resolution_confidence_score_i = min(round_score(resolution_confidence_raw_i), active_caps...)`
- `resolution_uncertainty_i = 1 - clamp01(resolution_confidence_score_i / 100)`

If `resolution_confidence_score_i < resolution_confidence_floor`, emit
`WORK_RESOLUTION_CONFIDENCE_LOW`.

### Escalation pressure and escalation rank

Define:

- `handoff_churn_i = clamp01(reassignment_count_30d_i / max(1, reassignment_budget_30d(type_i)))`
- `ownership_gap_i = 1 - clamp01(ownership_confidence_score_i / 100)`

Then:

- `escalation_pressure_raw_i = clamp01(0.35*sla_pressure_raw_i + 0.20*handoff_churn_i + 0.20*ownership_gap_i + 0.15*authority_wait_pressure_i + 0.10*age_pressure_i)`
- `escalation_pressure_score_i = round_score(100 * escalation_pressure_raw_i)`
- `escalation_rank_i = round_score(100 * clamp01(0.60*escalation_pressure_raw_i + 0.25*sla_pressure_raw_i + 0.15*resolution_uncertainty_i))`

If `escalation_pressure_score_i >= escalation_pressure_threshold`, emit
`WORK_ESCALATION_PRESSURE_HIGH`.

### Queue health

For each active operational queue `q`, over the frozen rolling window used by the collaboration
routing profile, define:

- `arrival_rate_q` = accepted inbound items per hour
- `service_rate_q` = resolved items per staffed hour
- `staffed_parallelism_q >= 0`
- `resolution_target_hours_q > 0`
- `backlog_age_p90_hours_q >= 0`
- `stale_view_rejection_rate_q = rejected_stale_commands_q / max(1, mutating_command_attempts_q)`
- `reassignment_churn_q = reassignments_30d_q / max(1, resolved_30d_q)`
- `a_q = arrival_rate_q / max(1e-6, service_rate_q)`
- `ρ_q = arrival_rate_q / max(1e-6, staffed_parallelism_q * service_rate_q)`

If `staffed_parallelism_q = 0` or `service_rate_q = 0` or `ρ_q >= 1`, set:

- `P_wait_q = 1`
- `expected_wait_hours_q = +∞`

Otherwise use Erlang C:

- `P0_q = (Σ_(n=0..staffed_parallelism_q-1) (a_q^n / n!) + (a_q^staffed_parallelism_q / (staffed_parallelism_q! * (1 - ρ_q))))^(-1)`
- `P_wait_q = (a_q^staffed_parallelism_q / (staffed_parallelism_q! * (1 - ρ_q))) * P0_q`
- `expected_wait_hours_q = P_wait_q / max(1e-6, staffed_parallelism_q * service_rate_q - arrival_rate_q)`

Then:

`queue_health_signal_q = 0 if staffed_parallelism_q = 0 or service_rate_q = 0 else clamp01(((1 - P_wait_q)^0.40) * (exp(-expected_wait_hours_q / max(1, resolution_target_hours_q))^0.25) * (exp(-backlog_age_p90_hours_q / max(1, resolution_target_hours_q))^0.20) * ((1 - clamp01(reassignment_churn_q))^0.10) * ((1 - clamp01(stale_view_rejection_rate_q))^0.05))`

`queue_health_score_q = round_score(100 * queue_health_signal_q)`

If `queue_health_score_q < queue_health_floor`, emit `WORK_QUEUE_HEALTH_DEGRADED`.

Every persisted inbox or workspace view SHALL serialize queue-health posture through
`work_queue_health_contract{ queue_route_key, queue_health_score, queue_pressure_score,
queue_health_floor, queue_health_state, intervention_recommendation_state, ordering_policy,
focus_safe_live_update_policy, ... }`. Queue banners, digest summaries, and live ordering SHALL
consume that contract rather than deriving posture from raw backlog counts, unread totals, or local
clock deltas.

### Collaboration priority and stable order

For item `i` in queue `q(i)`, define `queue_pressure_i = 1 - clamp01(queue_health_score_q(i) / 100)`.

Then:

`collaboration_priority_signal_i = clamp01(1 - (1 - 0.95*sla_pressure_raw_i) * (1 - 0.80*customer_wait_pressure_i) * (1 - 0.70*age_pressure_i) * (1 - 0.65*escalation_pressure_raw_i) * (1 - 0.50*resolution_uncertainty_i) * (1 - 0.35*priority_base_i) * (1 - 0.25*queue_pressure_i))`

`collaboration_priority_score_i = round_score(100 * collaboration_priority_signal_i)`

The stable queue order tuple SHALL then be:

`priority_tuple_i = (collaboration_priority_score_i desc, escalation_rank_i desc, effective_due_at_i asc nulls_last, resolution_confidence_score_i asc, queue_entered_at_i asc, item_id_i asc)`

This tuple SHALL be frozen per snapshot and SHALL NOT vary with websocket arrival order, unread-badge
mutation, browser tab focus, or local client sort heuristics.

Every persisted work item and every queue-bearing read model SHALL also serialize one
`collaboration_routing_contract{ routing_profile_hash, routing_queue_ref, basis_hash,
canonical_sort_key{...}, assignment_efficiency_score, ownership_confidence_score,
sla_pressure_score, escalation_pressure_score, escalation_pressure_threshold,
reassignment_gain_threshold, resolution_confidence_score, resolution_confidence_floor,
queue_health_score, queue_pressure_score, queue_health_floor, queue_health_state, escalation_rank,
collaboration_priority_score, assignment_recommendation_state, recommended_assignee_ref_or_null,
escalation_recommendation_state, recommended_escalation_target_ref_or_null,
recommended_action_code_or_null, focused_row_reorder_state, draft_safety_state,
ordering_reason_codes[], recommendation_reason_codes[] }`.

That contract is the authoritative persisted routing boundary. Browser, native, automation, stream,
and notification consumers SHALL reuse it directly instead of re-ranking rows from badges, local
arrival order, or client-side action heuristics.

---

## 8.11 Out-of-band, stale-input, and recalculation handling

If the baseline legal state is external, unresolved, or authority-unknown:

- `baseline_submission_state` SHALL be set to `UNKNOWN` or `OUT_OF_BAND_UNRECONCILED` before trust synthesis
- the engine SHALL not inflate trust by internal confidence alone
- `authority_uncertainty_score` SHALL be computed before trust synthesis from authority-grounded confidence, ambiguity, and staleness rather than from baseline labels alone
- `authority_penalty` SHALL apply according to `authority_uncertainty_score`
- `authority_uncertainty_score >= 35` SHALL force at least `AMBER` cap posture for live progression
- `authority_uncertainty_score >= 70` SHALL force `automation_level = BLOCKED` and `filing_readiness = NOT_READY` for live progression
- reason code `TRUST_AUTHORITY_STATE_UNRESOLVED` SHALL be emitted

This is essential because the legal truth of submission state is authority-defined, not UI-defined.

A synthesized trust artifact SHALL be treated as no longer current, and SHALL be superseded by a new
`TrustSummary`, whenever any of the following occurs after `synthesized_at`:

- a newer `ComputeResult`, `ParityResult`, `RiskReport`, or graph-quality basis is produced for the same manifest scope
- a required upstream gate for the same manifest scope is superseded or reevaluated to a materially different decision
- a relied-upon override is approved, revoked, expires, is exhausted, or changes scope
- a newer `LateDataMonitorResult`, authority-state observation, authority-calculation basis, amendment baseline, or authority-correction baseline exists
- rerun, continuation, replay, amendment, or child-manifest logic changes the trust-effective `runtime_scope[]`, reporting scope, or comparison requirement
- any dependency that previously made `trust_input_state = ADMISSIBLE_CURRENT` would now yield `ADMISSIBLE_STALE`, `INCOMPLETE`, or `CONTRADICTED`

When such a condition is observed, the current trust SHALL NOT be reused for filing-capable
progression. The control plane SHALL emit `TRUST_RECALCULATION_REQUIRED`, mark the old trust
`SUPERSEDED`, and either synthesize a new trust artifact immediately or fail closed until a rerun or
continuation does so.

Continuation, rerun, amendment, and replay paths SHALL create a new trust artifact instead of mutating
the old one in place. Trust history is append-only lineage, not mutable session state.

## 8.11A Client-flow stability, upload-confidence, recovery, approval-readiness, and completion formulas

These formulas are normative for client-facing upload, approval, onboarding, and recovery flows.
They SHALL be materialized onto governed client artifacts rather than recomputed ad hoc in the
renderer. At minimum:

- `ClientUploadSession` SHALL publish `surface_class`, `capture_mode`, `bytes_transferred`,
  `retry_count`, `resume_attempt_count`, `resume_success_count`, `integrity_state`,
  `upload_confidence_score`, `recovery_posture`, and `dominant_hazard_code`
- `ClientApprovalPack` SHALL publish `view_guard_ref`, `stale_protection_state`,
  `change_digest_acknowledged_at`, `declaration_acknowledged_at`, `step_up_verified_at`,
  `step_up_expires_at`, `approval_readiness_score`, `recovery_posture`, and
  `dominant_hazard_code`
- `ClientPortalWorkspace` SHALL publish
  `reliability_summary{ surface_class, network_posture, dominant_flow_kind, flow_stability_score,
  risk_weighted_friction_score, completion_probability, recovery_posture,
  dominant_abort_hazard_code }`
- when the portal workspace projects a currently focused upload or approval card, the mirrored
  request or pack summary fields needed for CTA safety SHALL remain exact projections of the
  governing `ClientUploadSession` or `ClientApprovalPack`; the workspace SHALL NOT invent local
  score or recovery posture

For persisted artifacts in this section, let the evaluation anchor `t_pub` be the artifact's
publication timestamp:

- `ClientUploadSession.state_changed_at`
- `ClientApprovalPack.state_changed_at`
- `ClientPortalWorkspace.updated_at`

Use the standard helpers from §8.2 and additionally define:

- `σ(x) = 1 / (1 + e^(-x))`
- `I(condition) = 1` when `condition` is true, else `0`
- `age_seconds(t) = max(0, t_pub - t)` when `t` is present, else `+∞`
- `remaining_seconds(t) = max(0, t - t_pub)` when `t` is present, else `0`
- `safe_div(a,b) = 0` when `b <= 0`, else `a / b`
- `enum_factor(x, map, default)` = mapped scalar in `[0,1]` for enum `x`
- `surface_penalty = enum_factor(surface_class, {DESKTOP: 0.00, TABLET: 0.05, MOBILE: 0.12}, 0.12)`
- `network_instability = enum_factor(network_posture, {HEALTHY: 0.05, WEAK: 0.35, UNSTABLE: 0.60, OFFLINE_RECOVERING: 0.75}, 0.60)`

A frozen `portal_reliability_profile_ref` MAY override the default coefficients below, but the sign
of every coefficient SHALL remain monotonic: stability, readiness, and confidence terms may only
improve completion; friction, staleness, external handoff, and instability terms may only worsen
it.

### Flow-stability score

Define the normalized continuity factors:

- `connection_continuity = 1 - network_instability`
- `freshness_continuity = enum_factor(freshness_state, {FRESH: 1.00, STALE_REVIEW_REQUIRED: 0.40, DEGRADED: 0.25}, 0.25)`
- `interaction_continuity = enum_factor(interaction_posture, {MUTATING_ALLOWED: 1.00, REVIEW_REQUIRED: 0.55, READ_ONLY_LIMITED: 0.20}, 0.20)`
- `resume_continuity = enum_factor(draft_state, {NONE: 1.00, ACTIVE: 1.00, REBASED: 0.70, STALE_REVIEW_REQUIRED: 0.35}, 1.00)`
- `focus_continuity = 0` when a still-existing `focus_anchor_ref` was lost during reconnect, rebase,
  or responsive collapse; else `1`
- `handoff_continuity = 1 - clamp01(external_handoff_count / 2)`

Then:

`flow_stability_raw = 0.24*connection_continuity + 0.22*freshness_continuity + 0.18*interaction_continuity + 0.18*resume_continuity + 0.10*focus_continuity + 0.08*handoff_continuity`

`flow_stability_score = round_score(100 * clamp01(flow_stability_raw))`

The control plane SHALL treat `flow_stability_score < 60` as unstable mutation posture unless the
only live mutation remaining is the explicit recovery action itself.

In the absence of an exogenous authority, policy, request-version rebase, or approval-pack rebase
event, any successful client event in `{resume_upload, confirm_attachment, acknowledge_changes,
step_up_verified, sign_pack, save_and_return}` SHALL NOT decrease `flow_stability_score`.

### Upload-confidence score

For a governed `ClientUploadSession`, define:

- `progress_ratio = clamp01(safe_div(bytes_transferred, byte_count))`
- `observed_throughput_bps = safe_div(bytes_transferred, max(1, age_seconds(transfer_started_at)))`
- `eta_seconds = safe_div(max(0, byte_count - bytes_transferred), max(1, observed_throughput_bps))`
- `expiry_buffer = 1` when `resumability_state = CLOSED` and `transfer_state = ACCEPTED`; otherwise
  `clamp01(safe_div(max(0, remaining_seconds(expires_at) - eta_seconds), max(60, remaining_seconds(expires_at))))`
- `binding_factor = enum_factor(request_binding_state, {ORIGINAL_CURRENT: 1.00, RECONFIRMED_CURRENT: 0.92, RECONFIRMATION_REQUIRED: 0.35, SUPERSEDED: 0.00}, 0.00)`
- `resume_success_ratio = safe_div(resume_success_count + 1, resume_attempt_count + 2)`
- `integrity_factor = enum_factor(integrity_state, {PENDING: 0.45, VERIFIED: 1.00, FAILED: 0.00}, 0.00)`
- `scan_factor = enum_factor(malware_scan_state, {PENDING: 0.40, CLEAN: 1.00, QUARANTINED: 0.00}, 0.00)`
- `validation_factor = enum_factor(validation_state, {PENDING: 0.55, ACCEPTED: 1.00, REQUIRES_REPLACEMENT: 0.20, REJECTED: 0.00}, 0.00)`
- `retry_decay = e^(-0.25 * retry_count)`

Then:

`upload_confidence_raw = 0.18*sqrt(progress_ratio) + 0.12*resume_success_ratio + 0.16*expiry_buffer + 0.18*binding_factor + 0.16*integrity_factor + 0.10*scan_factor + 0.10*validation_factor`

`upload_confidence_score = round_score(100 * clamp01(upload_confidence_raw) * retry_decay)`

Hard fail-closed overrides:

- if `integrity_state = FAILED`, then `upload_confidence_score = 0`
- if `malware_scan_state = QUARANTINED`, then `upload_confidence_score = 0`
- if `request_binding_state = SUPERSEDED`, then `upload_confidence_score <= 25`
- if `attachment_state = ATTACHED`, then `upload_confidence_score >= 85`
- a request SHALL NOT promote `Submit`, `Attach`, or equivalent completion copy while
  `upload_confidence_score < 70`

### Recovery posture and viability

Recovery posture SHALL be derived from concrete governed blocker state, not from a previously
published `recovery_posture` value.

For uploads, derive `recovery_mode_class` as:

- `NONE` when `next_action_code in {NONE, CONFIRM_ATTACHMENT}`
- `INLINE_RESUME` when `next_action_code = RESUME_UPLOAD`
- `RECONFIRM_INLINE` when `next_action_code = RECONFIRM_REQUEST` and `request_binding_state = RECONFIRMATION_REQUIRED`
- `STALE_REVIEW_REQUIRED` when `next_action_code = RECONFIRM_REQUEST` and `request_binding_state = SUPERSEDED`
- `HARD_RESET_REQUIRED` when `next_action_code in {RETRY_UPLOAD, UPLOAD_REPLACEMENT}`
- `SUPPORT_REQUIRED` when `next_action_code = CONTACT_SUPPORT`

For approvals, derive `recovery_mode_class` as:

- `NONE` when `stale_protection_state = CURRENT` and the pack is signable under its current
  step-up requirement
- `RECONFIRM_INLINE` when `stale_protection_state = REBASE_REQUIRED`
- `STEP_UP_RETRY` when the only blocker is missing or expired step-up proof
- `STALE_REVIEW_REQUIRED` when `stale_protection_state in {SUPERSEDED, EXPIRED}`
- `HARD_RESET_REQUIRED` when lifecycle or policy posture invalidates the current pack without an
  inline rebase path
- `SUPPORT_REQUIRED` when policy, integrity, or escalation posture makes self-recovery unsafe

Then set:

- `resume_viability = enum_factor(recovery_mode_class, {NONE: 1.00, INLINE_RESUME: 0.90, RECONFIRM_INLINE: 0.70, STALE_REVIEW_REQUIRED: 0.45, STEP_UP_RETRY: 0.35, HARD_RESET_REQUIRED: 0.15, SUPPORT_REQUIRED: 0.00}, 0.00)`
- `artifact_currency = binding_factor` for upload flows and
  `min(freshness_continuity, enum_factor(stale_protection_state, {CURRENT: 1.00, REBASE_REQUIRED: 0.35, SUPERSEDED: 0.00, EXPIRED: 0.00}, 0.00))`
  for approval flows
- `locality_factor = 1 - clamp01(external_handoff_count / 2)` for workspace-level recovery and `1`
  for governed upload or approval artifacts without an external handoff
- `preservation_factor = min(resume_continuity, focus_continuity)` for workspace-level recovery and
  `1` for governed upload or approval artifacts that preserve their exact object anchor

Then:

`recovery_posture_score = round_score(100 * clamp01(0.35*resume_viability + 0.30*artifact_currency + 0.20*locality_factor + 0.15*preservation_factor))`

Default posture mapping:

- `INLINE_RESUME` when `recovery_posture_score >= 85` and no guard mismatch exists
- `RECONFIRM_INLINE` when `65 <= recovery_posture_score < 85` and fresh binding or pack rebase can
  be resolved in place
- `STALE_REVIEW_REQUIRED` when `40 <= recovery_posture_score < 65`
- `STEP_UP_RETRY` when the only blocker is expired or missing step-up proof
- `HARD_RESET_REQUIRED` when recovery is possible only by re-uploading or restarting the flow
- `SUPPORT_REQUIRED` when policy, integrity, or escalation posture makes self-recovery unsafe

The published `recovery_posture` SHALL equal the deterministic posture derived from the concrete
governed blocker state and the mapping above; renderer-local fallbacks are forbidden.

### Approval-readiness score

For a governed `ClientApprovalPack`, define:

- `stale_factor = enum_factor(stale_protection_state, {CURRENT: 1.00, REBASE_REQUIRED: 0.30, SUPERSEDED: 0.00, EXPIRED: 0.00}, 0.00)`
- `view_factor = I(viewed_at is not null)`
- `digest_factor = I(change_digest_acknowledged_at is not null)`
- `declaration_factor = I(declaration_acknowledged_at is not null)`
- `ack_factor = I(acknowledged_at is not null)`
- `step_up_factor = 1` when `requires_step_up = false`; otherwise
  `clamp01(I(step_up_verified_at is not null) * I(step_up_expires_at is not null) * I(remaining_seconds(step_up_expires_at) > 0))`

Then:

`approval_readiness_raw = 0.15*view_factor + 0.20*digest_factor + 0.20*declaration_factor + 0.15*ack_factor + 0.30*min(stale_factor, step_up_factor)`

`approval_readiness_score = round_score(100 * clamp01(approval_readiness_raw))`

Hard fail-closed overrides:

- if `stale_protection_state in {SUPERSEDED, EXPIRED}`, then `approval_readiness_score = 0`
- if `requires_step_up = true` and `remaining_seconds(step_up_expires_at) <= 0`, then
  `approval_readiness_score <= 40`
- a pack SHALL NOT promote `Sign now` while `approval_readiness_score < 85`

### Risk-weighted friction score

Define the normalized friction components for the dominant flow:

- `step_burden = clamp01(remaining_required_step_count / 5)`
- `input_burden = clamp01(required_input_count / 8)`
- `wait_burden = clamp01(blocking_wait_seconds / 180)`
- `retry_burden = clamp01(retry_count / 3)`
- `handoff_burden = clamp01(external_handoff_count / 2)`
- `viewport_burden = surface_penalty`
- `risk_justification = clamp01(0.50*legal_irreversibility + 0.30*fraud_or_identity_risk + 0.20*data_sensitivity_risk)`

Then:

`raw_friction = clamp01(0.22*step_burden + 0.20*input_burden + 0.18*wait_burden + 0.15*retry_burden + 0.15*handoff_burden + 0.10*viewport_burden)`

`friction_allowance = 0.15 + 0.55*risk_justification`

`avoidable_friction = clamp01(raw_friction - friction_allowance)`

`risk_weighted_friction_score = round_score(100 * clamp01(avoidable_friction + 0.30*raw_friction*(1 - risk_justification)))`

If `risk_weighted_friction_score > 60` while `risk_justification < 0.50`, the builder SHALL remove
optional panels, duplicate confirmations, and avoidable route-breaking handoffs before asking the
client to continue.

### Completion probability

The engine SHALL model completion as a discrete-time survival process over the remaining required
steps `j = 1..n` of the dominant client flow. Let:

- `upload_component_j = safe_div(upload_confidence_score, 100)` for upload-dependent steps, else `0`
- `approval_component_j = safe_div(approval_readiness_score, 100)` for approval-dependent steps,
  else `0`
- `recovery_penalty_j = 1 - safe_div(recovery_posture_score, 100)`
- `mobile_complexity = I(surface_class = MOBILE) * clamp01(input_burden + handoff_burden)`

Use the default step hazard model:

`hazard_j = σ(-2.20 + 1.35*network_instability + 1.10*safe_div(risk_weighted_friction_score,100) + 0.95*recovery_penalty_j + 0.80*I(freshness_state != FRESH) + 0.55*mobile_complexity - 1.15*safe_div(flow_stability_score,100) - 0.90*upload_component_j - 0.90*approval_component_j)`

`completion_probability = clamp01(Π(1 - hazard_j) for j in 1..n)`

For numerical stability, implementations MAY accumulate this as
`exp(Σ log(max(1e-6, 1 - hazard_j)))`.

Default control thresholds:

- when `completion_probability < 0.40` and the current action is legally reversible, the dominant
  CTA SHALL prefer `Save and return later`, `Resume`, or contextual help over an irreversible submit
  or sign action
- when `0.40 <= completion_probability < 0.70`, the flow MAY continue but SHALL keep recovery and
  save-and-return affordances explicit
- when `completion_probability >= 0.70`, the builder MAY keep the current dominant completion CTA,
  subject to upload-confidence and approval-readiness thresholds

## 8.12 Reason-code emission rules for formulas

The formula layer SHALL emit machine-stable reason codes whenever a threshold, cap, freshness rule, or
input-admissibility rule materially affects a result.

The emitted `TrustSummary.reason_codes[]` SHALL preserve the terminal band code
(`TRUST_GREEN`, `TRUST_AMBER`, `TRUST_RED`, or `TRUST_INSUFFICIENT_DATA`) together with every
applicable penalty/cap code that materially changed automation or filing posture. The
`dominant_reason_code` SHALL be the first reason in the frozen trust-priority order that corresponds
to the most restrictive matched cap or blocker. `plain_summary` SHALL be a bounded operator-facing
sentence derived from `dominant_reason_code`, the decisive threshold or freshness state, and the
current filing posture without requiring a recomputation of the trust formula. `decision_constraint_codes[]`
SHALL carry any additional non-dominant constraints that kept the trust result below the next safer
posture, such as threshold-edge review, stale authority state, active filing-critical overrides, or
retention-limited evidence. `decision_explainability_contract{...}` SHALL mirror that same ordered
reason basis, compress the first three reasons into `compressed_reason_codes[]`, retain the exact
`suppressed_reason_count`, and disclose any required `AUTHORITY_STATE`, `LIMITATION_STATE`, or
`OVERRIDE_STATE` qualifier so downstream workflow and shell surfaces do not reconstruct trust
meaning from scores alone.

At minimum:

- `DQ_LOW_COMPLETENESS`
- `DQ_LOW_QUALITY`
- `DQ_INVALID_ERROR_BUDGET`
- `DQ_CONFIDENCE_WEIGHT_INVALID`
- `DQ_WEIGHT_PROFILE_INVALID`
- `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`
- `PARITY_MINOR_DIFFERENCE`
- `PARITY_MATERIAL_DIFFERENCE`
- `PARITY_BLOCKING_DIFFERENCE`
- `PARITY_NOT_COMPARABLE`
- `PARITY_PARTIAL_COVERAGE`
- `PARITY_COMPARISON_SET_INVALID`
- `RISK_WEIGHT_PROFILE_INVALID`
- `RISK_MATERIAL_FLAG`
- `RISK_BLOCKING_FLAG`
- `GRAPH_LOW_COVERAGE`
- `GRAPH_HIGH_INFERENCE`
- `GRAPH_WEIGHT_PROFILE_INVALID`
- `TRUST_INPUT_INCOMPLETE`
- `TRUST_INPUT_STALE`
- `TRUST_INPUT_CONTRADICTION`
- `TRUST_OVERRIDE_INVALID`
- `TRUST_THRESHOLD_EDGE_REVIEW`
- `TRUST_RECALCULATION_REQUIRED`
- `TRUST_OVERRIDE_PENALTY`
- `TRUST_RETENTION_PENALTY`
- `TRUST_AUTHORITY_PENALTY`
- `TRUST_AUTHORITY_CONFIDENCE_LOW`
- `TRUST_AUTHORITY_AMBIGUITY_HIGH`
- `TRUST_AUTHORITY_STATE_STALE`
- `TRUST_AUTHORITY_STATE_UNRESOLVED`
- `TRUST_AMENDMENT_FRESHNESS_STALE`
- `WORK_SLA_UNBOUND`
- `WORK_OWNERSHIP_AMBIGUOUS`
- `WORK_ASSIGNMENT_LOW_EFFICIENCY`
- `WORK_ESCALATION_PRESSURE_HIGH`
- `WORK_QUEUE_HEALTH_DEGRADED`
- `WORK_RESPONSE_GUARD_STALE`
- `WORK_RESOLUTION_CONFIDENCE_LOW`
- `TRUST_RETROACTIVE_IMPACT_UNRESOLVED`
- `TRUST_ANALYSIS_MODE_CAP`
- `TRUST_BLOCKING_RISK`
- `TRUST_REQUIRED_HUMAN_STEPS`
- `FLOW_STABILITY_LOW`
- `UPLOAD_CONFIDENCE_LOW`
- `UPLOAD_RESUME_EXPIRING`
- `UPLOAD_BINDING_STALE`
- `UPLOAD_INTEGRITY_FAILED`
- `APPROVAL_READINESS_LOW`
- `APPROVAL_VIEW_STALE`
- `APPROVAL_STEP_UP_EXPIRED`
- `FRICTION_EXCESSIVE`
- `COMPLETION_RISK_HIGH`
- `TRUST_AUTOMATION_LIMITED`
- `TRUST_UPSTREAM_GATE_BLOCK`
- `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`
- `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`
- `TRUST_GREEN`
- `TRUST_AMBER`
- `TRUST_RED`
- `TRUST_INSUFFICIENT_DATA`

---

## 8.13 One-sentence summary

The formula layer makes the engine reproducible by turning evidence quality, compute outputs, authority
comparison, graph defensibility, and override reliance into a single scored and classified trust
posture that directly governs workflow, automation, filing, and amendment progression.

[1]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
[2]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html?utm_source=chatgpt.com
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0/oas/page?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html
[5]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/apis.html
