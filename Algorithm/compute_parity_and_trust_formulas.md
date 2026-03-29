# Compute, Parity, and Trust Formulas

## Compute, parity, and trust formulas

This section turns the engine from a conceptual workflow into a reproducible scoring and decisioning
system. It defines how record-layer facts become reportable totals, how authority comparisons are
classified, and how trust is synthesized into filing readiness.

## 8.1 Structural correction to the current pack

Before applying the formulas, update the pack so that `TrustSummary` contains both machine-facing and
human-facing fields:

- `trust_band in {INSUFFICIENT_DATA, RED, AMBER, GREEN}`
- `trust_score in [0,100]`
- `trust_level in {READY, REVIEW_REQUIRED, BLOCKED}`
- `automation_level in {ALLOWED, LIMITED, BLOCKED}`
- `filing_readiness in {NOT_READY, READY_REVIEW, READY_TO_SUBMIT}`

That resolves the current schema/state-machine mismatch.

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
- `round_money(x)` according to the frozen currency/rounding profile after exact decimal accumulation
- `safe_unit(x) = max(1e-6, clamp01(x))`
- `weighted_mean(v_i, w_i) = Σ(w_i * v_i) / Σw` when `Σw > 0`
- `Σw = sum of all active weights in the relevant profile`

---

## 8.3 Data-quality and completeness formulas

These formulas are upstream inputs to trust.

For each required domain `d`, define:

- `presence_d in {0, 0.5, 1}`
- `0 = missing`
- `0.5 = partial`
- `1 = present`

- `freshness_d in {0, 0.25, 0.5, 1}`
- `0 = expired`
- `0.25 = unknown`
- `0.5 = stale`
- `1 = current`

- `confidence_d in [0,1]`
- Let `C_d` be the lineage-deduplicated set of eligible canonical facts in domain `d`
- For each `f in C_d`, let `fact_confidence_f in [0,1]` be the numeric confidence resolved by the frozen `evidence_confidence_policy_ref` from `supporting_evidence_refs[]`, `source_strength_tier`, and any carried-forward canonicalization confidence
- Let `fact_weight_f >= 0` be the corresponding support weight from the same frozen confidence policy; any negative weight SHALL emit `DQ_CONFIDENCE_WEIGHT_INVALID` and SHALL be treated as `0`
- `confidence_weight_sum_d = Σ(fact_weight_f)` across `f in C_d`
- If `|C_d| > 0` and `confidence_weight_sum_d = 0`, emit `DQ_CONFIDENCE_WEIGHT_INVALID`
- `confidence_d = 0 if |C_d| = 0 or confidence_weight_sum_d = 0 else clamp01(Σ(fact_weight_f * fact_confidence_f) / confidence_weight_sum_d)`

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

`domain_quality_d = 100 * (0.35*presence_d + 0.20*freshness_d + 0.20*confidence_d + 0.15*validation_d + 0.10*partition_integrity_d)`

Let `Σw_domain = Σ(weight_d)` across active domains where `weight_d > 0`. If `Σw_domain = 0`, emit `DQ_WEIGHT_PROFILE_INVALID`, set `completeness_score = 0`, and set `data_quality_score = 0`.

Overall completeness:

`completeness_score = 0 if Σw_domain = 0 else round_score(100 * (Σ(weight_d * presence_d) / Σw_domain))`

Overall data quality:

`data_quality_score = 0 if Σw_domain = 0 else round_score(Σ(weight_d * domain_quality_d) / Σw_domain)`

This formulation makes invalid validation budgets score-conservative instead of silently neutral, and it makes domain confidence reproducible by binding numeric confidence to the frozen evidence-confidence policy rather than to an implementation-specific averaging shortcut.

