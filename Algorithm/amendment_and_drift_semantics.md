# Amendment and Drift Semantics

## Amendment and drift semantics

The engine SHALL distinguish sharply between corrections, post-year completion work,
post-finalisation amendments, authority-side corrections, and non-filing explanation drift. Not every
change after a run is an amendment, and not every difference after filing should trigger a new
submission.

The purpose of this section is to guarantee that the engine can answer all of the following questions
deterministically:

1. What is the legal baseline currently in force?
2. Is the new information merely a pre-finalisation correction, or is it post-finalisation drift?
3. Is the drift benign, review-worthy, or amendment-worthy?
4. Is an amendment legally eligible right now?
5. If an amendment is eligible, what exact authority path must be followed?
6. How should the engine behave when history is incomplete, authority state is out-of-band, or HMRC has corrected the position externally?

## 10.1 Core distinction: correction vs amendment

The engine SHALL implement the following non-negotiable distinction.

### A. In-year / pre-finalisation correction

A correction made before final declaration is not an amendment. It updates the working reporting
position and is absorbed into later quarterly-update or year-end processing.

This aligns with HMRC guidance: quarterly updates are sent every 3 months for each self-employment and
property income source, corrections made during the year are included in the next quarterly update,
and there is no need to resend the original quarterly update after making a correction. If the fourth
quarterly update has already been sent, corrections must be made before the Income Tax position is
finalised. [8]

### B. Post-finalisation amendment

A change after final declaration through software is an amendment candidate, not a normal correction.

HMRC's year-end guide says that once a customer has completed their final declaration through software,
they have 12 months from the statutory filing date to make changes, and the software should verify
eligibility using authority-recognised final declaration status. [9]

### C. Authority correction

A change introduced by the authority rather than by the engine is neither a user correction nor an
engine-originated amendment. It is an authority correction that must be reconciled against the last
engine-known baseline. HMRC's roadmap specifically anticipates corrections made by HMRC becoming
visible in software. [7]

## 10.2 Baseline hierarchy

The engine SHALL maintain a strict baseline hierarchy.

### 1. Working baseline

The latest sealed, non-finalised manifest for the relevant client/period/scope.

### 2. Filed baseline

The manifest linked to the latest authority-confirmed final declaration for that scope.

### 3. Amended baseline

The manifest linked to the latest authority-confirmed post-finalisation amendment.

### 4. Authority-corrected baseline

A reconciled baseline derived from authority-of-record changes not initiated by the in-scope packet
chain.

### 5. External/out-of-band baseline

A baseline inferred from authority state when filing occurred outside the current engine lineage or
when authority truth exists but has not yet been reconciled into a lineage-safe filed/amended
baseline.

The baseline selector SHALL emit an explicit `baseline_type` from:

- `WORKING`
- `FILED`
- `AMENDED`
- `AUTHORITY_CORRECTED`
- `OUT_OF_BAND`

Baseline precedence SHALL be a total order, not a tie:

`AUTHORITY_CORRECTED > AMENDED > FILED > OUT_OF_BAND > WORKING`

This means the engine prefers the most recent authority-grounded legal truth, even when that truth is
not part of the engine's own packet chain. `OUT_OF_BAND` remains lower than a confirmed filed or
amended baseline because unresolved out-of-band truth is authoritative enough to block guessing, but
not authoritative enough to let the engine fabricate continuity or auto-progress amendment.

`SELECT_DRIFT_BASELINE(...)` SHALL return and persist a frozen `DriftBaselineEnvelope` containing at minimum:

- `baseline_envelope_id`
- `baseline_ref`
- `baseline_manifest_id` where one exists
- `baseline_type`
- `baseline_scope_refs[]`
- `baseline_basis_ref`
- `authority_basis_refs[]`
- `baseline_submission_state`
- `truth_origin`
- `baseline_effective_at`
- `selection_reason_codes[]`
- `selection_contract{selection_contract_hash, active_exact_scope_key, target_scope_refs[], selected_scope_refs[], scope_match_class, scope_resolution_state, exact_scope_candidate_present, selected_baseline_type, same_scope_truth_resolution_state, precedence_rank, authority_resolution_class, authority_resolution_rank, continuity_class, chain_continuity_rank, baseline_anchor_weight, uncertainty_reason_codes[], automation_ceiling, review_recommendation_floor, amendment_progression_ceiling, benign_drift_eligibility_state}`
- `frozen_hash`
- `supersedes_baseline_frozen_hash_or_null`

`SELECT_DRIFT_BASELINE(...)` SHALL also persist one
`DriftBaselineSelectionVisualization` artifact containing at minimum:

- `execution_mode_boundary_contract`
- `basis_contract{basis_contract_hash, active_exact_scope_key, target_scope_refs[], candidate_refs[], candidate_universe_hash, prior_active_baseline_envelope_ref_or_null, prior_active_baseline_frozen_hash_or_null, selection_profile_code, dominance_key_profile_code}`
- `visualization_outcome`
- `selected_candidate_ref`
- `selected_selection_contract{...}`
- `selected_selection_reason_codes[]`
- `selected_baseline_envelope_ref`
- `selected_baseline_frozen_hash`
- `candidate_results[]` with each candidate's scope compatibility, dominance tuple, authority/continuity posture, uncertainty ceiling, selection outcome, and explicit loss reasons
- `same_scope_envelope_lineage[]`
- `visualization_hash`

For each candidate baseline `j` surviving exact-scope compatibility filtering, the selector SHALL
compute a lexicographic dominance key rather than rely on prose-only tie-breaking:

`dominance_key_j = (scope_rank_j, precedence_rank_j, authority_resolution_rank_j, chain_continuity_rank_j, effective_time_rank_j, manifest_generation_rank_j, stable_id_rank_j)`

Where:

- `scope_rank_j = 3` for exact obligation/partition/exact-scope match, `2` for a scope-sliced
  compatible subset match, and `1` for a broader inferred client-period match
- `precedence_rank_j = 5,4,3,2,1` for `AUTHORITY_CORRECTED`, `AMENDED`, `FILED`, `OUT_OF_BAND`,
  and `WORKING` respectively
- `authority_resolution_rank_j = 3` when backed by explicit authority-confirmed or
  authority-corrected evidence for the exact scope, `2` when backed by authority-observed but
  lineage-external truth, `1` when backed only by engine-filed lineage not yet refreshed from
  authority, and `0` for working-only state
- `chain_continuity_rank_j = 2` when the candidate is in the same legal submission/amendment chain,
  `1` when the candidate is legally matched but chain-external, and `0` otherwise
- `effective_time_rank_j =` latest durable authority-effective timestamp if present, else latest
  durable recorded timestamp
- `manifest_generation_rank_j =` latest manifest generation inside the same legal baseline chain
- `stable_id_rank_j =` stable lexical baseline reference order

`SELECT_DRIFT_BASELINE(...)` SHALL choose the lexicographic maximum `dominance_key_j`.
If any exact-scope candidate survives compatibility filtering, the persisted
`selection_contract.scope_match_class` SHALL be `EXACT_SCOPE_MATCH`; a broader client-period or
subset baseline MAY only be selected when no exact-scope candidate remains lawful.
`selection_contract.scope_resolution_state` SHALL therefore freeze whether the winner was
exact-scope, narrowed fallback without an exact candidate, or broader fallback without an exact
candidate. Downstream drift, trust, and amendment consumers SHALL use that persisted state rather
than re-inferring scope safety from the selected refs alone.

