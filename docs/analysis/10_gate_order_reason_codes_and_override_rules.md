# Gate Order, Reason Codes, and Override Rules

## Shared Contract

- Gate count: `11`
- Non-access gates: `10`
- Declared reason-code families: `11`
- Instantiated reason-code families: `10`
- Missing declared families: `ACCESS_*`

| Profile | Value |
| --- | --- |
| Non-access decision enum | `PASS, PASS_WITH_NOTICE, MANUAL_REVIEW, OVERRIDABLE_BLOCK, HARD_BLOCK` |
| Severity mapping | `PASS->INFO, PASS_WITH_NOTICE->NOTICE, MANUAL_REVIEW->WARNING, OVERRIDABLE_BLOCK->ERROR, HARD_BLOCK->CRITICAL` |
| Progression ranks | `PASS->2, PASS_WITH_NOTICE->2, MANUAL_REVIEW->1, OVERRIDABLE_BLOCK->0, HARD_BLOCK->0` |
| Readiness ranks | `READY_TO_SUBMIT->2, READY_REVIEW->1, NOT_READY->0` |
| Overrideability enum | `NONE, SCOPED_OVERRIDE_ALLOWED, SCOPED_OVERRIDE_REQUIRED, NON_OVERRIDEABLE` |

## Canonical Gate Order

| Order | Gate | Class | Scope Condition |
| --- | --- | --- | --- |
| 1 | `ACCESS_GATE` | `access` | Always first, before manifest allocation and before any non-access gate. |
| 2 | `MANIFEST_GATE` | `non_access` | Ordered pre-seal gate; runs on the frozen manifest before seal. |
| 3 | `ARTIFACT_CONTRACT_GATE` | `non_access` | Ordered pre-seal gate; runs after MANIFEST_GATE and before seal. |
| 4 | `INPUT_BOUNDARY_GATE` | `non_access` | Ordered pre-seal gate; runs after artifact-contract validation and before seal. |
| 5 | `DATA_QUALITY_GATE` | `non_access` | Ordered pre-seal gate; runs last in the canonical pre-seal tape before seal. |
| 6 | `RETENTION_EVIDENCE_GATE` | `non_access` | Runs once proof and graph evidence exist; appends post-seal without rewriting the frozen pre-seal tape. |
| 7 | `PARITY_GATE` | `non_access` | Runs after retention evidence once comparison artifacts exist. |
| 8 | `TRUST_GATE` | `non_access` | Runs after parity and upstream non-access gate posture are available. |
| 9 | `AMENDMENT_GATE` | `non_access` | Runs only when runtime_scope[] includes amendment_intent or amendment_submit; a narrow early-failure amendment-basis branch may emit before parity/trust. |
| 10 | `FILING_GATE` | `non_access` | Runs when runtime_scope[] includes prepare_submission, submit, or amendment_submit; early pre-trust or pre-packet branches still require an explicit filing gate record. |
| 11 | `SUBMISSION_GATE` | `non_access` | Runs immediately before transmit when live submission is actually attempted. |

## ACCESS_GATE

- Family: `access_control`
- Overrideability: `NON_OVERRIDEABLE`
- Inputs: `8`
- Reason codes: `0`
- Evaluation phase refs: `1`
- Consumer phase refs: `3`

This gate remains special because it uses the actor-and-authority contract.

### Decision Table

- `DENY`: no authenticated principal context; tenant mismatch; no allowed client scope; action is authority-facing and no valid authority link exists; token/client binding is missing or ambiguous; action is outside role/policy scope
- `REQUIRE_STEP_UP`: the principal is otherwise allowed; but the action is one of:; submit to authority; approve filing-blocking override; export full evidence pack; execute erasure; approve compliance config; mark out-of-band submission as known truth
- `REQUIRE_APPROVAL`: the actor may prepare but not approve the requested action; or a second-person approval policy applies
- `ALLOW_MASKED`: access is permitted only to a redacted projection
- `ALLOW`: no extra branch bullets

### Normalization Notes

- ACCESS_GATE uses the distinct authorization enum rather than GateDecisionRecord.
- Pre-manifest access exits may terminate before RunManifest allocation.
- GAP_ACCESS_REASON_CODES_NOT_ENUMERATED_IN_PRIMARY_GATE_SOURCE

## MANIFEST_GATE

