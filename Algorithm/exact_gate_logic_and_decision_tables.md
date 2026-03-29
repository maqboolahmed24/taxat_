# Exact Gate Logic and Decision Tables

## Exact gate logic and decision tables

The engine SHALL evaluate decisions through a fixed, ordered gate system. A gate is not a loose
"check"; it is a deterministic decision function with frozen inputs, policy version references,
explicit outputs, reason codes, and remediation routes.

The gate layer exists so that no compliance-capable output is produced by implicit judgment. Every
material progression, from compute to filing to amendment, must pass through a gate chain that can
later be replayed and explained.

In the current HMRC embodiment, the gate chain must accommodate recurring quarterly obligations,
year-end/final-declaration paths, authority-returned obligations, and amendment-after-final-declaration
flows. Quarterly updates are sent every 3 months for each self-employment and property income source,
and HMRC receives category totals rather than individual digital records. The Obligations API supports
quarterly and annual update journeys, and HMRC's year-end guidance requires final declaration before
amendment plus an intent-to-amend step within the amendment window. [1]

## 7.1 Gate result contract

Every non-access gate SHALL return a `GateDecisionRecord` with the following fields:

- `gate_decision_id`
- `gate_code`
- `manifest_id`
- `decision`
- `severity`
- `reason_codes[]`
- `metrics{}`
- `overrideability`
- `required_override_scope`
- `next_action_codes[]`
- `policy_version_ref`
- `decided_at`

### Decision enum

All non-access gates SHALL return one of:

- `PASS`
- `PASS_WITH_NOTICE`
- `MANUAL_REVIEW`
- `OVERRIDABLE_BLOCK`
- `HARD_BLOCK`

### Decision semantics

`PASS`
The gate condition is satisfied. Downstream execution may continue automatically.

`PASS_WITH_NOTICE`
The gate condition is satisfied, but the run must surface explicit notice text and preserve the reason
codes in audit and UI payloads.

`MANUAL_REVIEW`
The gate condition is not sufficient for straight-through automation. The run may continue only into
reviewer-facing workflow, not into automatic filing progression.

`OVERRIDABLE_BLOCK`
The gate blocks the operation unless a valid approved override of the required scope is active and in
force for that specific gate record.

`HARD_BLOCK`
The operation is blocked. A `HARD_BLOCK` SHALL remain blocking regardless of override state, reviewer
acknowledgement, or same-manifest retry. Progression after a `HARD_BLOCK` is legal only through a
separately authorized child-manifest path such as replay or remediation; the original manifest remains
blocked.

### Override resolution rule

`VALID_OVERRIDE_ACTIVE(...)` SHALL be evaluated only for a gate whose own `decision = OVERRIDABLE_BLOCK`.

A gate whose own `decision = HARD_BLOCK` SHALL NOT consult override state and SHALL remain blocking.

Any implementation path that progresses the current manifest after a `HARD_BLOCK` SHALL be treated as
a fatal conformance error.

### Severity enum

- `INFO`
- `NOTICE`
- `WARNING`
- `ERROR`
- `CRITICAL`

### Overrideability enum

- `NONE`
- `SCOPED_OVERRIDE_ALLOWED`
- `SCOPED_OVERRIDE_REQUIRED`
- `NON_OVERRIDEABLE`

## 7.2 Gate evaluation order

For compliance-capable runs, gate evaluation SHALL occur in this order once each gate's prerequisite
artifacts exist.

Artifact preparation that feeds a later gate MAY occur earlier, but the gate decision itself SHALL not
be emitted out of order. In particular, drift baselines, amendment posture artifacts, and
`AmendmentCase` materialization MAY occur before trust synthesis, but `AMENDMENT_GATE` SHALL not be
executed until after `TRUST_GATE` has produced a `GateDecisionRecord`.

Narrow amendment-basis exception:

- where the frozen provider contract requires an `intent-to-amend` authority calculation to resolve
  `comparison_basis` before parity
- and that calculation returns any non-`PASS` `validation_outcome`

the engine SHALL persist the returned amendment calculation context, emit `AMENDMENT_GATE`, and only
then produce any blocked or review-required terminal outcome. In that early-failure branch, later
`PARITY_GATE`, `TRUST_GATE`, ordinary post-trust amendment progression, `FILING_GATE`, and
`SUBMISSION_GATE` do not execute for that run because their prerequisites never materialize.