An invalid domain error budget or a zero-sum domain-weight profile is a structural scoring failure. If it affects a filing-critical domain/profile, `DATA_QUALITY_GATE` SHALL treat it as a filing-critical structural error rather than as a soft warning.

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
- `eligible_compute_facts(mode)` = facts with `promotion_state = CANONICAL` when `mode = COMPLIANCE`; for `mode = ANALYSIS`, this may also include `PROVISIONAL` facts only when the frozen analysis policy explicitly allows it and the resulting output remains `analysis_only = true`
- only facts in `eligible_compute_facts(mode)` may contribute to compute; compliance-grade parity always requires `CANONICAL` authority-comparable facts, while analysis-mode parity may include `PROVISIONAL` facts only when the frozen analysis policy explicitly allows it and the resulting artifact remains `analysis_only = true`

For business partition `b`, category `c`, and time window `T`:

`record_total(b,c,T,mode) = round_money(Σ signed_amount(f)) for all f in F_record ∩ eligible_compute_facts(mode) where f.business_partition = b and f.category = c and f.effective_date in T`

`adjustment_total(b,c,T,scope_token,mode) = round_money(Σ signed_amount(a)) for all a in F_adjust ∩ eligible_compute_facts(mode) where a.business_partition = b and a.category = c and a.applicable_scope contains scope_token and a.effective_date in T`

### Quarterly basis profile

The provider contract profile SHALL freeze:

`quarterly_basis in {PERIODIC, CUMULATIVE}`

If `quarterly_basis = PERIODIC`:

`quarterly_reportable_total(b,c,q,mode) = record_total(b,c, quarter_window(q), mode)`

If `quarterly_basis = CUMULATIVE`:

`quarterly_reportable_total(b,c,q,mode) = record_total(b,c, tax_year_start .. quarter_end(q), mode)`

That parameter is important because HMRC's published roadmap describes a change in how periodic
obligations are marked as met, tied to submission of cumulative update data, while GOV.UK guidance
today still describes quarterly periods and corrections carrying forward through later updates. [5]

### Year-end reportable totals

For year-end/final-declaration preparation:

`annual_record_total(b,c,mode) = record_total(b,c, full_tax_year, mode)`

`annual_adjusted_total(b,c,mode) = annual_record_total(b,c,mode) + adjustment_total(b,c, full_tax_year, reporting_scope(runtime_scope), mode)`

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

Each comparison item `k in K` SHALL include:

- `field_code`
- `internal_value_k`
- `authority_value_k`
- `criticality_weight_k` where `criticality_weight_k > 0`
- `abs_threshold_k` where `abs_threshold_k >= 0`
- `rel_threshold_k` where `rel_threshold_k >= 0`
- `abs_floor_k` where `abs_floor_k > 0`
- `criticality_class in {CRITICAL, HIGH, NORMAL}`

`K` SHALL be de-duplicated by `field_code` and ordered deterministically by `(criticality_rank desc, field_code asc)`, where `criticality_rank(CRITICAL)=3`, `criticality_rank(HIGH)=2`, and `criticality_rank(NORMAL)=1`. A duplicate `field_code`, non-numeric value, negative threshold, non-positive floor, or non-positive weight SHALL emit `PARITY_COMPARISON_SET_INVALID` and SHALL block parity rather than being guessed through.

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
before parity evaluation, and the resulting basis SHALL be reused by later filing or amendment stages
instead of recomputed on a different basis.

If a required `intent-to-amend` calculation returns any non-`PASS` `validation_outcome`, parity
SHALL not be evaluated on a guessed or partial basis. The engine SHALL persist the returned
calculation context on `AmendmentCase` and route the run through `AMENDMENT_GATE(...)`. It SHALL not
route that failure through `FILING_GATE(...)` and SHALL not terminate directly from raw
`validation_outcome`.

---

## 8.7 Per-field parity formulas

For each comparison item `k`:

If `internal_value_k` or `authority_value_k` is non-numeric, NaN, or infinite, classify the item as invalid comparison input and do not propagate the numeric error downstream.

`delta_signed_k = internal_value_k - authority_value_k`

`delta_abs_k = abs(delta_signed_k)`

`effective_abs_floor_k = max(abs_floor_k, minimum_rel_floor)` where `minimum_rel_floor > 0` is frozen in the parity threshold profile