No baseline rule may silently widen from one business partition, income-source partition, or
obligation slice into another merely because they share the same client and period.
Partial authority-corrected or out-of-band baselines outrank lower classes only for their own
declared scope.
`selection_contract.same_scope_truth_resolution_state` SHALL also freeze whether no stronger exact-
scope external truth existed, authority-corrected truth was selected, or unresolved out-of-band
truth blocked internal lineage from pretending to remain authoritative.
The paired `DriftBaselineSelectionVisualization.candidate_results[]` SHALL surface the same
candidate-level scope compatibility, dominance tuple, loss reasons, and supersession posture for
every candidate that was considered, including exact-scope losers and broader fallbacks that were
blocked because an exact-scope candidate remained lawful. Operators and replay workflows SHALL use
that persisted artifact rather than reconstructing losing-path explanations from fresh scans.

After selection, the engine SHALL persist `selection_contract.baseline_anchor_weight in [0,1]` plus
explicit `selection_contract.uncertainty_reason_codes[]`:

`baseline_anchor_weight = min(1, max(0, base_type_weight - 0.25*I(scope_rank_j < 3) - 0.25*I(authority_resolution_rank_j < 2) - 0.25*I(material_history_incomplete_for_decisive_fields) - 0.25*I(conflicting_same_scope_out_of_band_truth_exists)))`

Here `I(condition) = 1` when the condition is true and `0` otherwise.

with `base_type_weight = 1.00` for `AUTHORITY_CORRECTED`, `AMENDED`, and `FILED`, `0.75` for
`OUT_OF_BAND`, and `0.50` for `WORKING`.

`baseline_anchor_weight` SHALL NOT attenuate any proved numeric delta, proved declared-basis delta,
or proved authority divergence. It is an uncertainty control used only to raise review pressure,
cap automation, and forbid `BENIGN_DRIFT` classification where same-scope legal-baseline ambiguity
remains.
The selector SHALL serialize those downstream consequences directly on
`selection_contract.automation_ceiling`, `selection_contract.review_recommendation_floor`,
`selection_contract.amendment_progression_ceiling`, and
`selection_contract.benign_drift_eligibility_state` so later trust or amendment paths do not guess
from `baseline_type` alone.

`DriftBaselineEnvelope` SHALL be immutable once written. If later authority reconciliation or
same-scope supersession yields a better baseline, the engine SHALL write a new envelope and link the
older one by supersession reference; it SHALL NOT mutate the already-used envelope in place.
The successor envelope SHALL retain `supersedes_baseline_frozen_hash_or_null` pointing to the prior
frozen envelope hash so replay can prove supersession lineage instead of relying on mutable row
replacement.
The same-scope lineage chain SHALL also be mirrored in
`DriftBaselineSelectionVisualization.same_scope_envelope_lineage[]`, with exactly one active
selected or reused entry and explicit superseded predecessors, so replay or operator tooling can
show when a historical envelope was reused versus when a stronger same-scope successor replaced it.
`baseline_type` and `baseline_submission_state` SHALL remain aligned (`WORKING`/`WORKING`,
`FILED`/`FILED_CONFIRMED`, `AMENDED`/`AMEND_CONFIRMED`, `AUTHORITY_CORRECTED`/`AUTHORITY_CORRECTED`,
`OUT_OF_BAND`/`OUT_OF_BAND_UNRECONCILED`). `AUTHORITY_CORRECTED` and `OUT_OF_BAND` envelopes SHALL
retain non-empty `authority_basis_refs[]`, and `OUT_OF_BAND` envelopes SHALL NOT pretend to come
from an internal manifest chain by carrying `baseline_manifest_id`.
`selection_contract.continuity_class` SHALL remain explicit and SHALL NOT serialize
`AUTHORITY_CORRECTED` or `OUT_OF_BAND` truth as internal chain continuity.

## 10.3 Drift object model

A `DriftRecord` SHALL include at minimum:

`DriftRecord` SHALL validate against `schemas/drift_record.schema.json`.

- `drift_id`
- `manifest_id`
- `baseline_ref`
- `baseline_envelope_ref`
- `baseline_manifest_id`
- `comparison_manifest_id`
- `baseline_type`
- `baseline_scope_refs[]`
- `drift_scope_refs[]`
- `active_exact_scope_key`
- `baseline_basis_ref`
- `authority_basis_refs[]`
- `drift_scope`
- `difference_classes[]`
- `field_deltas[]`
- `money_profile`
- `plane_pressures{fact,total,filing,authority,explanation}`
- `tax_delta_abs`
- `tax_delta_rel`
- `drift_pressure`
- `amendment_pressure`
- `critical_field_delta_count`
- `cause_codes[]`
- `materiality_profile_ref`
- `materiality_class`
- `lifecycle_state`
- `amendment_recommendation`
- `amendment_window_context_ref`
- `retroactive_impact_ref`
- `late_data_indicator_refs[]`
- `source_contradiction_state`
- `review_state`
- `escalation_state`
- `recommendation_cap`
- `automation_cap`
- `lineage_boundary_refs[]`
- `basis_limitations[]`
- `supersedes_drift_id`
- `superseded_at`

### Drift scopes

- `RECORD_LAYER`
- `ADJUSTMENT_LAYER`
- `AUTHORITY_LAYER`
- `DECLARATION_LAYER`
- `EXPLANATION_LAYER`
- `RETENTION_LIMITED_LAYER`

### Difference classes

Each `DriftRecord` SHALL classify one or more `difference_classes[]` so operators and downstream
workflow can distinguish what changed, not just how much changed.

Allowed classes:

- `FACT_STATE`: one or more canonical facts, source records, or extraction assertions changed
- `TOTAL_STATE`: one or more derived subtotals, totals, or liability-bearing aggregates changed
- `FILING_STATE`: one or more declared-basis fields, filing-critical payload fields, or linked
  calculation-basis fields changed
- `AUTHORITY_STATE`: authority-held status, authority-corrected truth, or authority-linked basis
  changed relative to the prior legal baseline
- `EXPLANATION_STATE`: provenance, support quality, contradiction posture, or retained explanation
  changed while reportable numeric state remained stable

Classification rules:

- a drift MAY carry multiple classes simultaneously
- `TOTAL_STATE` SHALL be present whenever recomputation changes a persisted derived total, even if the
  underlying fact change was tiny
- `FILING_STATE` SHALL be present whenever the would-submit payload, declaration agreement basis, or
  authority calculation basis would differ from the selected baseline
- `AUTHORITY_STATE` SHALL be present whenever the authority-of-record position changed, even if the
  current manifest inputs did not
- `EXPLANATION_STATE` SHALL be used only when explainability/support changed and no stronger numeric or
  filing class has already captured the same effect

`difference_classes[]` drive operator explanation, amendment-trigger semantics, late-data handling,
and retroactive impact analysis; they SHALL NOT be reduced to free-text cause notes.

## 10.4 Drift causes

The engine SHALL classify root causes explicitly.

Recommended `cause_codes[]`:

- `LATE_SOURCE_ARRIVAL`
- `SOURCE_CORRECTION`
- `CATEGORY_RECLASSIFICATION`
- `PARTITION_REALLOCATION`
- `RULE_OR_CONFIG_DIFFERENCE`
- `AUTHORITY_REFERENCE_CHANGE`
- `AUTHORITY_CORRECTION`
- `OUT_OF_BAND_FILING_DISCOVERED`
- `OVERRIDE_CHANGE`
- `RETENTION_LIMITED_HISTORY`
- `PREVIOUS_EXTRACTION_ERROR`
- `CALCULATION_PATH_CHANGE`