When a gate's inputs arise only after seal, its `GateDecisionRecord` SHALL be appended to the
manifest-linked gate chain without rewriting earlier gate records or the frozen manifest core.

A required later gate SHALL be emitted before terminalization when the authorized runtime scope makes that later
gate mandatory.

Specifically:
- if authorized `runtime_scope[]` includes `amendment_intent` or `amendment_submit`, trust-derived terminal posture
  SHALL be deferred until after `AMENDMENT_GATE`
- if authorized `runtime_scope[]` includes `prepare_submission`, `submit`, or `amendment_submit`, trust-derived,
  amendment-derived, or other pre-packet terminal posture SHALL be routed through `FILING_GATE` so a
  filing-capable blocked/review-required outcome still emits a `FILING_GATE` record

Execution-scope note:
- every gate below SHALL read action tokens only from the authorized `runtime_scope[]`; raw
  `requested_scope[]` remains an audit artifact and SHALL NOT reopen masked, denied, or reduced live
  actions during filing, submission, or amendment evaluation

1. `ACCESS_GATE`
2. `MANIFEST_GATE`
3. `ARTIFACT_CONTRACT_GATE`
4. `INPUT_BOUNDARY_GATE`
5. `DATA_QUALITY_GATE`
6. `RETENTION_EVIDENCE_GATE`
7. `PARITY_GATE`
8. `TRUST_GATE`
9. `AMENDMENT_GATE` when amendment intent or amendment submission is requested
10. `FILING_GATE` when filing-packet preparation or filing progression is requested
11. `SUBMISSION_GATE` immediately before transmit

A later gate SHALL not downgrade the result of an earlier `HARD_BLOCK`.

---

## 7.3 ACCESS_GATE

This gate remains special because it uses the actor-and-authority contract.

### Inputs

- `PrincipalContext`
- target resource attributes
- action family
- environment attributes
- client delegation basis
- authority link state
- token/client binding state
- authentication level

### Output enum

The access gate SHALL return one of:

- `ALLOW`
- `ALLOW_MASKED`
- `REQUIRE_STEP_UP`
- `REQUIRE_APPROVAL`
- `DENY`

### Decision table

Return `DENY` if any of the following is true:

- no authenticated principal context
- tenant mismatch
- no allowed client scope
- action is authority-facing and no valid authority link exists
- token/client binding is missing or ambiguous
- action is outside role/policy scope

Return `REQUIRE_STEP_UP` if:

- the principal is otherwise allowed
- but the action is one of:
- submit to authority
- approve filing-blocking override
- export full evidence pack
- execute erasure
- approve compliance config
- mark out-of-band submission as known truth

Return `REQUIRE_APPROVAL` if:

- the actor may prepare but not approve the requested action
- or a second-person approval policy applies

Return `ALLOW_MASKED` if:

- access is permitted only to a redacted projection

Return `ALLOW` otherwise.

### Access-gate invariant

No authority-facing operation may proceed on tenant policy alone; a valid authority-link and correct
subject binding are required. HMRC's current OAuth model for user-restricted endpoints requires
software to use the correct token for the correct user/client context. [2]

---

## 7.4 MANIFEST_GATE

### Purpose

Ensure the manifest envelope is fully frozen, internally complete, and valid for seal.

`MANIFEST_GATE` is a pre-seal gate. It SHALL validate the manifest after `freeze_success`
and before `SEAL_MANIFEST(...)`. It does not require the manifest to already be sealed.

The separate requirement that a manifest be in `{SEALED, IN_PROGRESS}` before any authority
call is enforced by the authority preflight sequence and SHALL not be implemented by
`MANIFEST_GATE`.

### Inputs

- `RunManifest`
- `ConfigFreeze`
- `InputFreeze`
- schema bundle hash
- environment/profile refs

### Invocation rules

- `MANIFEST_GATE` SHALL run only in the ordered pre-seal non-access gate chain.
- For a first-pass compliance-capable run, `RunManifest.lifecycle_state` SHALL be `FROZEN`
  when `MANIFEST_GATE` is evaluated.
- Same-manifest retry after seal SHALL reuse the persisted ordered pre-seal gate records from
  the sealed context; it SHALL not reinterpret `MANIFEST_GATE` as a post-seal gate.

### Decision table