- Family: `preseal_manifest_integrity`
- Overrideability: `SCOPED_OVERRIDE_ALLOWED`
- Inputs: `5`
- Reason codes: `14`
- Evaluation phase refs: `1`
- Consumer phase refs: `2`

Ensure the manifest envelope is fully frozen, internally complete, and valid for seal.

### Decision Table

- `HARD_BLOCK`: `RunManifest.lifecycle_state != FROZEN` when `MANIFEST_GATE` is evaluated in the pre-seal chain; `config_freeze_hash` missing; `input_set_hash` missing; `execution_basis_hash` missing; `code_build_id` missing; `schema_bundle_hash` missing; provider/environment refs required for the runtime scope are missing; any required top-level config-freeze completeness ref is missing; `required_config_types_present[]` is missing, incomplete, or does not match the mandatory config-type set required for the run; `required_config_types_present[]` does not match the de-duplicated config-type set actually present in `ConfigFreeze.entries[]`; `config_completeness_state != COMPLETE_REQUIRED_CONFIG_SET`; `config_consumption_mode != FROZEN_CONFIG_ONLY`; `mode = COMPLIANCE` and `run_kind != REPLAY` and any frozen compliance-critical config is not `APPROVED`; `mode = COMPLIANCE` and `run_kind = REPLAY` and any frozen compliance-critical config is outside `{APPROVED, DEPRECATED, REVOKED}`; `run_kind = REPLAY` and any non-live frozen compliance config is present while the runtime scope still includes a filing-capable or amendment-capable live action token; `run_kind = REPLAY` and `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` but `continuation_set.config_inheritance_mode != REPLAY_EXACT`; `run_kind = REPLAY` and `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` but `ConfigFreeze.config_resolution_basis != REPLAY_EXACT_REUSE`; `run_kind = REPLAY` and `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` but `continuation_set.input_inheritance_mode != REPLAY_EXACT`; `continuation_basis = RECOVERY_CHILD` but either config or input inheritance mode is not the exact recovery mode required for same-attempt replayable recovery; `continuation_basis = RECOVERY_CHILD` but `ConfigFreeze.config_resolution_basis != RECOVERY_EXACT_REUSE`; `continuation_set.config_inheritance_mode = FRESH_CHILD_RESOLUTION` but `ConfigFreeze.config_resolution_basis` is not `DIRECT_REQUEST_RESOLUTION`; `continuation_set.config_inheritance_mode = HISTORICAL_EXPLICIT` but `ConfigFreeze.config_resolution_basis != HISTORICAL_EXPLICIT_REUSE`
- `OVERRIDABLE_BLOCK`: a required approval reference is missing for the requested run kind and frozen policy permits an override path
- `PASS_WITH_NOTICE`: `run_kind = REPLAY` and one or more frozen compliance-critical config entries are `{DEPRECATED, REVOKED}` but the replay carve-out is valid and no live filing-capable progression is requested
- `PASS`: no extra branch bullets

### Reason Codes

- `MANIFEST_NOT_FROZEN_FOR_PRESEAL`, `MANIFEST_CONFIG_FREEZE_MISSING`, `MANIFEST_CONFIG_FREEZE_INCOMPLETE`, `MANIFEST_INPUT_FREEZE_MISSING`, `MANIFEST_EXECUTION_BASIS_HASH_MISSING`, `MANIFEST_BUILD_CONTEXT_INCOMPLETE`, `MANIFEST_REQUIRED_CONFIG_TYPES_MISSING`, `MANIFEST_NON_COMPLIANCE_CONFIG`, `MANIFEST_REPLAY_SCOPE_NONLIVE_CONFIG_CONFLICT`, `MANIFEST_REPLAY_CONFIG_BASIS_INVALID`, `MANIFEST_REPLAY_INPUT_BASIS_INVALID`, `MANIFEST_RECOVERY_BASIS_INVALID`, `MANIFEST_REPLAY_NONLIVE_CONFIG_NOTICE`, `MANIFEST_REQUIRED_APPROVAL_MISSING`

### Normalization Notes

- Same-manifest retry reuses persisted pre-seal gate records after seal.
- Pre-seal PASS_WITH_NOTICE posture remains binding after seal.

## ARTIFACT_CONTRACT_GATE

- Family: `artifact_contract_safety`
- Overrideability: `NON_OVERRIDEABLE`
- Inputs: `12`
- Reason codes: `8`
- Evaluation phase refs: `1`
- Consumer phase refs: `2`