## 10.5 Pre-finalisation semantics

Before final declaration is confirmed, newly arrived facts, corrected records, late documents, or
revised assertions SHALL update the working baseline rather than create amendment semantics.

The engine SHALL therefore treat:

- errors found during the year,
- corrections included in later quarterly updates,
- and final pre-finalisation clean-up after the fourth quarterly update

as working-state evolution, not as post-finalisation drift. HMRC explicitly says corrections during
the year go into the next quarterly update, and if the fourth quarterly update has already been sent,
corrections should be made before finalising the tax position. [8]

## 10.6 Post-finalisation semantics

Once a final declaration has been confirmed through software, the engine SHALL switch to drift
semantics.

From that point forward:

- new evidence does not rewrite the selected legal baseline;
- instead, it is compared against the selected legal baseline;
- a `DriftRecord` is created;
- and the engine decides whether the outcome is explanation-only, review-only, or amendment-worthy.

This mirrors HMRC's post-finalisation model, where amendment is a distinct process after
software-completed final declaration rather than just another in-year correction. [9]

## 10.6A Temporal interpretation of post-cutoff evidence

Before materiality is scored, the engine SHALL classify each affected field or late-data item `k`
using both business-effective time and source-visibility time; discovery time alone is not enough.

Define:

- `t_cutoff = collection_boundary.read_cutoff_at`
- `t_baseline = baseline.baseline_effective_at`
- `t_effective_k =` earliest proved business-effective time of the underlying fact, authority
  correction, or declared-basis change
- `t_visible_k =` earliest proved time the source or authority made the item retrievable under the
  frozen source plan or authority query basis
- `t_discovered_k =` the engine detection time for the current run
- `temporal_certainty_k = 1` iff the timestamps required below are present and non-contradictory;
  otherwise `0`

Then classify `temporal_class_k` in the following precedence order:

- `TEMPORALLY_UNPROVED`
  if `temporal_certainty_k = 0`
- `AUTHORITY_POSTING_LAG`
  if the change is authority-originated, `t_effective_k <= t_baseline`, and `t_visible_k > t_cutoff`
- `TRUE_POST_BASELINE_DRIFT`
  if `t_effective_k > t_baseline`
- `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`
  if `t_effective_k <= t_cutoff` and `t_visible_k <= t_cutoff`
- `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`
  otherwise

Interpretation rules:

- `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL` SHALL be treated as missed pre-cutoff knowledge, not as a new
  post-baseline business event
- `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT` SHALL be eligible to reopen or restate a filed/amended
  position when decisive fields are affected; it SHALL NOT be downgraded to mere current-period noise
  just because the engine learned it after cutoff
- `TRUE_POST_BASELINE_DRIFT` SHALL not be forced backward into prior legal positions unless the
  provider/legal basis is cumulative or `RetroactiveImpactAnalysis` proves a prior-position
  dependency
- `AUTHORITY_POSTING_LAG` SHALL be treated as legal-baseline reconciliation pressure even where the
  economic fact predates discovery
- `TEMPORALLY_UNPROVED` touching any tax-bearing, declared-basis, authority, or replay-boundary
  field SHALL force at least `MATERIAL_REVIEW` and cap recommendation at `RECONCILE_FIRST` or
  `REVIEW_ONLY`

## 10.7 Drift materiality profile

The engine SHALL use a frozen `AmendmentMaterialityProfile` to classify drift.

Required profile fields:

- `abs_tax_delta_threshold`
- `rel_tax_delta_threshold`
- `field_abs_delta_threshold_default`
- `field_rel_delta_threshold_default`
- `minimum_rel_floor`
- `critical_field_weight`
- `noncritical_field_weight`
- `pressure_power`
- `authority_divergence_penalty`
- `evidence_weakness_penalty`
- `override_dependency_penalty`
- `late_data_retroactive_penalty`
- `retroactive_restatement_penalty`
- `baseline_uncertainty_penalty`
- `temporal_ambiguity_penalty`
- `auto_amend_allowed`
- `review_only_threshold`
- `amendment_required_threshold`

The frozen profile SHALL satisfy:

- `abs_tax_delta_threshold >= 0`
- `rel_tax_delta_threshold >= 0`
- `critical_field_weight > 0`
- `noncritical_field_weight > 0`
- `pressure_power >= 2`
- `field_abs_delta_threshold_default >= 0`
- `field_rel_delta_threshold_default >= 0`
- `minimum_rel_floor > 0`
- `authority_divergence_penalty >= 0`
- `evidence_weakness_penalty >= 0`
- `override_dependency_penalty >= 0`
- `late_data_retroactive_penalty >= 0`
- `retroactive_restatement_penalty >= 0`
- `baseline_uncertainty_penalty >= 0`
- `temporal_ambiguity_penalty >= 0`
- `0 <= review_only_threshold < amendment_required_threshold`

### Derived metrics

For each affected field `k`, the engine SHALL compute a proved lower-bound pressure and a possible
upper-bound pressure. Missing or retention-limited history SHALL therefore widen the pressure
interval rather than being silently treated as zero.

For each affected field `k`:

- `weight_k = critical_field_weight` when `k` is filing/declaration-critical; otherwise
  `noncritical_field_weight`
- `basis_change_lb_k = 1` when `k` is a non-numeric declared/reportable basis field and its
  canonicalized current value differs from its canonicalized baseline value; otherwise `0`
- `basis_change_ub_k = 1` when `basis_change_lb_k = 1`, or when materially missing,
  temporally-unproved, or unreconciled same-scope history could still change the canonicalized
  declared/reportable basis value for `k`; otherwise `0`
- `explanation_change_lb_k = 1` when `k` is non-numeric, not a declared/reportable basis field, and
  its support, provenance, contradiction, or retention posture changed materially; otherwise `0`
- `explanation_change_ub_k = 1` when `explanation_change_lb_k = 1`, or when materially missing,
  temporally-unproved, or retention-limited history could still change that posture for `k`;
  otherwise `0`