Return `HARD_BLOCK` if:

- `RunManifest.lifecycle_state != FROZEN` when `MANIFEST_GATE` is evaluated in the pre-seal chain
- `config_freeze_hash` missing
- `input_set_hash` missing
- `code_build_id` missing
- `schema_bundle_hash` missing
- provider/environment refs required for the runtime scope are missing
- any required top-level config-freeze completeness ref is missing
- `required_config_types_present[]` is missing, incomplete, or does not match the mandatory
  config-type set required for the run
- `required_config_types_present[]` does not match the de-duplicated config-type set actually present
  in `ConfigFreeze.entries[]`
- `mode = COMPLIANCE` and `run_kind != REPLAY` and any frozen compliance-critical config is not `APPROVED`
- `mode = COMPLIANCE` and `run_kind = REPLAY` and any frozen compliance-critical config is outside
  `{APPROVED, DEPRECATED, REVOKED}`
- `run_kind = REPLAY` and any non-live frozen compliance config is present while the runtime scope
  still includes a filing-capable or amendment-capable live action token

Return `OVERRIDABLE_BLOCK` if:

- a required approval reference is missing for the requested run kind and frozen policy permits
  an override path

Return `PASS_WITH_NOTICE` if:

- `run_kind = REPLAY` and one or more frozen compliance-critical config entries are
  `{DEPRECATED, REVOKED}` but the replay carve-out is valid and no live filing-capable progression
  is requested

Return `PASS` otherwise.

### Reason codes

- `MANIFEST_NOT_FROZEN_FOR_PRESEAL`
- `MANIFEST_CONFIG_FREEZE_MISSING`
- `MANIFEST_CONFIG_FREEZE_INCOMPLETE`
- `MANIFEST_INPUT_FREEZE_MISSING`
- `MANIFEST_BUILD_CONTEXT_INCOMPLETE`
- `MANIFEST_REQUIRED_CONFIG_TYPES_MISSING`
- `MANIFEST_NON_COMPLIANCE_CONFIG`
- `MANIFEST_REPLAY_SCOPE_NONLIVE_CONFIG_CONFLICT`
- `MANIFEST_REPLAY_NONLIVE_CONFIG_NOTICE`
- `MANIFEST_REQUIRED_APPROVAL_MISSING`

---

## 7.4A ARTIFACT_CONTRACT_GATE

### Purpose

Ensure both intake-boundary artifacts and intake-data artifacts conform to the frozen versioned schema
bundle before they become authoritative for compute, parity, trust, filing, or graphing.

### Inputs

- `schema_bundle`
- `source_plan`
- `source_window`
- `collection_boundary`
- `normalization_context`
- `source_record_set`
- `evidence_item_set`
- `candidate_fact_set`
- `conflict_set`
- `canonical_fact_set`
- `snapshot`
- `input_freeze`

### Decision table

Return `HARD_BLOCK` if any is true:

- required authoritative schema is missing from the frozen bundle
- `SourcePlan`, `SourceWindow`, `CollectionBoundary`, or `NormalizationContext` fails validation against its declared schema
- an authoritative artifact references a schema outside the frozen bundle
- required field missing, unknown enum value, or undeclared field exists after schema closure
- incompatible artifact-version mix violates bundle compatibility rules
- artifact envelope lacks required contract identity (`schema_id`, `semantic_version`, `dialect_ref`, `schema_bundle_hash`, `artifact_content_hash`, `writer_build_id`)
- `input_freeze.artifact_contract_refs[]` does not include the frozen `SourcePlan`, `SourceWindow`, `CollectionBoundary`, and `NormalizationContext` contract refs
- `input_freeze.artifact_contract_hash` missing for a compliance-capable run
- `input_freeze.artifact_contract_hash` does not match recomputed contract hash across intake-boundary and intake-data artifacts

Return `PASS_WITH_NOTICE` if:

- an authoritative artifact uses a deprecated but still allowed schema version inside an explicit compatibility window
- a backward-compatible minor-version skew exists across independent artifact families and is permitted by frozen policy

Return `PASS` otherwise.

### Reason codes