Ensure both intake-boundary artifacts and intake-data artifacts conform to the frozen versioned schema bundle before they become authoritative for compute, parity, trust, filing, or graphing.

### Decision Table

- `HARD_BLOCK`: required authoritative schema is missing from the frozen bundle; `SourcePlan`, `SourceWindow`, `CollectionBoundary`, or `NormalizationContext` fails validation against its declared schema; an authoritative artifact references a schema outside the frozen bundle; required field missing, unknown enum value, or undeclared field exists after schema closure; incompatible artifact-version mix violates bundle compatibility rules; artifact envelope lacks required contract identity (`schema_id`, `semantic_version`, `dialect_ref`, `schema_bundle_hash`, `artifact_content_hash`, `writer_build_id`); `input_freeze.artifact_contract_refs[]` does not include the frozen `SourcePlan`, `SourceWindow`, `CollectionBoundary`, and `NormalizationContext` contract refs; `input_freeze.artifact_contract_hash` missing for a compliance-capable run; `input_freeze.artifact_contract_hash` does not match recomputed contract hash across intake-boundary and intake-data artifacts
- `PASS_WITH_NOTICE`: an authoritative artifact uses a deprecated but still allowed schema version inside an explicit compatibility window; a backward-compatible minor-version skew exists across independent artifact families and is permitted by frozen policy
- `PASS`: no extra branch bullets

### Reason Codes

- `ARTIFACT_SCHEMA_MISSING`, `ARTIFACT_SCHEMA_NOT_IN_BUNDLE`, `ARTIFACT_SCHEMA_VALIDATION_FAILED`, `ARTIFACT_VERSION_INCOMPATIBLE`, `ARTIFACT_ENVELOPE_INCOMPLETE`, `ARTIFACT_CONTRACT_REF_MISSING`, `ARTIFACT_CONTRACT_HASH_MISMATCH`, `ARTIFACT_SCHEMA_DEPRECATED_ALLOWED`

### Normalization Notes

- Pre-seal PASS_WITH_NOTICE posture remains binding after seal.

## INPUT_BOUNDARY_GATE

- Family: `input_boundary`
- Overrideability: `NON_OVERRIDEABLE`
- Inputs: `4`
- Reason codes: `7`
- Evaluation phase refs: `1`
- Consumer phase refs: `2`

Ensure the data population in scope is frozen, explicitly classified per source domain, and not drifting during the run.

### Decision Table

- `HARD_BLOCK`: required source classes for the requested scope were never evaluated; input boundary is missing for a compliance run; source set was mutated after `FREEZE_COLLECTION_BOUNDARY`; any required domain lacks one explicit frozen posture in `source_domain_postures[]`; gate evaluation consults raw connector deltas or a fresher boundary snapshot instead of `InputFreeze`
- `MANUAL_REVIEW`: frozen scope includes explicit exclusions affecting a filing-critical domain; a filing-critical domain is frozen `STALE_AT_CUTOFF`
- `PASS_WITH_NOTICE`: non-filing-critical exclusions exist inside the frozen boundary; non-filing-critical domains are explicitly `NO_DATA_CONFIRMED_AT_CUTOFF`; stale but non-critical sources are declared inside the frozen boundary
- `PASS`: no extra branch bullets

### Reason Codes

- `INPUT_BOUNDARY_UNFROZEN`, `INPUT_POST_BOUNDARY_SOURCE_MUTATION`, `INPUT_CRITICAL_SOURCE_EXCLUDED`, `INPUT_CRITICAL_SOURCE_STALE`, `INPUT_NONCRITICAL_SOURCE_EXCLUDED`, `INPUT_NONCRITICAL_SOURCE_CONFIRMED_EMPTY`, `INPUT_NONCRITICAL_SOURCE_STALE`

### Normalization Notes

- Post-seal late data is judged by FILING_GATE via LateDataMonitorResult, not re-evaluated here.
- Pre-seal MANUAL_REVIEW or PASS_WITH_NOTICE posture remains binding after seal.

## DATA_QUALITY_GATE

- Family: `data_quality`
- Overrideability: `SCOPED_OVERRIDE_ALLOWED`
- Inputs: `9`
- Reason codes: `7`
- Evaluation phase refs: `1`
- Consumer phase refs: `2`

Convert completeness, validation, freshness, and conflict metrics into an execution decision.

### Decision Table