- if `k` is numeric:
  - `field_abs_threshold_k =` the field-specific absolute threshold from the frozen profile, or
    `field_abs_delta_threshold_default` if no override exists
  - `field_rel_threshold_k =` the field-specific relative threshold from the frozen profile, or
    `field_rel_delta_threshold_default` if no override exists
  - `field_rel_floor_k =` the field-specific relative floor from the frozen profile, or
    `minimum_rel_floor` if no override exists
  - `relative_activation_floor_k = field_rel_floor_k` if `field_abs_threshold_k = 0`, else `min(field_abs_threshold_k, field_rel_floor_k)`
  - `observed_delta_abs_k = abs(new_value_k - baseline_value_k)` over the retained comparable portion
  - `missing_abs_bound_k >= 0` = proved worst-case additional absolute change attributable to missing,
    erased, temporally unproved, or not-yet-reconciled decisive history for `k`; `0` when no such
    additional change is possible under the frozen scope and late-data basis; `INF` MAY be used only
    when a decisive field is materially history-unbounded
  - `field_delta_abs_lb_k = observed_delta_abs_k`
  - `field_delta_abs_ub_k = INF` if `missing_abs_bound_k = INF` else `observed_delta_abs_k + missing_abs_bound_k`
  - `field_delta_rel_lb_k = 0 if field_delta_abs_lb_k = 0 else field_delta_abs_lb_k / max(abs(baseline_value_k), abs(new_value_k), field_rel_floor_k)`
  - `field_delta_rel_ub_k = 0 if field_delta_abs_ub_k = 0 else INF if field_delta_abs_ub_k = INF else field_delta_abs_ub_k / max(abs(baseline_value_k), abs(new_value_k), field_rel_floor_k)`
  - `breach_abs_lb_k = 0 if field_abs_threshold_k = 0 and field_delta_abs_lb_k = 0 else INF if field_abs_threshold_k = 0 else field_delta_abs_lb_k / field_abs_threshold_k`
  - `breach_abs_ub_k = 0 if field_abs_threshold_k = 0 and field_delta_abs_ub_k = 0 else INF if field_abs_threshold_k = 0 else field_delta_abs_ub_k / field_abs_threshold_k`
  - `breach_rel_lb_k = 0 if field_rel_threshold_k = 0 and field_delta_rel_lb_k = 0 else INF if field_rel_threshold_k = 0 else field_delta_rel_lb_k / field_rel_threshold_k`
  - `breach_rel_ub_k = 0 if field_rel_threshold_k = 0 and field_delta_rel_ub_k = 0 else INF if field_rel_threshold_k = 0 else field_delta_rel_ub_k / field_rel_threshold_k`
  - `guarded_breach_rel_lb_k = 0` when `field_delta_abs_lb_k < relative_activation_floor_k` and
    `breach_abs_lb_k < 1`; else `breach_rel_lb_k`
  - `guarded_breach_rel_ub_k = 0` when `field_delta_abs_ub_k < relative_activation_floor_k` and
    `breach_abs_ub_k < 1`; else `breach_rel_ub_k`
  - `field_pressure_lb_k = min(max(breach_abs_lb_k, guarded_breach_rel_lb_k), 3.0)`
  - `field_pressure_ub_k = min(max(breach_abs_ub_k, guarded_breach_rel_ub_k), 3.0)`
- if `k` is a non-numeric declared/reportable basis field:
  - `field_pressure_lb_k = 1.0 * basis_change_lb_k`
  - `field_pressure_ub_k = 1.0 * basis_change_ub_k`
- if `k` is non-numeric and not a declared/reportable basis field:
  - `field_pressure_lb_k = 0.5 * explanation_change_lb_k`
  - `field_pressure_ub_k = 0.5 * explanation_change_ub_k`

The guarded relative path prevents tiny absolute differences around zero from being overstated purely
because a relative denominator is small.

Aggregate drift pressure:

- `p = pressure_power`
- `Σw_drift = Σ(weight_k)` across valid affected fields with `weight_k > 0`
- `drift_pressure_lb = 0 if Σw_drift = 0 else (Σ(weight_k * field_pressure_lb_k^p) / Σw_drift)^(1/p)`
- `drift_pressure_ub = 0 if Σw_drift = 0 else (Σ(weight_k * field_pressure_ub_k^p) / Σw_drift)^(1/p)`

This weighted power mean preserves monotonicity while making narrow critical spikes harder to hide
behind many subthreshold deltas than under a simple arithmetic mean.

Tax delta metrics:

- `tax_delta_abs_obs = abs(amended_tax_liability - baseline_tax_liability)`
- `tax_missing_bound >= 0` = proved worst-case additional tax-bearing change from missing or
  unresolved decisive history; `INF` MAY be used only when no safe finite bound exists
- `tax_delta_abs_lb = tax_delta_abs_obs`
- `tax_delta_abs_ub = INF` if `tax_missing_bound = INF` else `tax_delta_abs_obs + tax_missing_bound`
- `tax_delta_rel_lb = 0 if tax_delta_abs_lb = 0 else tax_delta_abs_lb / max(abs(baseline_tax_liability), abs(amended_tax_liability), minimum_rel_floor)`
- `tax_delta_rel_ub = 0 if tax_delta_abs_ub = 0 else INF if tax_delta_abs_ub = INF else tax_delta_abs_ub / max(abs(baseline_tax_liability), abs(amended_tax_liability), minimum_rel_floor)`
- `tax_rel_activation_floor = minimum_rel_floor` if `abs_tax_delta_threshold = 0`, else `min(abs_tax_delta_threshold, minimum_rel_floor)`

Set persisted tax deltas as the proved lower-bound values:

- `tax_delta_abs = tax_delta_abs_lb`
- `tax_delta_rel = tax_delta_rel_lb`

`tax_delta_abs` and any money-bearing `field_deltas[].field_delta_abs` SHALL be emitted as canonical
decimal strings under the frozen `money_profile`, not as binary floating-point JSON numbers. Those
persisted values SHALL keep exactly `money_profile.scale` fractional digits and SHALL be derived
from the exact-decimal lower-bound arithmetic above before any threshold-classification or hash
surface consumes them.

Pressure- and breach-level flags:

- `I(condition) = 1 if condition is true else 0`
- `tax_abs_material_breach_proved = tax_delta_abs_lb > abs_tax_delta_threshold`
- `tax_abs_material_breach_possible = tax_delta_abs_ub > abs_tax_delta_threshold`
- `tax_rel_material_breach_proved = tax_delta_abs_lb >= tax_rel_activation_floor and tax_delta_rel_lb > rel_tax_delta_threshold`
- `tax_rel_material_breach_possible = (tax_delta_abs_ub = INF) or (tax_delta_abs_ub >= tax_rel_activation_floor and tax_delta_rel_ub > rel_tax_delta_threshold)`
- `has_reportable_numeric_or_basis_change_proved = true` if any numeric field has
  `field_pressure_lb_k > 0`, `tax_delta_abs_lb > 0`, or any declared/reportable basis field has
  `basis_change_lb_k = 1`; otherwise `false`
- `has_reportable_numeric_or_basis_change_possible = true` if
  `has_reportable_numeric_or_basis_change_proved = true`, or any numeric field has
  `field_pressure_ub_k > 0`, or any declared/reportable basis field has `basis_change_ub_k = 1`;
  otherwise `false`

Plane pressures SHALL also be computed so multi-plane drift cannot hide behind one averaged scalar.
For each plane `p in {fact,total,filing,authority,explanation}`:

- let `K_p` be the affected fields assigned to difference class / plane `p`
- `plane_pressure_lb_p = 0` if `K_p = ∅` else `max(field_pressure_lb_k for k in K_p)`
- `plane_pressure_ub_p = 0` if `K_p = ∅` else `max(field_pressure_ub_k for k in K_p)`
- `authority_plane_override = true` when `AUTHORITY_STATE in difference_classes[]` and the selected
  authority baseline disagrees materially with the last engine-known legal baseline for the same exact
  scope

The engine SHALL set persisted plane pressures from the proved lower-bound values:

- `plane_pressures.fact = plane_pressure_lb_fact`
- `plane_pressures.total = plane_pressure_lb_total`
- `plane_pressures.filing = plane_pressure_lb_filing`
- `plane_pressures.authority = 3.0` when `authority_plane_override = true`, else `plane_pressure_lb_authority`
- `plane_pressures.explanation = plane_pressure_lb_explanation`

Define legal/escalation penalties:

- `I(condition) = 1 if condition is true else 0`
- `late_data_retroactive_touch = true` when any late-data item with temporal class in
  `{PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL, POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT, AUTHORITY_POSTING_LAG}` touches a tax-bearing, filing-critical, authority-critical, or replay-boundary field