- `ARTIFACT_SCHEMA_MISSING`
- `ARTIFACT_SCHEMA_NOT_IN_BUNDLE`
- `ARTIFACT_SCHEMA_VALIDATION_FAILED`
- `ARTIFACT_VERSION_INCOMPATIBLE`
- `ARTIFACT_ENVELOPE_INCOMPLETE`
- `ARTIFACT_CONTRACT_REF_MISSING`
- `ARTIFACT_CONTRACT_HASH_MISMATCH`
- `ARTIFACT_SCHEMA_DEPRECATED_ALLOWED`

---

## 7.5 INPUT_BOUNDARY_GATE

### Purpose

Ensure the data population in scope is frozen and not drifting during the run.

### Inputs

- `InputFreeze`
- `CollectionBoundary`
- exclusion declarations

### Decision table

Return `HARD_BLOCK` if:

- required source classes for the requested scope were never evaluated
- input boundary is missing for a compliance run
- source set was mutated after `FREEZE_COLLECTION_BOUNDARY`

Return `MANUAL_REVIEW` if:

- frozen scope includes explicit exclusions affecting a filing-critical domain

Return `PASS_WITH_NOTICE` if:

- non-filing-critical exclusions exist inside the frozen boundary
- stale but non-critical sources are declared inside the frozen boundary

Return `PASS` otherwise.

Post-seal late-data discovery SHALL NOT be judged here; it SHALL instead be passed into
`FILING_GATE` as `late_data_status` together with the applicable ordered
`late_data_policy_bindings[]` for the affected frozen source bindings.

### Reason codes

- `INPUT_BOUNDARY_UNFROZEN`
- `INPUT_POST_BOUNDARY_SOURCE_MUTATION`
- `INPUT_CRITICAL_SOURCE_EXCLUDED`
- `INPUT_NONCRITICAL_SOURCE_EXCLUDED`
- `INPUT_NONCRITICAL_SOURCE_STALE`

---

## 7.6 DATA_QUALITY_GATE

### Purpose

Convert completeness, validation, freshness, and conflict metrics into an execution decision.

### Inputs

- `completeness_score`
- `data_quality_score`
- `critical_domain_missing_count`
- `blocking_conflict_count`
- `stale_critical_domain_count`
- `validation_error_budget_exceeded`
- scope-specific required-domain profile

### Default thresholds

Unless overridden by frozen policy:

- `completeness_min_review = 75`
- `completeness_min_submit = 85`
- `data_quality_min_review = 70`
- `data_quality_min_submit = 80`

### Decision table

Return `HARD_BLOCK` if any is true:

- `blocking_conflict_count > 0`
- `critical_domain_missing_count > 0`
- `completeness_score < 60`
- `data_quality_score < 55`
- validation has a filing-critical structural error

Return `OVERRIDABLE_BLOCK` if:

- `60 <= completeness_score < 75`
- or `55 <= data_quality_score < 70`
- or `stale_critical_domain_count > 0`
- or required critical domain exists only as provisional facts

Return `MANUAL_REVIEW` if:

- `75 <= completeness_score < 85`
- or `70 <= data_quality_score < 80`
- or only non-blocking critical warnings exist

Return `PASS_WITH_NOTICE` if:

- `completeness_score >= 85`
- `data_quality_score >= 80`
- but non-critical warnings or partial domains remain

Return `PASS` if:

- `completeness_score >= 85`
- `data_quality_score >= 80`
- no critical warnings remain

### Reason codes

- `DQ_CRITICAL_DOMAIN_MISSING`
- `DQ_BLOCKING_CONFLICT`
- `DQ_COMPLETENESS_BELOW_MINIMUM`
- `DQ_DATA_QUALITY_BELOW_MINIMUM`
- `DQ_STALE_CRITICAL_DOMAIN`
- `DQ_PROVISIONAL_CRITICAL_FACT`
- `DQ_NONCRITICAL_WARNING_PRESENT`

---

## 7.7 RETENTION_EVIDENCE_GATE

### Purpose

Ensure required evidence is still available and sufficiently direct for the requested action.

### Inputs

- `graph_quality_score`
- `critical_path_coverage`
- `critical_retention_limited_count`
- `critical_evidence_erased_count`
- `inferred_critical_path_ratio`

### Default thresholds

- `critical_path_coverage_min_submit = 0.90`
- `graph_quality_min_submit = 80`
- `inferred_critical_path_ratio_max_submit = 0.35`

### Decision table

Return `HARD_BLOCK` if:

- any filing-critical evidence path is erased
- `critical_path_coverage < 0.75`
- graph for a filing-critical figure cannot produce at least one explainable path
- required evidence is retention-limited in a way that prevents lawful or defensible submission

Return `OVERRIDABLE_BLOCK` if:

- `0.75 <= critical_path_coverage < 0.90`
- or `65 <= graph_quality_score < 80`
- or critical paths exist but rely heavily on inferred links
- or a critical path is limited but still explainable with explicit limitation notes

Return `MANUAL_REVIEW` if:

- evidence paths exist for all critical figures
- but non-critical limitations materially affect reviewer confidence

Return `PASS_WITH_NOTICE` if:

- only non-critical evidence limitations exist

Return `PASS` otherwise.

### Reason codes

- `RETENTION_CRITICAL_EVIDENCE_ERASED`
- `RETENTION_CRITICAL_PATH_MISSING`
- `RETENTION_GRAPH_QUALITY_BELOW_MINIMUM`
- `RETENTION_CRITICAL_LIMITATION`
- `RETENTION_INFERRED_PATH_RATIO_HIGH`
- `RETENTION_NONCRITICAL_LIMITATION`

---

## 7.8 PARITY_GATE

### Purpose

Decide whether the internal result can be used as-is, must be reviewed, needs override, or is blocked
when compared against authority or filing-baseline values.

### Inputs

- `parity_classification`
- `parity_score`
- `critical_blocking_field_count`
- `critical_material_field_count`
- `comparison_required`
- `override_state`

### Decision table

Return `HARD_BLOCK` if:

- (`parity_classification = BLOCKING_DIFFERENCE` and no valid approved parity override exists)
- or (`parity_classification = NOT_COMPARABLE` and comparison is mandatory for the requested scope)

Return `OVERRIDABLE_BLOCK` if:

- (`parity_classification = MATERIAL_DIFFERENCE` and at least one critical field is affected)
- or (`parity_classification = BLOCKING_DIFFERENCE` and policy allows scoped parity override and no approved override is yet active)

Return `MANUAL_REVIEW` if:

- (`parity_classification = MATERIAL_DIFFERENCE` and only non-critical comparison fields are affected)
- or (`parity_classification = NOT_COMPARABLE` and comparison is desirable but not mandatory)

Return `PASS_WITH_NOTICE` if:

- `parity_classification = MINOR_DIFFERENCE`

Return `PASS` if:

- `parity_classification = MATCH`

### Reason codes

- `PARITY_MATCH`
- `PARITY_MINOR_DIFFERENCE`
- `PARITY_MATERIAL_DIFFERENCE`
- `PARITY_BLOCKING_DIFFERENCE`
- `PARITY_NOT_COMPARABLE`
- `PARITY_OVERRIDE_REQUIRED`
- `PARITY_OVERRIDE_ACTIVE`

### HMRC-specific note

The provider contract profile should freeze which authority comparison path is valid for the scope,
because HMRC's Individual Calculations API currently distinguishes calculation types such as `in-year`,
`intent-to-finalise`, `intent-to-amend`, and `final-declaration`, and HMRC's roadmap also notes a
change in how periodic obligations are marked as met, tied to cumulative update data rather than a
tax-calculation request for periodic obligations. [3]

---

## 7.9 TRUST_GATE

### Inputs

- upstream gate outcomes
- `trust_band`
- `trust_score`
- `automation_level`
- `filing_readiness`
- active override usage
- unresolved pre-trust human steps only

### Decision table

Return `HARD_BLOCK` if:

- any upstream gate returned `HARD_BLOCK`
- or `trust_band = INSUFFICIENT_DATA`
- or `filing_readiness = NOT_READY`

Return `OVERRIDABLE_BLOCK` if:

- (any upstream gate returned `OVERRIDABLE_BLOCK` and no valid approved override is active)
- or (`trust_band = RED` and all underlying blockers are individually overrideable but not yet overridden)

Return `MANUAL_REVIEW` if:

- any upstream gate returned `MANUAL_REVIEW`
- or `trust_band = AMBER`
- or `filing_readiness = READY_REVIEW`
- or one or more unresolved pre-trust human steps remain

Return `PASS_WITH_NOTICE` if:

- (no higher-severity condition matched and any upstream gate returned `PASS_WITH_NOTICE`)
- or (`trust_band = GREEN` and automation is limited due to non-critical overrides, non-critical parity notice, or non-critical retention limits)