- `HARD_BLOCK`: `blocking_conflict_count > 0`; `conflict_resolution_frontier = BLOCKING_PRESENT`; `critical_domain_missing_count > 0`; `completeness_score < 60`; `data_quality_score < 55`; validation has a filing-critical structural error
- `OVERRIDABLE_BLOCK`: `60 <= completeness_score < 75`; or `55 <= data_quality_score < 70`; or `stale_critical_domain_count > 0`; or required critical domain exists only as provisional facts
- `MANUAL_REVIEW`: `75 <= completeness_score < 85`; or `70 <= data_quality_score < 80`; or only non-blocking critical warnings exist
- `PASS_WITH_NOTICE`: `completeness_score >= 85`; `data_quality_score >= 80`; and either `conflict_resolution_frontier = MONITORING_ONLY` or non-critical warnings or partial domains remain
- `PASS`: `completeness_score >= 85`; `data_quality_score >= 80`; `open_conflict_count = 0`; no critical warnings remain

### Reason Codes

- `DQ_CRITICAL_DOMAIN_MISSING`, `DQ_BLOCKING_CONFLICT`, `DQ_COMPLETENESS_BELOW_MINIMUM`, `DQ_DATA_QUALITY_BELOW_MINIMUM`, `DQ_STALE_CRITICAL_DOMAIN`, `DQ_PROVISIONAL_CRITICAL_FACT`, `DQ_NONCRITICAL_WARNING_PRESENT`

### Normalization Notes

- Pre-seal MANUAL_REVIEW or PASS_WITH_NOTICE posture remains binding after seal.
- OVERRIDABLE_BLOCK is explicitly available for bounded low-quality or stale-critical posture.

## RETENTION_EVIDENCE_GATE

- Family: `retention_evidence`
- Overrideability: `SCOPED_OVERRIDE_ALLOWED`
- Inputs: `18`
- Reason codes: `15`
- Evaluation phase refs: `1`
- Consumer phase refs: `0`

Ensure required evidence is still available and sufficiently direct for the requested action.

### Decision Table

- `HARD_BLOCK`: any filing-critical evidence path is erased; `critical_path_coverage < 0.75`; `critical_silent_limitation_count > 0`; `unsupported_critical_target_count > 0`; `contradicted_critical_target_count > 0`; `open_critical_target_count > 0`; `missing_proof_bundle_target_count > 0`; `replay_failure_target_count > 0`; `critical_explanation_failure_count > 0`; any filing-critical path survivability falls below `path_survivability_min_audit`; required evidence is retention-limited in a way that prevents lawful or defensible submission
- `OVERRIDABLE_BLOCK`: `0.75 <= critical_path_coverage < 0.90`; or `65 <= graph_quality_score < 80`; or `path_survivability_min_review <= weighted_path_survivability < path_survivability_min_submit`; or `limitation_clarity_ratio < limitation_clarity_min_submit` with explicit limitation notes but no silent ambiguity; or critical paths exist but rely heavily on inferred links; or stale decisive targets exist but policy allows scoped human waiver before rebuild; or a critical path is limited but still explainable with explicit limitation notes
- `MANUAL_REVIEW`: evidence paths exist for all critical figures; but non-critical limitations materially affect reviewer confidence; or `noncritical_silent_limitation_count > 0`; or `noncritical_explanation_failure_count > 0`
- `PASS_WITH_NOTICE`: only non-critical evidence limitations exist; or only non-critical stale or limited proof posture exists with explicit limitation notes; or `weighted_path_survivability >= path_survivability_min_submit` and `limitation_clarity_ratio = 1` but non-critical limitations still remain visible
- `PASS`: no extra branch bullets

### Reason Codes

- `RETENTION_CRITICAL_EVIDENCE_ERASED`, `RETENTION_CRITICAL_PATH_MISSING`, `RETENTION_GRAPH_QUALITY_BELOW_MINIMUM`, `RETENTION_CRITICAL_LIMITATION`, `RETENTION_SILENT_LIMITATION_AMBIGUITY`, `RETENTION_SURVIVABILITY_BELOW_AUDIT_MINIMUM`, `RETENTION_SURVIVABILITY_BELOW_SUBMIT_MINIMUM`, `RETENTION_INFERRED_PATH_RATIO_HIGH`, `RETENTION_PROOF_BUNDLE_MISSING`, `RETENTION_TARGET_UNSUPPORTED`, `RETENTION_TARGET_CONTRADICTED`, `RETENTION_PROOF_CLOSURE_OPEN`, `RETENTION_REPLAY_FAILURE`, `RETENTION_EXPLANATION_FAILURE`, `RETENTION_NONCRITICAL_LIMITATION`

