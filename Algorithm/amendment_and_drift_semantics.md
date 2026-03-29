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

A reconciled baseline derived from authority-of-record changes not initiated by the current packet
chain.

### 5. External/out-of-band baseline

A baseline inferred from authority state when filing occurred outside the current engine lineage.

All drift calculations SHALL compare against the highest-precedence available baseline in that order:
`Authority-corrected` or `Amended` > `Filed` > `External/out-of-band` > `Working`.

## 10.3 Drift object model

A `DriftRecord` SHALL include at minimum:

- `drift_id`
- `baseline_manifest_id`
- `comparison_manifest_id`
- `baseline_type`
- `drift_scope`
- `field_deltas[]`
- `tax_delta_abs`
- `tax_delta_rel`
- `critical_field_delta_count`
- `cause_codes[]`
- `materiality_class`
- `amendment_recommendation`
- `basis_limitations[]`

### Drift scopes

- `RECORD_LAYER`
- `ADJUSTMENT_LAYER`
- `AUTHORITY_LAYER`
- `DECLARATION_LAYER`
- `EXPLANATION_LAYER`
- `RETENTION_LIMITED_LAYER`

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

- new evidence does not rewrite the filed baseline;
- instead, it is compared against the filed baseline;
- a `DriftRecord` is created;
- and the engine decides whether the outcome is explanation-only, review-only, or amendment-worthy.

This mirrors HMRC's post-finalisation model, where amendment is a distinct process after
software-completed final declaration rather than just another in-year correction. [9]

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
- `authority_divergence_penalty`
- `evidence_weakness_penalty`
- `override_dependency_penalty`
- `auto_amend_allowed`
- `review_only_threshold`
- `amendment_required_threshold`

The frozen profile SHALL satisfy:

- `abs_tax_delta_threshold >= 0`
- `rel_tax_delta_threshold >= 0`
- `critical_field_weight > 0`
- `noncritical_field_weight > 0`
- `field_abs_delta_threshold_default >= 0`
- `field_rel_delta_threshold_default >= 0`
- `minimum_rel_floor > 0`
- `authority_divergence_penalty >= 0`
- `evidence_weakness_penalty >= 0`
- `override_dependency_penalty >= 0`
- `0 <= review_only_threshold < amendment_required_threshold`

### Derived metrics

For each affected field `k`:

- `weight_k = critical_field_weight` when `k` is filing/declaration-critical; otherwise `noncritical_field_weight`
- `field_abs_threshold_k =` the field-specific absolute threshold from the frozen profile, or `field_abs_delta_threshold_default` if no override exists
- `field_rel_threshold_k =` the field-specific relative threshold from the frozen profile, or `field_rel_delta_threshold_default` if no override exists
- `field_delta_abs_k = abs(new_value_k - baseline_value_k)`
- `field_rel_floor_k =` the field-specific relative floor from the frozen profile, or `minimum_rel_floor` if no override exists
- `field_delta_rel_k = 0 if field_delta_abs_k = 0 else field_delta_abs_k / max(abs(baseline_value_k), abs(new_value_k), field_rel_floor_k)`
- `breach_abs_k = 0 if field_abs_threshold_k = 0 and field_delta_abs_k = 0 else INF if field_abs_threshold_k = 0 else field_delta_abs_k / field_abs_threshold_k`
- `breach_rel_k = 0 if field_rel_threshold_k = 0 and field_delta_rel_k = 0 else INF if field_rel_threshold_k = 0 else field_delta_rel_k / field_rel_threshold_k`
- `breach_ratio_k = max(breach_abs_k, breach_rel_k)`

Aggregate drift pressure:

`Σw_drift = Σ(weight_k)` across valid affected fields with `weight_k > 0`

`drift_pressure = 0 if Σw_drift = 0 else Σ(weight_k * min(breach_ratio_k, 3.0)) / Σw_drift`

Tax delta metrics:

- `tax_delta_abs = abs(amended_tax_liability - baseline_tax_liability)`
- `tax_delta_rel = 0 if tax_delta_abs = 0 else tax_delta_abs / max(abs(baseline_tax_liability), abs(amended_tax_liability), minimum_rel_floor)`

Penalty-adjusted amendment pressure:

- `I(condition) = 1 if condition is true else 0`
- `penalty_pressure = authority_divergence_penalty * I(authority_significant_divergence) + evidence_weakness_penalty * I(material_basis_limitations) + override_dependency_penalty * I(active_override_dependency)`
- `amendment_pressure = drift_pressure + penalty_pressure`
- `tax_abs_material_breach = tax_delta_abs > abs_tax_delta_threshold`
- `tax_rel_material_breach = tax_delta_rel > rel_tax_delta_threshold`
- `review_pressure_breach = amendment_pressure > review_only_threshold`
- `amendment_pressure_breach = amendment_pressure > amendment_required_threshold`
- `has_reportable_numeric_or_basis_change = true` if any numeric field changed, `tax_delta_abs > 0`, or any declared/reportable basis changed; otherwise `false`

Strict `>` threshold comparisons preserve a true no-change fixed point even when a frozen policy
intentionally sets one or more thresholds to `0`.