Return `PASS` if:

- `trust_band = GREEN`
- `automation_level = ALLOWED`
- `filing_readiness = READY_TO_SUBMIT`
- no unresolved pre-trust human steps remain

### Reason codes

- `TRUST_GREEN`
- `TRUST_AMBER`
- `TRUST_RED`
- `TRUST_INSUFFICIENT_DATA`
- `TRUST_AUTOMATION_LIMITED`
- `TRUST_REQUIRED_HUMAN_STEPS`
- `TRUST_OVERRIDE_DEPENDENT_PROGRESS`
- `TRUST_UPSTREAM_GATE_BLOCK`
- `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`
- `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`

---

## 7.10 FILING_GATE

### Purpose

Govern filing-capable progression.

`FILING_GATE` SHALL evaluate both:

1. prepared-packet paths, and
2. pre-packet readiness paths, including trust-blocked progression, amendment-blocked progression,
   and failed or review-required authority-calculation outcomes such as `intent-to-finalise`.

A filing-capable run SHALL not terminate, block, or enter review-required state from a pre-packet
filing-readiness output without first emitting an explicit `FILING_GATE` record.

### Inputs

- access result
- manifest state
- manifest mode
- trust output when available
- parity result when available
- `upstream_gate_records[]`
- obligation status
- filing packet state, if a packet has been prepared
- authority link state
- approval state
- declaration-basis acknowledgement state, which may be `NOT_APPLICABLE` on a legitimate pre-packet path
- authorized `runtime_scope[]` tokens
- amendment posture when applicable
- override state / active overrides
- `filing_notice_steps[]`
- late-data status since seal
- `late_data_policy_bindings[]` for the affected frozen source bindings
- optional `filing_readiness_context` from pre-packet filing preparation, including:
  - `validation_outcome`
  - readiness reason codes
  - calculation refs / basis refs when applicable

### Decision table

Return `HARD_BLOCK` if:

- any upstream gate returned `HARD_BLOCK`
- access gate decision is not `ALLOW` or `ALLOW_MASKED` as appropriate
- manifest mode is not `COMPLIANCE`
- `filing_readiness_context.validation_outcome = HARD_BLOCK`
- filing packet state is `VOID` or `SUPERSEDED`
- filing packet is missing and there is no active pre-packet readiness context and no unresolved
  upstream gate posture that legitimately explains the pre-packet branch
- authority link not active
- obligation or tax-year context does not support the requested submission
- required end-of-year preconditions are incomplete
- amendment requested without an eligible baseline
- `approval_state` is in `{UNSATISFIABLE, DENIED}`
- `declared_basis_ack_state = UNSATISFIABLE`
- any filing-critical late-data event after seal maps to a frozen source binding whose
  `late_data_policy_ref = SPAWN_CHILD_MANIFEST`

Return `OVERRIDABLE_BLOCK` if:

- any upstream gate returned `OVERRIDABLE_BLOCK` and no valid approved override is active
- `filing_readiness_context.validation_outcome = OVERRIDABLE_BLOCK`
- filing depends on a scoped approved override not yet granted

Return `MANUAL_REVIEW` if:

- any upstream gate returned `MANUAL_REVIEW`
- `filing_readiness_context.validation_outcome = MANUAL_REVIEW`
- trust output requires review
- parity output requires review
- any filing-critical late-data event after seal maps to a frozen source binding whose
  `late_data_policy_ref = REVIEW_IF_LATE`

Return `PASS_WITH_NOTICE` if:

- no higher-severity condition matched and any upstream gate returned `PASS_WITH_NOTICE`
- `filing_readiness_context.validation_outcome = PASS_WITH_NOTICE` and no filing packet has yet been prepared
- `approval_state = REQUIRED_PENDING`
- `declared_basis_ack_state = REQUIRED_PENDING`
- `filing_notice_steps[]` is non-empty and every unresolved step is packet-local
- trust or parity emitted non-blocking notices
- only non-critical late-data exists and every affected source binding has
  `late_data_policy_ref = EXCLUDE_LATE`

Return `PASS` otherwise.

Notes:
- `declared_basis_ack_state = NOT_APPLICABLE` on a legitimate pre-packet branch SHALL not by itself
  create block or review