`delta_rel_k = 0 if delta_abs_k = 0 else delta_abs_k / max(abs(authority_value_k), abs(internal_value_k), effective_abs_floor_k)`

`breach_abs_k = 0 if abs_threshold_k == 0 and delta_abs_k == 0 else INF if abs_threshold_k == 0 else delta_abs_k / abs_threshold_k`

`breach_rel_k = 0 if rel_threshold_k == 0 and delta_rel_k == 0 else INF if rel_threshold_k == 0 else delta_rel_k / rel_threshold_k`

`breach_ratio_k = max(breach_abs_k, breach_rel_k)`

### Per-field classification

If no valid authority value exists and comparison is required, or if the comparison input itself is invalid:

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

`parity_score = 0 if Σw_required = 0 and comparison is mandatory else round_score(parity_score_raw)`

This coverage-adjusted form prevents a partially comparable set from looking artificially strong when required fields are missing or invalid.

This yields:

- `100` when full required coverage exists and all compared items match
- around `67` when full required coverage exists and average breach pressure is at the threshold line
- around `33` when full required coverage exists and average breach pressure is roughly double-threshold
- `0` when the set is severely divergent or wholly non-comparable

### Aggregate parity classification

Set aggregate `parity_classification` as follows:

- `NOT_COMPARABLE`
  if `comparison is mandatory` and `comparison_coverage < 1`
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

---

## 8.9 Evidence-graph quality formula

Trust should not use risk and parity alone. It needs a defensibility component.

Define:

- `F_return` = filing-critical figures in scope
- `F_critical` = all critical figures in scope
- `coverage_return = 1 if |F_return| = 0 else |{f in F_return : f has at least one complete explainable path}| / |F_return|`
- `coverage_critical = 1 if |F_critical| = 0 else |{f in F_critical : f has direct non-erased support}| / |F_critical|`
- For each `f in F_critical`, let `G_f` be the admissible explanation subgraph whose decisive-support edges carry capacity `support_confidence_e in [0,1]`
- `best_path_confidence(f) = 0` if `f` has no admissible explainable path; otherwise `max_p min_{e in p}(support_confidence_e)` across admissible decisive-support paths `p` in `G_f`
- `best_admissible_path(f) = None` if no admissible path exists; otherwise one deterministic argmax path attaining `best_path_confidence(f)`, tie-broken by canonical node/edge order
- `best_path_confidence(f)` SHALL be computed without explicit path enumeration: use reverse-topological dynamic programming on an acyclic admissible explanation graph, or a widest-path algorithm over edge capacities on a general admissible graph
- `figure_weight_f >= 0` from the frozen graph-quality profile; any negative weight SHALL emit `GRAPH_WEIGHT_PROFILE_INVALID` and SHALL be treated as `0`
- `Σw_graph = Σ(figure_weight_f)` across `f in F_critical`
- `weighted_path_confidence = 1 if |F_critical| = 0 else 0 if Σw_graph = 0 else Σ(figure_weight_f * best_path_confidence(f)) / Σw_graph`
- `inferred_path_ratio = 0 if |F_critical| = 0 else |{f in F_critical : best_admissible_path(f) != None and best_admissible_path(f) contains inferred decisive support and no direct decisive support}| / |F_critical|`

This max-min formulation preserves the weakest-link semantics exactly while avoiding exponential
path enumeration in dense provenance graphs.

Then:

`graph_quality_score = round_score(100 * (0.40*coverage_return + 0.25*coverage_critical + 0.20*weighted_path_confidence + 0.15*(1 - inferred_path_ratio)))`

If any filing-critical figure has no explainable path at all, `graph_quality_score` SHALL be capped at
`59`.

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

If comparison is not required and no valid authority basis exists, set:

- `P = 70`
- add reason code `PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS`

If comparison is required but unavailable:

- do not synthesize straight-through trust
- upstream parity gate must already block

### Required trust input