### Normalization Notes

- Retention limitations remain explicit reason-coded posture rather than hidden score discounting.

## PARITY_GATE

- Family: `authority_parity`
- Overrideability: `SCOPED_OVERRIDE_ALLOWED`
- Inputs: `8`
- Reason codes: `7`
- Evaluation phase refs: `1`
- Consumer phase refs: `1`

Decide whether the internal result can be used as-is, must be reviewed, needs override, or is blocked when compared against authority or filing-baseline values.

### Decision Table

- `HARD_BLOCK`: (`parity_classification = BLOCKING_DIFFERENCE` and no valid approved parity override exists); or (`parity_classification = NOT_COMPARABLE` and comparison is mandatory for the requested scope)
- `OVERRIDABLE_BLOCK`: (`parity_classification = MATERIAL_DIFFERENCE` and at least one critical field is affected); or (`parity_classification = BLOCKING_DIFFERENCE` and policy allows scoped parity override and no approved override is yet active)
- `MANUAL_REVIEW`: (`parity_classification = MATERIAL_DIFFERENCE` and only non-critical comparison fields are affected); or (`parity_classification = NOT_COMPARABLE` and comparison is desirable but not mandatory)
- `PASS_WITH_NOTICE`: `parity_classification = MINOR_DIFFERENCE`
- `PASS`: `parity_classification = MATCH` `comparison_set_state = INVALID` SHALL already be serialized by `ParityResult` as `parity_classification = NOT_COMPARABLE`, `parity_score = 0`, and `dominant_reason_code = PARITY_COMPARISON_SET_INVALID`; `PARITY_GATE` SHALL preserve that fail-closed posture instead of softening it into a local-match heuristic.

### Reason Codes

- `PARITY_MATCH`, `PARITY_MINOR_DIFFERENCE`, `PARITY_MATERIAL_DIFFERENCE`, `PARITY_BLOCKING_DIFFERENCE`, `PARITY_NOT_COMPARABLE`, `PARITY_OVERRIDE_REQUIRED`, `PARITY_OVERRIDE_ACTIVE`

### Normalization Notes

- Comparison-set invalidity must remain fail-closed as NOT_COMPARABLE.

## TRUST_GATE

- Family: `trust_synthesis`
- Overrideability: `SCOPED_OVERRIDE_REQUIRED`
- Inputs: `17`
- Reason codes: `17`
- Evaluation phase refs: `1`
- Consumer phase refs: `2`



### Decision Table

- `HARD_BLOCK`: any upstream gate returned `HARD_BLOCK`; synthesized trust artifact is missing, superseded, or not bound to the current manifest scope; synthesized trust artifact is internally inconsistent under the frozen trust formulas or claims automation/readiness above the current upstream gate progression cap; synthesized trust artifact omits the persisted `score_band`, `cap_band`, `upstream_gate_cap`, or `trust_input_basis_contract{...}`, `trust_sensitivity_analysis_contract{...}`, or decisive `blocking_dependency_refs[]` required to explain a stale, reviewed, or blocked posture; `trust_input_state in {INCOMPLETE, CONTRADICTED}`; `automation_level` or `filing_readiness` exceeds the persisted `trust_input_basis_contract` ceiling; `trust_band in {RED, INSUFFICIENT_DATA}`; `filing_readiness = NOT_READY`
- `OVERRIDABLE_BLOCK`: any upstream gate returned `OVERRIDABLE_BLOCK` and no valid approved override is active
- `MANUAL_REVIEW`: any upstream gate returned `MANUAL_REVIEW`; `trust_input_state = ADMISSIBLE_STALE`; `threshold_stability_state = EDGE_REVIEW`; `trust_band = AMBER`; `filing_readiness = READY_REVIEW`; one or more unresolved pre-trust human steps remain
- `PASS_WITH_NOTICE`: any upstream gate returned `PASS_WITH_NOTICE`; a valid approved override is active but no unresolved review/block condition remains; trust output carries non-blocking notice-only reason codes
- `PASS`: `trust_input_state = ADMISSIBLE_CURRENT`; `threshold_stability_state = STABLE`; `trust_band = GREEN`; `automation_level = ALLOWED`; `filing_readiness = READY_TO_SUBMIT`; no unresolved pre-trust human steps remain; no valid approved override is active