- `retroactive_restatement_signal = true` when `RetroactiveImpactAnalysis.replay_requirement in {RESTATE_PRIOR_POSITION, REOPEN_CHAIN_REPLAY}`
- `temporal_ambiguity_signal = true` when any decisive field has `temporal_class_k = TEMPORALLY_UNPROVED`
- `baseline_uncertainty_signal = true` when `baseline_anchor_weight < 1`
- `penalty_pressure_proved = authority_divergence_penalty * I(authority_significant_divergence) + evidence_weakness_penalty * I(material_basis_limitations) + override_dependency_penalty * I(active_override_dependency) + late_data_retroactive_penalty * I(late_data_retroactive_touch) + retroactive_restatement_penalty * I(retroactive_restatement_signal)`
- `penalty_pressure_possible = penalty_pressure_proved + baseline_uncertainty_penalty * I(baseline_uncertainty_signal) + temporal_ambiguity_penalty * I(temporal_ambiguity_signal)`

Then:

- `critical_plane_floor_proved = max(plane_pressures.total, plane_pressures.filing, plane_pressures.authority)`
- `critical_plane_floor_possible = max(plane_pressure_ub_total, plane_pressure_ub_filing, 3.0 if authority_plane_override = true else plane_pressure_ub_authority)`
- `drift_pressure = max(drift_pressure_lb, critical_plane_floor_proved)`
- `amendment_pressure = max(drift_pressure + penalty_pressure_proved, critical_plane_floor_proved)`
- `review_pressure_breach_proved = amendment_pressure > review_only_threshold`
- `review_pressure_breach_possible = max(drift_pressure_ub + penalty_pressure_possible, critical_plane_floor_possible) > review_only_threshold`
- `amendment_pressure_breach_proved = amendment_pressure > amendment_required_threshold`
- `amendment_pressure_breach_possible = max(drift_pressure_ub + penalty_pressure_possible, critical_plane_floor_possible) > amendment_required_threshold`

`materiality_class` derivation SHALL consult both proved lower bounds and possible upper bounds.
Missing history may widen uncertainty upward, but it SHALL NOT erase already-proved pressure
downward.

### Materiality classes

Set `materiality_class` in the following precedence order:

- `AMENDMENT_REQUIRED`
  if any of the following is true:
  - `tax_abs_material_breach_proved`
  - `tax_rel_material_breach_proved`
  - `amendment_pressure_breach_proved`
  - any filing-critical or declaration-critical field has `field_pressure_lb_k >= 1.0`
  - any filing-critical or declaration-critical non-numeric basis field has `basis_change_lb_k = 1`
  - `critical_plane_floor_proved >= 1.0`
  - authority-significant divergence from the selected legal baseline exists
- `MATERIAL_REVIEW`
  if `AMENDMENT_REQUIRED` did not match and any of the following is true:
  - `tax_abs_material_breach_possible`
  - `tax_rel_material_breach_possible`
  - `review_pressure_breach_proved`
  - `review_pressure_breach_possible`
  - any filing-critical, declaration-critical, or authority-critical field has
    `field_pressure_ub_k >= 1.0`
  - any filing-critical or declaration-critical non-numeric basis field has `basis_change_ub_k = 1`
  - `critical_plane_floor_possible >= 1.0`
  - `retroactive_restatement_signal = true`
  - `temporal_ambiguity_signal = true`
  - `baseline_uncertainty_signal = true` and (`FILING_STATE in difference_classes[]` or
    `AUTHORITY_STATE in difference_classes[]` or
    `has_reportable_numeric_or_basis_change_possible = true`)
  - material basis limitations reduce amendment certainty on a decisive field
- `BENIGN_DRIFT`
  if neither higher class matched and `has_reportable_numeric_or_basis_change_possible = true` but all
  of the following are true:
  - `tax_abs_material_breach_possible = false`
  - `tax_rel_material_breach_possible = false`
  - `review_pressure_breach_possible = false`
  - every filing-critical, declaration-critical, and authority-critical field has
    `field_pressure_ub_k < 1.0`
  - every filing-critical or declaration-critical non-numeric basis field has `basis_change_ub_k = 0`
  - `critical_plane_floor_possible < 1.0`
  - `retroactive_restatement_signal = false`
  - `temporal_ambiguity_signal = false`
  - `baseline_uncertainty_signal = false`
- `EXPLANATION_ONLY`
  if `has_reportable_numeric_or_basis_change_possible = false` and provenance, lineage, or support
  quality changed
- `NO_CHANGE`
  otherwise

A legally significant change SHALL therefore be classified from the proved lower bound; a possibly
significant change under incomplete history SHALL remain at least `MATERIAL_REVIEW` until bounded
away by the frozen evidence and temporal basis.

### Lifecycle projection rule

`DriftRecord.lifecycle_state` SHALL project from `materiality_class` as follows:

- `NO_CHANGE -> NO_CHANGE`
- `EXPLANATION_ONLY -> EXPLANATION_ONLY`
- `BENIGN_DRIFT -> BENIGN_DRIFT`
- `MATERIAL_REVIEW -> MATERIAL_REVIEW`
- `AMENDMENT_REQUIRED -> AMENDMENT_REQUIRED`

`REVIEW_REQUIRED` remains a workflow escalation entered after `MATERIAL_REVIEW`; it is not a sixth
materiality class.

While `lifecycle_state = NOT_ASSESSED`, the record SHALL keep `tax_delta_abs = 0`, `tax_delta_rel = 0`,
`drift_pressure = 0`, `amendment_pressure = 0`, and `critical_field_delta_count = 0`.
`critical_field_delta_count` SHALL always equal the count of `field_deltas[]` entries with
`critical = true`.
`REVIEW_REQUIRED` SHALL keep `review_state = REVIEW_OPEN`; `RESOLVED` and `SUPERSEDED` SHALL NOT retain
an open review posture.

### Recommendation and automation rule

`materiality_class` answers how significant the drift is.
`amendment_recommendation` answers what the engine may responsibly suggest or execute next.
These SHALL NOT be collapsed into one field.

Recommended `amendment_recommendation` values:

- `NO_ACTION`
- `EXPLAIN_ONLY`
- `REVIEW_ONLY`
- `RECONCILE_FIRST`
- `PREPARE_AMENDMENT`
- `SUBMIT_AMENDMENT`

Derivation rules:

- `NO_CHANGE -> NO_ACTION`
- `EXPLANATION_ONLY -> EXPLAIN_ONLY`
- unresolved out-of-band baseline truth, unresolved authority ambiguity, temporally unproved decisive
  late-data impact, or missing baseline/window proof -> `RECONCILE_FIRST`
- `BENIGN_DRIFT` or `MATERIAL_REVIEW` without a satisfied amendment path -> `REVIEW_ONLY`
- `AMENDMENT_REQUIRED` with proven baseline and open window but incomplete intent/confirmation flow ->
  `PREPARE_AMENDMENT`
- `SUBMIT_AMENDMENT` only when `AMENDMENT_REQUIRED`, amendment eligibility is proved, the authority
  protocol is ready, and no blocking basis limitation remains

Retention limitation, evidence weakness, baseline uncertainty, or temporal ambiguity MAY cap
automation or recommendation, but they SHALL NOT lower `materiality_class` once a reportable numeric
change, declared-basis change, or authority-significant divergence has already been established.
Those limitations SHALL instead appear in `recommendation_cap`, `automation_cap`, and
`basis_limitations[]`. When the cap originates from baseline selection, the same ceiling SHALL be
mirrored through `selection_contract{...}` and `amendment_eligibility_contract{baseline_progression_ceiling_or_null, baseline_limitation_reason_codes[]}`.

## 10.7A Amendment trigger vs amendment eligibility