This formulation keeps field-level materiality, tax-level materiality, and governance penalties on a single monotone pressure scale and removes the prior undefined `breach_ratio_k` / zero-denominator cases.

### Materiality classes

Set `materiality_class` in the following precedence order:

- `AMENDMENT_REQUIRED`
  if any of the following is true:
  - `tax_abs_material_breach`
  - `tax_rel_material_breach`
  - `amendment_pressure_breach`
  - a critical declared basis field changed beyond threshold
  - authority-significant divergence from the filed baseline exists
- `MATERIAL_REVIEW`
  if `AMENDMENT_REQUIRED` did not match and any of the following is true:
  - `review_pressure_breach`
  - a critical field changed but legal/amendment context still requires review
  - material basis limitations reduce amendment certainty
- `BENIGN_DRIFT`
  if neither higher class matched and `has_reportable_numeric_or_basis_change = true` but:
  - `tax_abs_material_breach = false`
  - `tax_rel_material_breach = false`
  - `review_pressure_breach = false`
  - no critical declared basis field changed beyond threshold
- `EXPLANATION_ONLY`
  if `has_reportable_numeric_or_basis_change = false` and provenance, lineage, or support quality changed
- `NO_CHANGE`
  otherwise

### Lifecycle projection rule

`DriftRecord.lifecycle_state` SHALL project from `materiality_class` as follows:

- `NO_CHANGE -> NO_CHANGE`
- `EXPLANATION_ONLY -> EXPLANATION_ONLY`
- `BENIGN_DRIFT -> BENIGN_DRIFT`
- `MATERIAL_REVIEW -> MATERIAL_REVIEW`
- `AMENDMENT_REQUIRED -> AMENDMENT_REQUIRED`

`REVIEW_REQUIRED` remains a workflow escalation entered after `MATERIAL_REVIEW`; it is not a sixth
materiality class.

## 10.8 Amendment eligibility rules

The engine SHALL determine amendment eligibility through an explicit gate, but the semantics layer
SHALL define the prerequisites.

An amendment may be considered only if all of the following are true:

1. a final declaration was completed through software;
2. the baseline can be verified from authority-recognised status;
3. the amendment window remains open;
4. the current scope is amendable;
5. out-of-band ambiguity has been reconciled enough to establish a legal baseline;
6. the new data set has a sealed manifest and valid trust/review posture for amendment preparation.

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
state and its calculation refs on a persisted amendment artifact and end in a modeled blocked or
review-required outcome, not an assertion-style failure.

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

- classify baseline as `EXTERNAL/OUT_OF_BAND`
- create `DriftRecord` against that external baseline if possible
- cap automation at review-only
- require reconciliation before amendment progression

This prevents the engine from amending against a guessed or internally assumed legal baseline.

## 10.12 Retention-limited history semantics

If some historical evidence has expired or been erased under policy, the engine SHALL still compare
what remains but SHALL attach `basis_limitations[]` to the drift result.

### Rules

- retention limitation does not erase drift history
- retention limitation may downgrade `AMENDMENT_REQUIRED` to `MATERIAL_REVIEW` if baseline certainty is reduced
- explanation paths must state where historical support is no longer present
- the engine must never silently treat expired history as zero

## 10.13 Quarterly-obligation semantics for drift

Because quarterly updates are periodic/cumulative obligation events rather than final declarations, the
engine SHALL treat later corrections differently before year-end.

### Quarterly rule

If an earlier quarterly update is later found to be wrong:

- the engine SHALL not model that as a post-finalisation amendment;
- it SHALL model it as a correction carried into the next quarterly update or year-end state;
- and it SHALL preserve the correction lineage so that later finalisation can explain why the earlier quarter view changed.

This follows HMRC guidance that corrections can be included in the next quarterly update and the
original quarterly update does not need to be resent. [8]

### Provider-profile note

Because HMRC has also published a roadmap item changing how periodic obligations are marked as met,
from tax calculation request to cumulative update submission, the engine should freeze a
`quarterly_basis_profile` in the provider contract rather than assuming one permanent rule. [10]

## 10.14 Authority-correction semantics

Where the authority later alters the effective filed position, the engine SHALL generate a drift event
even if the user did not submit new figures.

Recommended behavior:

- create `DriftRecord.cause_codes += AUTHORITY_CORRECTION`
- mark baseline as `AUTHORITY_CORRECTED`
- route to review
- rebuild parity and trust relative to the new authority baseline

This is forward-compatible with HMRC's roadmap item for software visibility of HMRC corrections. [7]

## 10.15 Audit invariants

Every drift/amendment decision SHALL emit:

- `BaselineSelected`
- `DriftCompared`
- `DriftClassified`
- `AmendmentEligibilityEvaluated`
- `IntentToAmendTriggered`
- `AmendmentCalculationRetrieved`
- `AmendmentConfirmed`
- `AmendmentRejected`
- `AuthorityCorrectionObserved`

Every event SHALL carry:

- `baseline_manifest_id`
- `comparison_manifest_id`
- `drift_id`
- `submission_record_ref`
- `materiality_profile_ref`
- `basis_limitations[]`

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