### Reason Codes

- `TRUST_GREEN`, `TRUST_AMBER`, `TRUST_RED`, `TRUST_INSUFFICIENT_DATA`, `TRUST_INPUT_INCOMPLETE`, `TRUST_INPUT_STALE`, `TRUST_INPUT_CONTRADICTION`, `TRUST_AUTHORITY_STATE_UNRESOLVED`, `TRUST_THRESHOLD_EDGE_REVIEW`, `TRUST_AUTOMATION_LIMITED`, `TRUST_REQUIRED_HUMAN_STEPS`, `TRUST_OVERRIDE_DEPENDENT_PROGRESS`, `TRUST_OVERRIDE_ACTIVE_NOTICE`, `TRUST_UPSTREAM_GATE_BLOCK`, `TRUST_UPSTREAM_GATE_REVIEW_REQUIRED`, `TRUST_UPSTREAM_GATE_NOTICE_ACTIVE`, `TRUST_ARTIFACT_INCONSISTENT`

### Normalization Notes

- TRUST_GATE may surface override-missing posture only when an already-documented upstream gate remains unresolved.
- Trust-derived red posture is not a new discretionary override family.
- TRUST_GATE may only mirror unresolved upstream override posture, never invent a synthetic trust override family.

## AMENDMENT_GATE

- Family: `amendment_progression`
- Overrideability: `SCOPED_OVERRIDE_REQUIRED`
- Inputs: `20`
- Reason codes: `15`
- Evaluation phase refs: `3`
- Consumer phase refs: `2`

Determine whether an amendment journey may begin or progress.

### Decision Table

- `HARD_BLOCK`: `(manifest mode is not COMPLIANCE)`; `(not confirmed_final_baseline)`; `(not exact_scope_baseline)`; `(not window_open)`; `(out_of_band_baseline_unresolved)`; `(baseline_reconcile_first_cap)`; `(not authority_prerequisites_ready)`; `(freshness_stale_for_submit)`; `(amendment_readiness_context.validation_outcome = HARD_BLOCK)`
- `OVERRIDABLE_BLOCK`: `(amendment_readiness_context.validation_outcome = OVERRIDABLE_BLOCK)`
- `MANUAL_REVIEW`: `(confirmed_final_baseline and exact_scope_baseline and window_open and not material_amendment_basis)`; `(baseline_review_only_cap)`; `(intent_required_but_incomplete)`; `(retroactive_prework_required)`; `(unresolved_source_contradiction)`; `(additional_validation_review)`; `(amendment_readiness_context.validation_outcome = MANUAL_REVIEW)`
- `PASS_WITH_NOTICE`: `(partial_scope_only)`; `(intent_flow_may_begin)`; `(supersedes_prior_chain)`; `(amendment_readiness_context.validation_outcome = PASS_WITH_NOTICE)`
- `PASS`: `(manifest mode is COMPLIANCE)`; `(confirmed_final_baseline)`; `(exact_scope_baseline)`; `(window_open)`; `(material_amendment_basis)`; `(RetroactiveImpactAnalysis is NONE or fully bounded and already incorporated into the current continuation path)`; `((not submit_scope) or (not intent_required_but_incomplete))`; `(no authority validation errors remain)`; `(not freshness_stale_for_submit)`

### Reason Codes

- `AMENDMENT_MANIFEST_MODE_ANALYSIS`, `AMENDMENT_NO_CONFIRMED_FINAL_DECLARATION`, `AMENDMENT_BASELINE_UNPROVEN`, `AMENDMENT_WINDOW_CLOSED`, `AMENDMENT_DRIFT_NOT_MATERIAL`, `AMENDMENT_INTENT_TO_AMEND_REQUIRED`, `AMENDMENT_INTENT_TO_AMEND_VALIDATION_FAILED`, `AMENDMENT_INTENT_TO_AMEND_OVERRIDE_REQUIRED`, `AMENDMENT_INTENT_TO_AMEND_REVIEW_REQUIRED`, `AMENDMENT_OUT_OF_BAND_BASELINE_UNRESOLVED`, `AMENDMENT_RETROACTIVE_REPLAY_REQUIRED`, `AMENDMENT_READINESS_STALE`, `AMENDMENT_CONTRADICTORY_DRIFT_SOURCES`, `AMENDMENT_SUPERSEDES_PRIOR_ACTIVE_CHAIN`, `AMENDMENT_ELIGIBLE`