The engine SHALL distinguish between:

- **amendment trigger**: a change significant enough to open amendment-or-review workflow, and
- **amendment eligibility**: a change that may legally and operationally proceed into amendment flow now

A run SHALL open amendment-aware workflow when any of the following is true:

- `materiality_class = AMENDMENT_REQUIRED`
- `materiality_class = MATERIAL_REVIEW` and any of the following is true:
  - `tax_abs_material_breach_possible`
  - `tax_rel_material_breach_possible`
  - `critical_plane_floor_possible >= 1.0`
  - any decisive field has `temporal_class_k = TEMPORALLY_UNPROVED`
- `FILING_STATE in difference_classes[]` and the would-submit payload differs from the active legal baseline
- `AUTHORITY_STATE in difference_classes[]` and the authority-of-record posture diverges materially from
  the engine-known legal baseline
- `RetroactiveImpactAnalysis.restatement_required = true`

A triggered case MAY still be not eligible because the amendment window is closed, the baseline is
out-of-band and unreconciled, readiness freshness is stale, or authority prerequisites are unproved.
In that branch the engine SHALL preserve the trigger, create or update `AmendmentCase`, and emit
review/reconciliation workflow. It SHALL NOT silently downgrade the situation to benign drift merely
because live amendment cannot proceed now.
`DriftRecord` and `AmendmentCase` SHALL therefore retain one explicit
`amendment_eligibility_contract` carrying `trigger_state`, `eligibility_state`,
`readiness_reuse_state`, the frozen baseline/retroactive/window hashes in force, and the reason
codes explaining trigger, eligibility, and any invalidation.

## 10.8 Amendment eligibility rules

The engine SHALL determine amendment eligibility through an explicit gate, but the semantics layer
SHALL define the prerequisites.

Eligibility SHALL be anchored by a frozen `AmendmentWindowContext` carrying at minimum:

- `window_anchor_basis`
- `scope_refs[]`
- `statutory_filing_deadline`
- `final_declaration_confirmed_at`
- `window_opens_at`
- `window_closes_at`
- `provider_profile_ref`
- `authority_basis_ref`
- `evaluated_at`

The engine SHALL derive this context from authority-recognised final-declaration truth for the exact
baseline scope being considered.
If the anchor basis, final-declaration timing, or effective close time cannot be proved, amendment
eligibility SHALL NOT pass.
Later authority correction or amended baselines SHALL NOT silently reopen or extend the amendment
window unless the authority/provider contract explicitly says they do.
`eligible_scope_refs[]` and `blocked_scope_refs[]` SHALL stay exact-scope, disjoint, and
classification-complete for proved open/closed contexts. `window_opens_at`, `window_closes_at`,
`evaluated_at`, and `stale_after_at` SHALL remain forward-only, and a context SHALL NOT remain
`OPEN` after its close timestamp.

An amendment may be considered only if all of the following are true:

1. `execution_mode = COMPLIANCE`;
2. authorized `runtime_scope[]` includes `amendment_intent` or `amendment_submit`;
3. a final declaration was completed through software;
4. the baseline can be verified from authority-recognised status;
5. the amendment window remains open;
6. the current scope is amendable;
7. out-of-band ambiguity has been reconciled enough to establish a legal baseline;
8. the new data set has a sealed manifest and valid trust/review posture for amendment preparation.

Analysis-mode or counterfactual runs MAY model amendment consequences, but they SHALL NOT be treated
as legally eligible amendment runs and SHALL NOT progress into live authority amendment flow.
`amendment_eligibility_contract.trigger_state` SHALL stay `TRIGGERED` whenever amendment-aware
workflow was opened, even if `eligibility_state` ends up `WINDOW_CLOSED`, `RECONCILE_FIRST`,
`REVIEW_ONLY`, or `UNPROVEN`.
Any filing-capable amendment artifact (`AmendmentCase`, `AmendmentBundle`, filing packet lineage,
submission lineage) SHALL therefore retain `execution_mode_boundary_contract` with
`execution_posture = LIVE_COMPLIANCE` and `legal_effect_boundary = COMPLIANCE_CAPABLE`. Read-only
evaluation artifacts such as `AmendmentEligibilityContract`, `AmendmentWindowContext`, and
`RetroactiveImpactAnalysis` SHALL also retain the same contract so replay or counterfactual analysis
cannot be mistaken for live amendment authority posture later in the chain.

HMRC's year-end guide says amendment is available only after final declaration through software, within
12 months from the statutory filing date, and the software may check final declaration timing using
the Individual Calculations list path. [9]

## 10.9 Amendment protocol semantics

Where amendment is eligible, the engine SHALL model amendment as a staged authority protocol, not as a
direct overwrite.

### Required sequence

1. establish confirmed filed baseline
2. collect amended figures through the relevant income/update APIs
3. perform intent-to-amend calculation
4. retrieve amended calculation
5. display amended liability/result to the user
6. obtain user/agent confirmation
7. submit confirm-amendment final declaration
8. reconcile authority acknowledgement
9. promote new amended baseline only after authority confirmation

If the intent-to-amend validation step does not pass, the run SHALL preserve the `INTENT_SUBMITTED`
state and its calculation refs on a persisted `AmendmentCase`, together with the full amendment
readiness context as an `AuthorityCalculationReadinessContext` (`validation_outcome`,
`reason_codes[]`, calculation request/id/basis refs, and any user-confirmation ref already produced).

In that branch:

- the run SHALL emit `AMENDMENT_GATE`, not terminate directly from raw `validation_outcome`
- the failure SHALL never be routed through `FILING_GATE`
- the terminal outcome, if any, SHALL be the modeled output of `AMENDMENT_GATE`
- where the run begins inside `amendment_intent`, a preparatory `AMENDMENT_GATE` MAY precede the
  authority call, but the decisive post-validation `AMENDMENT_GATE` governs continuation or
  blocked/review-required terminalization

This keeps amendment readiness failure explicit, auditable, and lineage-safe rather than collapsing it
into an assertion-style failure.

### Freshness and reuse of amendment readiness

A persisted intent-to-amend result, calculation basis, and user confirmation MAY be reused only while
all of the following remain true:

- the exact-scope `DriftBaselineEnvelope.frozen_hash` is unchanged
- no new affected `difference_classes[]` have appeared
- `RetroactiveImpactAnalysis` did not widen impacted scope or add prior filed positions requiring replay
- no new late-data indicator touches a filing-critical field already shown to the user
- the applicable authority operation profile and amendment-window context are unchanged

If any predicate fails, the engine SHALL set `AmendmentCase.freshness_state = STALE`, emit
`AmendmentFreshnessInvalidated`, and cap progression at review or re-intent posture until a fresh
intent-to-amend basis is obtained. `READY_TO_AMEND` is therefore contingent, not permanent.
`READY_TO_AMEND` SHALL therefore retain a fresh readiness context, the intent-to-amend calculation
refs and hash, the exact `DriftBaselineEnvelope.frozen_hash`, `RetroactiveImpactAnalysis.analysis_hash`,
`AmendmentWindowContext.evaluation_hash`, the applicable authority operation profile ref, a confirmed
basis and user confirmation, and a non-blocking validation outcome (`PASS` or `PASS_WITH_NOTICE`).
`STALE` cases SHALL retain the same frozen-input hashes together with explicit
`freshness_invalidation_reason_codes[]`; those reasons SHALL be empty in `NOT_APPLICABLE` or `FRESH`
posture. `INTENT_SUBMITTED` SHALL retain the intent-to-amend calculation lineage and validation
outcome even when the result is review-blocked rather than ready.
`AmendmentCase.amendment_eligibility_contract` SHALL mirror that same posture: `READY_TO_AMEND`
requires `eligibility_state = ELIGIBLE_NOW` plus `readiness_reuse_state = FRESH`, while stale or
window-closed cases SHALL not continue to publish `ELIGIBLE_NOW`.