- a missing filing packet is legal only on an explicit pre-packet readiness branch

When multiple frozen source bindings are affected by late data, the gate SHALL evaluate each binding
independently and return the highest-severity aggregate decision.

### Reason codes

- `FILING_PACKET_UNAVAILABLE`
- `FILING_MANIFEST_MODE_ANALYSIS`
- `FILING_AUTHORITY_LINK_INACTIVE`
- `FILING_OBLIGATION_NOT_OPEN`
- `FILING_FINAL_DECLARATION_PRECONDITION_MISSING`
- `FILING_AMENDMENT_BASELINE_MISSING`
- `FILING_APPROVAL_REQUIRED`
- `FILING_APPROVAL_UNSATISFIABLE`
- `FILING_OVERRIDE_REQUIRED`
- `FILING_DECLARED_BASIS_ACK_REQUIRED`
- `FILING_DECLARED_BASIS_ACK_UNSATISFIABLE`
- `FILING_NOTICE_REQUIRED`
- `FILING_LATE_DATA_CHILD_MANIFEST_REQUIRED`
- `FILING_LATE_DATA_REVIEW_REQUIRED`
- `FILING_LATE_DATA_NONCRITICAL_EXCLUDED`
- `FILING_PREPARATION_HARD_BLOCK`
- `FILING_PREPARATION_OVERRIDE_REQUIRED`
- `FILING_PREPARATION_REVIEW_REQUIRED`
- `FILING_UPSTREAM_GATE_BLOCK`
- `FILING_UPSTREAM_GATE_REVIEW_REQUIRED`
- `FILING_UPSTREAM_GATE_NOTICE_ACTIVE`

---

## 7.11 SUBMISSION_GATE

### Inputs

- authority preflight reauthorization decision
- authority preflight manifest-state check result
- authority preflight token/client binding check result
- authority preflight approval-validity check result
- authority preflight declared-basis-ack validity check result
- filing packet payload hash
- filing packet manifest-binding hash
- expected manifest-binding hash
- authority idempotency key
- existing submissions for the same authority meaning
- authority binding
- canonical request-body hash
- filing packet lifecycle state
- authorized `runtime_scope[]`
- amendment posture when applicable

### Decision table

Return `HARD_BLOCK` if:

- authority preflight reauthorization decision is not in `{ALLOW, ALLOW_MASKED}`
- authority preflight manifest-state check failed
- authority preflight token/client binding check failed
- authority preflight approval-validity check failed
- authority preflight declared-basis-ack validity check failed
- filing packet manifest-binding hash does not equal the expected manifest-binding hash
- idempotency key collides with a different packet body
- a confirmed submission already exists for the same obligation and the current transmit is not an
  eligible amendment progression
- runtime scope includes `amendment_submit` but amendment posture is absent or not in `READY_TO_AMEND`
- authority link/token is invalid
- filing packet is not `APPROVED_TO_SUBMIT`

Return `MANUAL_REVIEW` if:

- submission recovery or reconciliation is required before transmit

Return `PASS_WITH_NOTICE` if:

- the exact same packet and idempotency key already exist in a safe retriable state and the engine
  will perform idempotent recovery rather than a blind resend

Return `PASS` otherwise.

### Reason codes

- `SUBMISSION_REAUTHORIZATION_FAILED`
- `SUBMISSION_MANIFEST_NOT_READY`
- `SUBMISSION_APPROVAL_INVALID`
- `SUBMISSION_DECLARED_BASIS_ACK_INVALID`
- `SUBMISSION_PACKET_MANIFEST_BINDING_MISMATCH`
- `SUBMISSION_PACKET_NOT_APPROVED`
- `SUBMISSION_IDEMPOTENCY_BODY_COLLISION`
- `SUBMISSION_PRIOR_CONFIRMED_EXISTS`
- `SUBMISSION_AMENDMENT_NOT_READY`
- `SUBMISSION_AUTHORITY_TOKEN_INVALID`
- `SUBMISSION_PENDING_ALREADY_EXISTS`
- `SUBMISSION_SAFE_IDEMPOTENT_RECOVERY`

---

## 7.12 AMENDMENT_GATE

### Purpose

Determine whether an amendment journey may begin or progress.

`AMENDMENT_GATE` governs both:

- ordinary amendment progression decisions, and
- `intent-to-amend` readiness outcomes when an authority calculation is required before amendment
  progression may continue