### Normalization Notes

- AMENDMENT_GATE is deliberately not evaluated during drift preparation.
- The gate is the only family allowed to speak for intent-to-amend readiness failure.
- A narrow early-failure amendment-basis exception may emit AMENDMENT_GATE before the ordinary parity/trust sequence.

## FILING_GATE

- Family: `filing_progression`
- Overrideability: `SCOPED_OVERRIDE_REQUIRED`
- Inputs: `26`
- Reason codes: `32`
- Evaluation phase refs: `5`
- Consumer phase refs: `2`

Govern filing-capable progression.

### Decision Table

- `HARD_BLOCK`: any upstream gate returned `HARD_BLOCK`; access gate decision is not `ALLOW` or `ALLOW_MASKED` as appropriate; manifest mode is not `COMPLIANCE`; `filing_readiness_context.validation_outcome = HARD_BLOCK`; filing packet state is `VOID` or `SUPERSEDED`; filing packet is missing and there is no active pre-packet readiness context and no unresolved upstream gate posture that legitimately explains the pre-packet branch; a prepared filing packet is present but omits packet-local readiness lineage required for the selected filing path, or an approved packet path depends on notice settlement that has not been sealed into a packet-bound `FilingNoticeResolution`; trust is absent and `trust_currency_state != NOT_APPLICABLE_PRETRUST`; trust exists but is superseded, not bound to the current manifest scope, or `trust_currency_state = RECALC_REQUIRED`; authority link not active; obligation or tax-year context does not support the requested submission; required end-of-year preconditions are incomplete; amendment requested without an eligible baseline; `approval_state` is in `{UNSATISFIABLE, DENIED}`; `declared_basis_ack_state = UNSATISFIABLE`; any filing-critical late-data event after seal maps to a frozen source binding whose `late_data_policy_ref = SPAWN_CHILD_MANIFEST`; any filing-critical target is `UNSUPPORTED` or `CONTRADICTED`; controlling proof bundle is missing where filing posture exists; any filing-critical target has `closure_state = OPEN`; graph integrity summary indicates `rebuild_required = true`
- `OVERRIDABLE_BLOCK`: any upstream gate returned `OVERRIDABLE_BLOCK` and no valid approved override is active; `filing_readiness_context.validation_outcome = OVERRIDABLE_BLOCK`; filing depends on a scoped approved override not yet granted
- `MANUAL_REVIEW`: any upstream gate returned `MANUAL_REVIEW`; `filing_readiness_context.validation_outcome = MANUAL_REVIEW`; trust output requires review; parity output requires review; any filing-critical late-data event after seal maps to a frozen source binding whose `late_data_policy_ref = REVIEW_IF_LATE`; one or more filing-critical targets is `STALE` but not policy-routed to mandatory rebuild; explanation rendering failed for the controlling filing proof
- `PASS_WITH_NOTICE`: any upstream gate returned `PASS_WITH_NOTICE`; `filing_readiness_context.validation_outcome = PASS_WITH_NOTICE` and no filing packet has yet been prepared; `approval_state = REQUIRED_PENDING`; `declared_basis_ack_state = REQUIRED_PENDING`; `filing_notice_steps[]` is non-empty and every unresolved step is packet-local; trust or parity emitted non-blocking notices; a valid approved override is active and contributed to filing-capable progression; only non-critical late-data exists and every affected source binding has `late_data_policy_ref = EXCLUDE_LATE`
- `PASS`: no extra branch bullets

### Section Notes

- `declared_basis_ack_state = NOT_APPLICABLE` on a legitimate pre-packet branch SHALL not by itself create block or review
- a missing filing packet is legal only on an explicit pre-packet readiness branch
- when a filing packet exists, the packet contract is the source of truth for packet-local legality; operator or client UI state SHALL remain explanatory only
- a stale or invalidated trust artifact SHALL hard-block at `FILING_GATE`; filing-capable paths must resynthesize trust before they may proceed
- a valid approved override may unblock a scoped prerequisite, but it SHALL NOT upgrade the current filing decision above `PASS_WITH_NOTICE`; the gate SHALL emit explicit override-dependent notice reason codes and audit follow-up actions When multiple frozen source bindings are affected by late data, the gate SHALL evaluate each binding independently and return the highest-severity aggregate decision.

### Reason Codes