### Amendment bundle semantics

Before confirm-amendment submission the engine SHALL freeze an `AmendmentBundle` containing at minimum:

- exact `DriftBaselineEnvelope` ref
- exact `DriftBaselineEnvelope.frozen_hash`
- current `DriftRecord` ref
- current `RetroactiveImpactAnalysis` ref
- current `RetroactiveImpactAnalysis.analysis_hash`
- current `AmendmentWindowContext` ref
- current `AmendmentWindowContext.evaluation_hash`
- authority calculation basis ref
- authority calculation basis hash
- user confirmation ref
- packet or payload hash for the confirm-amendment submission
- affected scope refs and authority operation profile ref
- a deterministic `bundle_identity_hash` over the frozen authority-facing input set

`AmendmentBundle` is the reviewable authority-facing package. It SHALL be immutable once prepared.
If any input changes after bundle preparation, the bundle SHALL be superseded and a new bundle SHALL
be prepared; the engine SHALL NOT mutate the original bundle in place.
Prepared, frozen, submitted, and confirmed bundles SHALL retain the current retroactive-impact ref
and hash, window-context ref and hash, baseline-envelope ref and frozen hash, calculation-basis ref
and hash, user-confirmation ref, authority-operation-profile ref, payload hash, and
`bundle_identity_hash`; submitted and confirmed bundles SHALL additionally retain the transmitted
`packet_ref`, while prepared or frozen bundles SHALL keep `packet_ref = null`. `superseded_at`
SHALL remain exclusive to `bundle_state = SUPERSEDED`.

HMRC's published post-finalisation flow follows this pattern: amended figures are sent through the
relevant APIs, software triggers a new tax calculation with `calculationType = intent-to-amend`,
retrieves the calculation, shows it to the user, and then submits final declaration with
`calculationType = confirm-amendment`. [4]

## 10.10 Final-declaration baseline semantics

The engine SHALL treat the filed baseline as the agreed calculation + declared submission, not merely
the latest internal numbers.

In the HMRC final-declaration flow, software triggers a final-declaration tax calculation, retrieves
it using the returned calculation ID, shows the result to the user, and the user then agrees the
declaration before software submits the final declaration referencing that calculation. The filed
baseline should therefore preserve:

- calculation type,
- calculation ID,
- calculation output hash,
- declaration agreement reference,
- submission record reference. [4]

## 10.11 Out-of-band and unresolved-authority semantics

If authority state exists but the engine cannot prove that the baseline came from its own packet
chain, the engine SHALL not auto-recommend amendment directly.

Instead it SHALL:

- classify baseline as `OUT_OF_BAND`
- freeze `baseline_submission_state = OUT_OF_BAND_UNRECONCILED` for trust and filing-capable posture
- create `DriftRecord` against that out-of-band baseline if possible
- cap live progression at review/not-ready posture
- require reconciliation before amendment progression

If the out-of-band discovery applies to only a subset of partitions or obligations, the engine SHALL
create a scope-sliced external baseline and SHALL NOT taint unrelated partitions with the same
out-of-band posture.

This prevents the engine from amending against a guessed or internally assumed legal baseline.

## 10.12 Retention-limited history semantics

If some historical evidence has expired or been erased under policy, the engine SHALL still compare
what remains but SHALL attach `basis_limitations[]` to the drift result.

### Rules

- retention limitation does not erase drift history
- for every decisive numeric or basis field affected by retained-history gaps, the engine SHALL compute
  a bounded `missing_abs_bound_k`; if no finite safe bound can be proved, it SHALL treat the relevant
  upper-bound pressure as `INF`
- `BENIGN_DRIFT` is permitted only when every decisive upper-bound pressure remains below review
  thresholds despite the limitation
- retention limitation may cap recommendation/automation to review or reconciliation, but SHALL NOT
  rewrite already-established materiality into a lower `materiality_class`
- explanation paths must state where historical support is no longer present
- the engine must never silently treat expired history as zero

## 10.12A Retroactive impact and bounded replay

Every post-finalisation drift evaluation SHALL also persist `RetroactiveImpactAnalysis`.

`RetroactiveImpactAnalysis` SHALL determine whether the detected change is:

- `NONE`
- `CURRENT_SCOPE_ONLY`
- `RESTATE_PRIOR_POSITION`
- `REOPEN_CHAIN_REPLAY`
- `AUTHORITY_RECONCILIATION_REQUIRED`

At minimum it SHALL identify:

- `impacted_scope_refs[]`
- `impacted_submission_refs[]`
- `earliest_affected_effective_at`
- `late_data_interaction_class`
- whether restatement or replay is required
- reason codes explaining the widening logic
- `analysis_hash`

Rules:

- `PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL`, `POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT`, and
  `AUTHORITY_POSTING_LAG` touching a decisive filed/amended field SHALL be presumed backward-looking
  until bounded otherwise; `TRUE_POST_BASELINE_DRIFT` MAY remain current-scope-only unless cumulative
  basis or replay dependency is proved
- late evidence affecting a previously filed or amended position SHALL never mutate that historical
  position in place
- if prior legal positions are affected, the engine SHALL open a continuation or replay path rooted in
  the impacted exact scope and SHALL preserve the old filed/amended state as historical truth
- retroactive widening SHALL stop at the earliest impacted proved legal baseline; it SHALL NOT keep
  walking backward past that boundary without a newly persisted analysis artifact proving why
- if contradictory drift sources disagree on which prior position is affected, the analysis SHALL set
  `late_data_interaction_class = AUTHORITY_RECONCILIATION_REQUIRED` or equivalent review posture and
  SHALL block straight-through amendment progression
- `restatement_scope_refs[]` SHALL stay within `impacted_scope_refs[]`
- `earliest_affected_effective_at` and `latest_affected_effective_at` SHALL remain forward-only
- `CURRENT_SCOPE_ONLY` SHALL NOT retain prior `impacted_submission_refs[]`
- contradiction-driven or authority-reconciliation retroactivity SHALL force replay/reconciliation
  posture instead of silent current-scope reuse
- any non-`NONE` retroactivity class SHALL retain at least one explicit `impacted_scope_refs[]`
- `analysis_hash` SHALL change whenever impacted scope, replay requirement, or widening reasons change

This makes late-data replay bounded, replay-safe, and audit-visible.

## 10.13 Quarterly-obligation semantics for drift

Because quarterly updates are periodic/cumulative obligation events rather than final declarations, the
engine SHALL treat later corrections differently before year-end.

### Quarterly rule

If an earlier quarterly update is later found to be wrong:

- the engine SHALL not model that as a post-finalisation amendment;
- it SHALL model it as a correction carried into the next quarterly update or year-end state;
- and it SHALL preserve the correction lineage so that later finalisation can explain why the earlier quarter view changed.

Each self-employment, property business, or other separately reported obligation partition SHALL keep
its own quarterly correction lineage and working baseline.
The engine SHALL NOT flatten multi-partition quarterly corrections into one synthetic global baseline
if only a subset of partitions changed.

This follows HMRC guidance that corrections can be included in the next quarterly update and the
original quarterly update does not need to be resent. [8]