`baseline_submission_state in {KNOWN_MATCHED, KNOWN_FILED, UNKNOWN, OUT_OF_BAND_UNRECONCILED, NOT_APPLICABLE}`
SHALL be supplied by the authority-state loader and frozen for trust synthesis.

`live_authority_progression_requested in {true,false}` SHALL also be supplied and set to `true` when the authorized `runtime_scope[]` includes `prepare_submission`, `submit`, or `amendment_submit`.

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

`authority_penalty = 15 if baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED} else 0`

`trust_score = round_score(trust_core_score - override_penalty - retention_penalty - authority_penalty)`

### Trust-band rules

Set `trust_band = INSUFFICIENT_DATA` if any of the following is true:

- upstream gate produced `HARD_BLOCK` due to missing required evidence, missing required authority comparison, missing required authority link, or missing required filing baseline
- `completeness_score < 60`
- `graph_quality_score < 50` for a filing-capable run

Else set:

- `GREEN` if:
- `trust_score >= 85`
- `parity_classification` is in `{MATCH, MINOR_DIFFERENCE}`
- `required_human_steps_count = 0`
- `unresolved_material_blocking_risk_flag = false`
- no filing-critical override is being relied upon
- not (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`)
- `AMBER` if:
- `65 <= trust_score < 85`
- and no hard-block condition exists
- `RED` otherwise

### Projected human-facing level

- `trust_level = READY` if `trust_band = GREEN`
- `trust_level = REVIEW_REQUIRED` if `trust_band = AMBER`
- `trust_level = BLOCKED` if `trust_band` is in `{RED, INSUFFICIENT_DATA}`

### Automation level

- `automation_level = ALLOWED` if:
- `trust_band = GREEN`
- `risk_score < 40`
- `active_filing_critical_override_count = 0`
- `required_human_steps_count = 0`
- not (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`)
- `automation_level = LIMITED` if:
- `trust_band = AMBER`
- or `trust_band = GREEN` but any override/notice/limitation exists
- or (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`)
- `automation_level = BLOCKED` otherwise

### Filing readiness

- `filing_readiness = READY_TO_SUBMIT` if:
- `trust_band = GREEN`
- `automation_level = ALLOWED`
- `required_human_steps_count = 0`
- not (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`)
- `filing_readiness = READY_REVIEW` if:
- `trust_band` is in `{GREEN, AMBER}`
- and (`required_human_steps_count > 0` or `automation_level != ALLOWED` or (`live_authority_progression_requested = true` and `baseline_submission_state in {UNKNOWN, OUT_OF_BAND_UNRECONCILED}`))
- `filing_readiness = NOT_READY` otherwise

---

## 8.11 Out-of-band and unknown-state handling

If the baseline legal state is external, unresolved, or authority-unknown:

- `baseline_submission_state` SHALL be set to `UNKNOWN` or `OUT_OF_BAND_UNRECONCILED` before trust synthesis
- the engine SHALL not inflate trust by internal confidence alone
- `authority_penalty` SHALL apply
- `filing_readiness` SHALL not progress past `READY_REVIEW`
- reason code `TRUST_AUTHORITY_STATE_UNRESOLVED` SHALL be emitted

This is essential because the legal truth of submission state is authority-defined, not UI-defined.

---

## 8.12 Reason-code emission rules for formulas

The formula layer SHALL emit machine-stable reason codes whenever a threshold or cap materially affects
a result.

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
- `PARITY_COMPARISON_SET_INVALID`
- `RISK_WEIGHT_PROFILE_INVALID`
- `RISK_MATERIAL_FLAG`
- `RISK_BLOCKING_FLAG`
- `GRAPH_LOW_COVERAGE`
- `GRAPH_HIGH_INFERENCE`
- `GRAPH_WEIGHT_PROFILE_INVALID`
- `TRUST_OVERRIDE_PENALTY`
- `TRUST_RETENTION_PENALTY`
- `TRUST_AUTHORITY_PENALTY`
- `TRUST_AUTHORITY_STATE_UNRESOLVED`
- `TRUST_REQUIRED_HUMAN_STEPS`
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