- `FILING_PACKET_UNAVAILABLE`, `FILING_MANIFEST_MODE_ANALYSIS`, `FILING_TRUST_MISSING`, `FILING_TRUST_SUPERSEDED`, `FILING_TRUST_RECALCULATION_REQUIRED`, `FILING_AUTHORITY_LINK_INACTIVE`, `FILING_OBLIGATION_NOT_OPEN`, `FILING_FINAL_DECLARATION_PRECONDITION_MISSING`, `FILING_AMENDMENT_BASELINE_MISSING`, `FILING_APPROVAL_REQUIRED`, `FILING_APPROVAL_UNSATISFIABLE`, `FILING_OVERRIDE_REQUIRED`, `FILING_OVERRIDE_ACTIVE_NOTICE`, `FILING_OVERRIDE_AUDIT_REQUIRED`, `FILING_DECLARED_BASIS_ACK_REQUIRED`, `FILING_DECLARED_BASIS_ACK_UNSATISFIABLE`, `FILING_NOTICE_REQUIRED`, `FILING_LATE_DATA_CHILD_MANIFEST_REQUIRED`, `FILING_LATE_DATA_REVIEW_REQUIRED`, `FILING_LATE_DATA_NONCRITICAL_EXCLUDED`, `FILING_PROOF_BUNDLE_MISSING`, `FILING_TARGET_UNSUPPORTED`, `FILING_TARGET_CONTRADICTED`, `FILING_PROOF_CLOSURE_OPEN`, `FILING_GRAPH_REBUILD_REQUIRED`, `FILING_EXPLANATION_FAILURE`, `FILING_PREPARATION_HARD_BLOCK`, `FILING_PREPARATION_OVERRIDE_REQUIRED`, `FILING_PREPARATION_REVIEW_REQUIRED`, `FILING_UPSTREAM_GATE_BLOCK`, `FILING_UPSTREAM_GATE_REVIEW_REQUIRED`, `FILING_UPSTREAM_GATE_NOTICE_ACTIVE`

### Normalization Notes

- FILING_GATE is monotone narrowing and SHALL NOT upgrade inherited legal progression.
- A valid approved override may unblock a scoped prerequisite but SHALL NOT upgrade the filing decision above PASS_WITH_NOTICE.
- FILING_GATE may appear on early filing-readiness failure branches before full trust synthesis completes.

## SUBMISSION_GATE

- Family: `submission_preflight`
- Overrideability: `NON_OVERRIDEABLE`
- Inputs: `15`
- Reason codes: `12`
- Evaluation phase refs: `1`
- Consumer phase refs: `1`



### Decision Table

- `HARD_BLOCK`: authority preflight reauthorization decision is not in `{ALLOW, ALLOW_MASKED}`; authority preflight manifest-state check failed; authority preflight token/client binding check failed; authority preflight approval-validity check failed; authority preflight declared-basis-ack validity check failed; filing packet manifest-binding hash does not equal the expected manifest-binding hash; idempotency key collides with a different packet body; a confirmed submission already exists for the same obligation and the current transmit is not an eligible amendment progression; runtime scope includes `amendment_submit` but amendment posture is absent or not in `READY_TO_AMEND`; authority link/token is invalid; filing packet is not `APPROVED_TO_SUBMIT`
- `MANUAL_REVIEW`: submission recovery or reconciliation is required before transmit
- `PASS_WITH_NOTICE`: the exact same packet and idempotency key already exist in a safe retriable state and the engine will perform idempotent recovery rather than a blind resend
- `PASS`: no extra branch bullets

### Reason Codes

- `SUBMISSION_REAUTHORIZATION_FAILED`, `SUBMISSION_MANIFEST_NOT_READY`, `SUBMISSION_APPROVAL_INVALID`, `SUBMISSION_DECLARED_BASIS_ACK_INVALID`, `SUBMISSION_PACKET_MANIFEST_BINDING_MISMATCH`, `SUBMISSION_PACKET_NOT_APPROVED`, `SUBMISSION_IDEMPOTENCY_BODY_COLLISION`, `SUBMISSION_PRIOR_CONFIRMED_EXISTS`, `SUBMISSION_AMENDMENT_NOT_READY`, `SUBMISSION_AUTHORITY_TOKEN_INVALID`, `SUBMISSION_PENDING_ALREADY_EXISTS`, `SUBMISSION_SAFE_IDEMPOTENT_RECOVERY`

### Normalization Notes

- Submission preflight re-runs authorization and authority-binding validity immediately before transmit.