An amendment-capable run SHALL never terminate directly from raw `intent-to-amend`
`validation_outcome`, and SHALL never route `intent-to-amend` readiness failure through
`FILING_GATE`.

### Inputs

- manifest mode
- filing baseline status
- amendment window state
- drift classification
- intent-to-amend status
- authority context
- authorized amendment action token from `runtime_scope[]`
- optional `amendment_readiness_context`, including:
  - `validation_outcome`
  - `reason_codes[]`
  - `calculation_request_ref`
  - `calculation_id`
  - `calculation_type`
  - `calculation_basis_ref`
  - `user_confirmation_ref`
  - `live_authority_call_executed`

### Decision table

Evaluate conditions strictly in descending severity order: `HARD_BLOCK` > `OVERRIDABLE_BLOCK` >
`MANUAL_REVIEW` > `PASS_WITH_NOTICE` > `PASS`. Each bullet below is parenthesized as a complete
condition against the authorized amendment runtime scope.

Return `HARD_BLOCK` if:

- manifest mode is not `COMPLIANCE`
- no confirmed final-declaration baseline exists
- amendment window is closed
- amendment is requested against unresolved out-of-band baseline truth
- required authority preconditions are missing
- `amendment_readiness_context.validation_outcome = HARD_BLOCK`

Return `OVERRIDABLE_BLOCK` if:

- `amendment_readiness_context.validation_outcome = OVERRIDABLE_BLOCK`

Return `MANUAL_REVIEW` if any of the following is true:

- amendment is legally possible but `drift_classification` is in `{NO_CHANGE, BENIGN_DRIFT}`
- authorized amendment scope token is `amendment_submit` and intent-to-amend is required but not yet completed in the current or prior manifest lineage
- additional validation errors must be resolved first
- `amendment_readiness_context.validation_outcome = MANUAL_REVIEW`

Return `PASS_WITH_NOTICE` if any of the following is true:

- amendment is eligible but only a subset of the authorized runtime scope is amendable
- authorized amendment scope token is `amendment_intent`, no `amendment_readiness_context` is yet present, and the engine may begin the `intent-to-amend` calculation flow but may not yet confirm amendment submission
- `amendment_readiness_context.validation_outcome = PASS_WITH_NOTICE`

Return `PASS` if:

- manifest mode is `COMPLIANCE`
- confirmed final-declaration baseline exists
- amendment window open
- material drift or explicit amendment basis present
- required intent-to-amend completed for amendment submission, or not required for the current amendment scope
- no authority validation errors remain

### Reason codes

- `AMENDMENT_MANIFEST_MODE_ANALYSIS`
- `AMENDMENT_NO_CONFIRMED_FINAL_DECLARATION`
- `AMENDMENT_WINDOW_CLOSED`
- `AMENDMENT_DRIFT_NOT_MATERIAL`
- `AMENDMENT_INTENT_TO_AMEND_REQUIRED`
- `AMENDMENT_INTENT_TO_AMEND_VALIDATION_FAILED`
- `AMENDMENT_INTENT_TO_AMEND_OVERRIDE_REQUIRED`
- `AMENDMENT_INTENT_TO_AMEND_REVIEW_REQUIRED`
- `AMENDMENT_OUT_OF_BAND_BASELINE_UNRESOLVED`
- `AMENDMENT_ELIGIBLE`

HMRC's year-end guidance says amendments after final declaration are available only after final
declaration has been completed through software, within the amendment window, and only after an
`Intent to Amend Calculation` path has passed validation. [4]

---

## 7.13 Gate reason-code families

Reason codes SHALL be namespaced by gate family:

- `ACCESS_*`
- `MANIFEST_*`
- `ARTIFACT_*`
- `INPUT_*`
- `DQ_*`
- `RETENTION_*`
- `PARITY_*`
- `TRUST_*`
- `FILING_*`
- `SUBMISSION_*`
- `AMENDMENT_*`

A gate SHALL never emit free-text-only reasons.

## 7.14 One-sentence summary

The gate layer makes every progression explicit: each run either passes, passes with notice, routes to
review, requires override, or hard-blocks, and the reason is always recorded in manifest-linked,
replayable form.

[1]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates
[2]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/prepare-for-mtd.html?utm_source=chatgpt.com
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0/oas/page?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html