### Provider-profile note

Because HMRC has also published a roadmap item changing how periodic obligations are marked as met,
from tax calculation request to cumulative update submission, the engine should freeze a
`quarterly_basis_profile` in the provider contract rather than assuming one permanent rule. [10]

Amendment-intent and amendment-submit flows SHALL still compute against a year-end reporting basis.
They change amendment posture and workflow legality, not the underlying reporting-scope token used
for adjustment inclusion.

## 10.14 Authority-correction semantics

Where the authority later alters the effective filed position, the engine SHALL generate a drift event
even if the user did not submit new figures.

Recommended behavior:

- create `DriftRecord.cause_codes += AUTHORITY_CORRECTION`
- mark baseline as `AUTHORITY_CORRECTED`
- route to review
- rebuild parity and trust relative to the new authority baseline

If the authority correction affects only a subset of obligation or partition scope, the engine SHALL
create a scope-specific authority-corrected baseline envelope and SHALL preserve the superseded
baseline refs for the unaffected partitions.
Authority correction SHALL carry explicit basis refs to the observed authority artifact; it SHALL NOT
be promoted from narrative operator notes alone.

Any authority correction, amended baseline discovery, or out-of-band baseline reconciliation that
changes the effective comparison anchor SHALL also invalidate the current filing trust/parity
lineage. The engine SHALL mark dependent filing posture as recalculation-required, persist explicit
trust-invalidation reason codes and timestamps, and prevent packet approval or submission reuse until
a new trust summary has been synthesized against the corrected baseline. A previously
`READY_TO_SUBMIT` filing case SHALL therefore fall back to review posture rather than remaining
implicitly ready on stale authority assumptions.

This is forward-compatible with HMRC's roadmap item for software visibility of HMRC corrections. [7]

## 10.14A Deterministic supersession and concurrent continuation handling

The engine SHALL preserve history through supersession rather than overwrite.

Rules:

- at most one non-superseded `DriftRecord` may remain active for one `active_exact_scope_key`
- at most one non-superseded `AmendmentCase` may remain the active chain head for one exact scope
- creating a later same-scope amendment case SHALL set `supersedes_amendment_case_id` on the new case
  and `superseded_at` on the prior active case
- authority-confirmed historical cases SHALL remain queryable even after later same-scope supersession
- if an authority-accepted state is later internally superseded, the engine SHALL emit
  `AuthorityAcceptedStateInternallySuperseded` rather than pretend the earlier authority acceptance never happened
- concurrent continuation paths for different exact scopes MAY coexist, but same-scope concurrent active
  chains SHALL resolve through deterministic supersession, not silent last-write-wins mutation

## 10.14B Operator review and escalation semantics

The engine SHALL persist operator-visible review posture on both `DriftRecord` and `AmendmentCase`.
At minimum the system SHALL distinguish:

- `review_state in {NONE, REVIEW_OPEN, REVIEW_RESOLVED}`
- `escalation_state in {NONE, OPERATOR_REVIEW, COMPLIANCE_ESCALATION, AUTHORITY_RECONCILIATION}`

Escalation SHALL be mandatory when any of the following is true:

- contradictory evidence produces incompatible `difference_classes[]` or incompatible exact-scope impact
- retroactive impact widens into prior filed positions but the correct replay boundary is not provable
- authority-of-record accepts one amendment while a newer internal same-scope case has already superseded it
- retained history is insufficient to prove whether a late-data item changes only explanation or also filing state

Escalation SHALL freeze the current reasoning artifacts and SHALL NOT permit silent recomputation to
replace the reviewable state.

## 10.15 Audit invariants

The drift/amendment lifecycle SHALL emit the applicable event families for the path actually taken.
At minimum:

- `BaselineSelected`
- `AmendmentWindowEvaluated`
- `DriftDetected`
- `DriftClassified`
- `DriftRetroactiveImpactAnalyzed`
- `DriftSuperseded` when a newer exact-scope drift replaces the active one
- `AmendmentEligibilityEvaluated` when amendment eligibility is evaluated
- `AmendmentFreshnessInvalidated` when a previously reusable readiness context becomes stale
- `IntentToAmendTriggered` when the intent-to-amend authority path is started
- `IntentToAmendValidated` when authority validations pass
- `AmendmentBundlePrepared` when the authority-facing amendment package is frozen
- `AmendmentSubmitted` when confirm-amendment is transmitted
- `AmendmentConfirmed` when the authority confirms the amendment
- `AuthorityAcceptedStateInternallySuperseded` when an authority-accepted amendment is later superseded by a newer internal same-scope chain
- `AuthorityCorrectionObserved` when authority-originated correction is detected
- `DriftReviewEscalated` when contradictory, retroactive, or authority-divergent drift requires operator escalation

Every event SHALL carry:

- `baseline_manifest_id`
- `comparison_manifest_id`
- `drift_id`
- `baseline_ref`
- `baseline_scope_refs[]`
- `submission_record_ref`
- `materiality_profile_ref`
- `amendment_window_context_ref`
- `baseline_envelope_ref`
- `retroactive_impact_ref`
- `basis_limitations[]`

## 10.15A Historical replay of amendment and drift decisions

Exact replay of a manifest that previously evaluated amendment eligibility, baseline selection,
drift classification, or authority correction SHALL bind to the original baseline envelope,
materiality profile, amendment-window context, authority-state basis, and late-data monitor basis
recorded by that source manifest.

Replay SHALL therefore distinguish three cases:

- `STANDARD_REPLAY` / `AUDIT_REPLAY`: reuse the historical baseline selection and compare against the
  same historically frozen authority and intake basis
- `COUNTERFACTUAL_ANALYSIS`: declare which baseline/config/input dimension changed and surface the
  difference as expected or limited rather than as an exact mismatch
- fresh continuation child after new facts, correction notices, or drift discoveries: allocate a new
  manifest lineage node instead of mutating or reinterpreting the old one

Later authority corrections, newly discovered quarterly data, or superseding materiality profiles
SHALL create a new continuation child. They SHALL NOT be smuggled into an exact replay of the earlier
manifest, even when the newly derived result now looks more correct.

## 10.15B Defensible filing graph recalculation semantics

Amendment and drift handling SHALL recalculate filing-proof posture, not only numeric deltas.

Whenever amendment evaluation, authority correction, or drift classification changes a decisive fact,
total, filing field, or legal-state basis, the engine SHALL:

- rebuild the affected target assessments;
- supersede or stale any controlling proof bundle that touched the old decisive segment;
- rebuild enquiry-pack and explanation render posture for affected filing-capable targets; and
- prevent the previous graph slice from remaining current filing truth.

A drift result that changes materiality or authority basis without triggering proof-bundle
recalculation SHALL be treated as incomplete.

## 10.16 One-sentence summary

The amendment and drift layer ensures that the engine never confuses pre-finalisation correction,
post-finalisation amendment, authority correction, and explanation-only change: it always chooses the
right baseline, classifies the delta, checks legal eligibility, and only promotes a new filed truth
after authority-confirmed amendment flow.

[1]: https://developer.service.hmrc.gov.uk/api-documentation/docs/authorisation/user-restricted-endpoints
[2]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html?utm_source=chatgpt.com
[5]: https://developer.service.hmrc.gov.uk/guides/fraud-prevention?utm_source=chatgpt.com
[6]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/tax-calculations.html?utm_source=chatgpt.com
[7]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/apis.html?utm_source=chatgpt.com
[8]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
[9]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html
[10]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/apis.html
