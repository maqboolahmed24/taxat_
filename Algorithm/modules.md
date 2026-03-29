# Module Contracts (named procedures)

These modules are the building blocks of the Core Engine. Each can be implemented independently,
but MUST preserve the invariants in `invariants_and_gates.md`.

## AUTHORIZE(...)
**Goal**: Decide whether `principal` may perform `action` on (tenant, client, period, scope), and when only a reduced or masked execution is allowed, return the exact runtime scope and masking policy that must bind the rest of the run.  
**Input**: principal attributes; resource attributes; environment attributes; action; `requested_scope[]`.  
**Output**:
- `decision` in `{ALLOW, ALLOW_MASKED, REQUIRE_STEP_UP, REQUIRE_APPROVAL, DENY}`
- `reason_codes[]`
- `effective_scope[]` (canonical ordered scope-token array; subset of `requested_scope[]`)
- `masking_rules[]`
- `required_approvals[]`
- `required_authn_level`

## ACCESS_BLOCKED_RESPONSE(...)
**Goal**: Return the non-manifest response for access outcomes that stop execution before manifest allocation, such as `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, or `DENY`.  
**Output**: access-blocked response payload with reason and next action hints. The response SHALL reuse the same low-noise posture grammar as the mounted observatory shell: `attention_state`, `plain_reason`, `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, ordered `detail_entry_points[]`, and `suggested_detail_surface_code`.  
**Invariant**:
- pre-manifest access exits SHALL preserve the same decision model as post-manifest UX; step-up or approval SHALL not force a different summary/action grammar
- when no safe legal action exists, the response SHALL emit explicit `NO_SAFE_ACTION` semantics plus the least-destructive investigation or recovery entry point

## VALIDATE_EFFECTIVE_SCOPE_BINDING(...)
**Goal**: Fail closed when post-authorization scope binding is empty, exceeds caller intent, or otherwise cannot safely drive execution.  
**Input**: canonical `requested_scope[]`; structured `access_decision`; canonical `runtime_scope[]`.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- `runtime_scope[]` SHALL be the single executable scope for downstream orchestration, compute, filing, and authority interaction
- invalid effective-scope binding SHALL return typed reason codes rather than relying on process-crashing `ASSERT(...)` checks
- the minimum structural failures are `RUNTIME_SCOPE_EMPTY` and `RUNTIME_SCOPE_NOT_SUBSET_OF_REQUEST`
- raw caller intent SHALL remain audit-only once `runtime_scope[]` has been validated

## ENFORCE_ACCESS_SCOPE_AND_MASKING(...)
**Goal**: Convert the structured access result into the exact runtime scope and bound masking context used by the engine after authorization.  
**Input**: canonical `requested_scope[]`; structured `access_decision`; `mode`.  
**Output**: `runtime_scope[]`, `masking_context`.  
**Invariant**:
- `runtime_scope[]` SHALL equal canonical `access_decision.effective_scope[]` when present, else canonical `requested_scope[]`.
- `runtime_scope[]` SHALL be non-empty and SHALL be a subset of `requested_scope[]`.
- `masking_context` is a projection-only redaction context.
- `runtime_scope[]` SHALL control execution semantics.
- `masking_context` SHALL control only human/view/export projections.
- Source planning, canonicalization, compute, parity, trust, filing-packet generation, authority-request canonicalization, request hashing, and transmit semantics SHALL use the full canonical facts required for the authorized tokens and SHALL NOT consume redacted bytes created solely for masked presentation.

## EVALUATE_GATE_CHAIN(...)
**Goal**: Execute the ordered non-access gate sequence in stage order as each gate's prerequisite artifacts become available.  
**Output**: ordered non-access `GateDecisionRecord` set with decision enum
`{PASS, PASS_WITH_NOTICE, MANUAL_REVIEW, OVERRIDABLE_BLOCK, HARD_BLOCK}` + next actions + override requirements.  
**Invariant**:
- Later gates never downgrade an earlier `HARD_BLOCK`.
- A gate SHALL not be skipped merely because its inputs arise later in the run.
- Gates evaluated after seal SHALL append manifest-linked gate records without rewriting the frozen manifest core.

## COMPUTE_SCOPE_FLAGS(...)
**Goal**: Normalize canonical `runtime_scope[]` into a single intent record consumed by the orchestrator and downstream gates.  
**Output**: `scope_flags` with `reporting_scope`, `wants_prepare_submission`, `wants_submit`, `wants_amendment_intent`, and `wants_amendment_submit`.  
**Invariant**:
- scope intent SHALL be derived once from canonical `runtime_scope[]` and reused downstream
- downstream logic SHALL NOT re-parse `runtime_scope[]` ad hoc in multiple branches

## VALIDATE_SCOPE_GRAMMAR(...)
**Goal**: Validate the canonical runtime scope before manifest lookup, config work, or stage allocation begins.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- invalid scope grammar SHALL fail closed with a typed response
- scope validation SHALL NOT rely on process-crashing `ASSERT(...)` checks for user-supplied or persisted inputs

## LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT(...)
**Goal**: Load a referenced prior manifest, derive its effective scope and access binding once, and validate tenant/client/period/mode/lineage compatibility before any continuation decision is made.  
**Output**: `status ∈ {ABSENT, VALID, INVALID}` + `prior_manifest`, `prior_effective_scope`, `prior_access_binding_hash`, `same_request_identity`, `continuation_decision`, `reason_code`.  
**Invariant**:
- if `manifest_id` is absent, return `ABSENT` without side effects
- compatibility failures SHALL return typed reason codes rather than relying on `ASSERT(...)`
- loaders SHALL reject any manifest whose duplicated top-level lineage projection diverges from `continuation_set{...}` rather than heuristically trusting one side
- `CONTINUATION_ALLOWED(...)` SHALL be evaluated at most once per request envelope for a given prior manifest

## VALIDATE_REUSE_SEALED_CONTEXT(...)
**Goal**: Confirm that same-manifest pre-start reuse is safe before the orchestrator binds to an existing sealed context.  
**Input**: `prior_manifest`.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- same-manifest reuse is legal only when no start lease has been taken, no output refs have been materialized, and no submission refs exist for the reused manifest
- invalid reuse SHALL fail closed with typed reasons rather than relying on `ASSERT(...)` checks over persisted state
- implementations SHALL surface `REUSED_SEALED_CONTEXT_MUTATED` when a supposedly reusable sealed manifest has already been opened or has materialized outputs/submissions

## DECIDE_MANIFEST_REUSE_STRATEGY(...)
**Goal**: Choose the orchestrator action for a validated prior context.  
**Output**: `action ∈ {NEW_MANIFEST, RETURN_EXISTING_BUNDLE, REUSE_SEALED_MANIFEST, REPLAY_CHILD, RECOVERY_CHILD, CONTINUATION_CHILD, NEW_REQUEST_CHILD}` + `continuation_basis`.  
**Invariant**:
- exact same-request terminal manifests SHALL return the existing `DecisionBundle` before any child-manifest allocation is considered
- exact same-request still-sealed manifests SHALL be reused before generic continuation logic
- `RECOVERY_CHILD` is legal only when no active start lease exists for the same attempt lineage

## RESOLVE_CONFIG(...)
**Goal**: Freeze rule/policy/config versions for the run.  
**Output**: config refs + thresholds + materiality boundaries + retention profile.  
**Invariant**: New live compliance runs must reference approved config versions; replay may
materialize from the prior frozen config set under the documented replay carve-out for
`DEPRECATED` or `REVOKED` versions.

## FREEZE_CONFIG(...)
**Goal**: Materialize a first-class `ConfigFreeze` with ordered config entries, provider versions, and freeze hashes.  
**Output**: config_freeze_id + config entries + config_freeze_hash.  
**Invariant**: No compliance artifact may be produced against floating configuration.

## LOAD_MANIFEST(...)
**Goal**: Load an existing `RunManifest` together with its frozen envelope, append-only outcome projections, and lineage metadata.  
**Output**: `RunManifest`.  
**Invariant**:
- `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, and `manifest_generation` SHALL byte-match their mirrors inside `continuation_set{...}`
- loader implementations SHALL reject `MANIFEST_LINEAGE_PROJECTION_MISMATCH` rather than choosing a preferred copy heuristically

## LOAD_CONFIG_FREEZE(...)
**Goal**: Load an already-frozen `ConfigFreeze` by reference for replay or continuation-safe reuse.  
**Output**: `ConfigFreeze`.

## CONTINUATION_REUSES_FROZEN_CONFIG(...)
**Goal**: Decide whether a child manifest may inherit the parent frozen config set rather than resolving a fresh config set.  
**Output**: boolean `reuse_parent_frozen_config` + `config_inheritance_mode ∈ {REPLAY_EXACT, RECOVERY_EXACT, FRESH_CHILD_RESOLUTION, HISTORICAL_EXPLICIT}`.  
**Invariant**:
- return `true` only for:
  - `run_kind = REPLAY` with `config_inheritance_mode = REPLAY_EXACT`
  - same-attempt recovery of an already-started manifest with `config_inheritance_mode = RECOVERY_EXACT`
  - an explicitly declared historical-config child branch recorded as `config_inheritance_mode = HISTORICAL_EXPLICIT`
- return `false` by default for amendment, remediation, drift-reassessment, analysis, and other continuation children, and record `config_inheritance_mode = FRESH_CHILD_RESOLUTION`
- inheriting a non-live compliance config set SHALL NOT authorize a new live filing-capable or amendment-capable progression unless the branch is `REPLAY` or same-attempt recovery

## MATERIALIZE_CFG_FROM_FREEZE(...)
**Goal**: Reconstruct the executable config view from a frozen `ConfigFreeze` without resolving fresh floating config.  
**Output**: config refs + thresholds + policy/materiality settings derived from the freeze.

## RESOLVE_CONFIG_FOR_REQUEST(...)
**Goal**: Resolve fresh config or inherit a parent frozen config according to continuation policy and the chosen manifest strategy.  
**Output**: executable `cfg`, optional inherited `cfg_freeze`, `schema_bundle_hash`, and optional `config_inheritance_mode ∈ {REPLAY_EXACT, RECOVERY_EXACT, FRESH_CHILD_RESOLUTION, HISTORICAL_EXPLICIT}`.  
**Invariant**:
- same-manifest pre-start reuse SHALL keep the previously frozen config set
- child-manifest inheritance SHALL be driven by `CONTINUATION_REUSES_FROZEN_CONFIG(...)`, not by the mere presence of `prior_manifest`
- amendment, remediation, drift-reassessment, analysis, and new-request continuation children SHALL default to `FRESH_CHILD_RESOLUTION`
- inherited non-live compliance config SHALL NOT authorize a new live filing-capable or amendment-capable progression outside the documented replay or same-attempt recovery carve-outs

## CONTINUATION_ALLOWED(...)
**Goal**: Decide whether a prior manifest may legally spawn a continuation child under the requested scope and run kind, including recovery after a started or failed run.  
**Output**: boolean + continuation basis/reason code.  
**Invariant**:
- return `false` when a same-request retry targets a terminal manifest whose persisted `DecisionBundle` can be reloaded idempotently; bundle reload has precedence over child creation
- recovery of an already-started attempt SHALL return `true` only when no active start lease remains for the same attempt lineage

## BEGIN_MANIFEST(...)
**Goal**: Create the `RunManifest` control object that captures the run envelope before freeze/seal transitions are applied.  
**Output**: `RunManifest`.  
**Invariant**: No artifact exists without being attached to exactly one manifest.

## BEGIN_CHILD_MANIFEST(...)
**Goal**: Create a child manifest for approved continuation, late-data branching, replay, remediation, started-run recovery, or amendment progression while preserving lineage.  
**Output**: child `RunManifest`.  
**Invariant**:
- parent/child lineage must be explicit; continuation never silently mutates the old manifest
- child manifests SHALL persist `continuation_basis` and `continuation_set.config_inheritance_mode` so lineage replay can distinguish replay-exact, recovery-exact, historical-explicit, and fresh-child resolution paths

## UPDATE_MANIFEST_PRESEAL_CONTEXT(...)
**Goal**: Persist pre-seal manifest fields that are allowed to change before seal, including access decision, config freeze identity, and continuation-set patches.  
**Output**: updated pre-seal manifest projection.  
**Invariant**:
- SHALL NOT rewrite a sealed manifest's frozen envelope
- SHALL record `continuation_set.config_inheritance_mode` whenever a child manifest inherits or intentionally does not inherit parent config
- when lineage fields are projected both top-level and inside `continuation_set{...}`, the write path SHALL update them atomically and preserve byte-identical values in both locations

## VALIDATE_MANIFEST_LINEAGE_PROJECTION(...)
**Goal**: Ensure duplicated lineage projection fields remain exact mirrors of `continuation_set{...}` before the manifest is reused, continued, sealed, or rendered.  
**Output**: `status ∈ {VALID, INVALID}` + typed `reason_code`.  
**Invariant**:
- duplicated lineage fields are read-model accelerators only and SHALL NOT become an alternate source of truth
- validation SHALL compare `root_manifest_id`, `parent_manifest_id`, `continuation_of_manifest_id`, `replay_of_manifest_id`, `supersedes_manifest_id`, and `manifest_generation` against `continuation_set{...}`
- divergence SHALL fail closed and open remediation rather than silently normalizing one copy

## LOAD_EXISTING_DECISION_BUNDLE(...)
**Goal**: Return the already-persisted outcome for a terminal manifest (`COMPLETED` or `BLOCKED`) when the same operation is retried against the same manifest envelope.  
**Output**: existing `DecisionBundle`.  
**Invariant**: Idempotent same-manifest retry never duplicates artifacts or submissions.

## LOAD_SEALED_RUN_CONTEXT(...)
**Goal**: Reload the previously persisted pre-start sealed execution context for a same-manifest retry without recollecting sources, rebuilding intake artifacts, or resealing the manifest.  
**Output**: `source_plan`, `source_window`, `collection_boundary`, `normalization_context`, authoritative intake artifact sets, `snapshot`, `input_freeze`, and the ordered pre-seal non-access gate record sequence.

## LOAD_SUBMISSION_LINEAGE(...)
**Goal**: Load known `SubmissionRecord` lineage relevant to the current manifest, including current-manifest refs plus parent/root/continuation-linked submission history needed for baseline and amendment decisions.  
**Output**: ordered submission-lineage refs.

## LOAD_AMENDMENT_CASE(...)
**Goal**: Load the active lineage-linked `AmendmentCase` for the current client/period when amendment submission or reassessment depends on previously persisted intent-to-amend state.  
**Output**: `AmendmentCase` or `None`.

## TRANSITION_MANIFEST(...)
**Goal**: Apply one named lifecycle transition to `RunManifest` and fail closed if the transition is illegal for the current state.  
**Output**: updated manifest lifecycle state.  
**Invariant**: Manifest lifecycle changes occur only through the state machine in `state_machines.md`.

## CLAIM_MANIFEST_START(...)
**Goal**: Atomically claim the right to execute a `SEALED` manifest under a single-writer lease and,
on success, perform the legal `run_started` transition.  
**Output**: status in `{CLAIMED, ALREADY_TERMINAL, ALREADY_ACTIVE}` + updated manifest/lease refs.  
**Invariant**:
- only one live writer may claim a given sealed manifest at a time
- the `SEALED -> IN_PROGRESS` transition SHALL be compare-and-swap protected
- a failed claim SHALL prevent execution and SHALL NOT duplicate artifacts or submissions
- a recovery child SHALL NOT be created while another active start lease still exists for the same
  attempt lineage

## UPDATE_MANIFEST_GATES(...)
**Goal**: Rebuild or synchronize the manifest's gate-outcome projection from persisted `GateDecisionRecord`s without mutating the underlying gate records. Incremental post-seal writes SHALL use `APPEND_MANIFEST_GATES(...)`.  
**Output**: updated manifest gate summary.

## APPEND_MANIFEST_GATES(...)
**Goal**: Append post-seal `GateDecisionRecord` refs for later ordered gates whose inputs arise only after seal.  
**Output**: updated manifest gate summary / ordered gate refs.  
**Invariant**:
- append-only; never rewrite earlier gate records
- never alter sealed scope, config freeze, input freeze, deterministic seed, or manifest hash
- later gate refs remain ordered and replayable

## PERSIST_GATE_BATCH(...)
**Goal**: Persist an ordered batch of `GateDecisionRecord`s and emit the paired `GateEvaluated` events in one transaction-safe unit.  
**Output**: persisted ordered gate refs.  
**Invariant**:
- supplied order SHALL be preserved exactly
- a batch of one SHALL be semantically identical to single-record persistence
- batch persistence SHALL NOT reorder pre-seal vs post-seal gate families

## UPDATE_MANIFEST_OUTPUTS(...)
**Goal**: Append or synchronize post-seal manifest outcome projections such as `output_refs`, `audit_refs`, `submission_refs`, `drift_refs`, and related top-level refs without altering the frozen execution envelope.  
**Output**: updated manifest outcome projection.

## APPLY_EXECUTION_MODE_STAMP(...)
**Goal**: Attach the common execution-context field group to a derived artifact before persistence.  
**Output**: stamped artifact.  
**Invariant**:
- for `mode = COMPLIANCE`:
  - `analysis_only = false`
  - `non_compliance_config_refs[] = []`
  - `counterfactual_basis = None`
- for `mode = ANALYSIS`:
  - `analysis_only = true`
  - `non_compliance_config_refs[]` SHALL identify every frozen config entry whose status-at-freeze is
    not compliance-live for the modeled action
  - `counterfactual_basis` SHALL record the modeled/non-live basis for the run
- every derived artifact persisted after manifest allocation SHALL carry this field group, whether the
  caller applies the stamp explicitly or the callee persists the artifact internally

## PERSIST_DECISION_BUNDLE(...)
**Goal**: Persist the terminal or review `DecisionBundle`, stamp `persisted_at`, compute `decision_bundle_hash`, and synchronize any top-level bundle refs into the manifest's append-only outcome projection.  
**Output**: persisted `DecisionBundle`.

## FINALIZE_TERMINAL_OUTCOME(...)
**Goal**: Normalize every blocked, review-required, or completed return after manifest allocation.
The helper SHALL apply the legal manifest lifecycle transition before persistence:
- `decision_status = BLOCKED` while manifest is `FROZEN` -> `seal_blocked`
- `decision_status = BLOCKED` while manifest is `IN_PROGRESS` -> `gate_block`
- `decision_status = REVIEW_REQUIRED` -> `run_completed`
- `decision_status = COMPLETED` -> `run_completed`

Review-required outcomes SHALL therefore persist `RunManifest.lifecycle_state = COMPLETED` while
preserving `DecisionBundle.decision_status = REVIEW_REQUIRED`.
Review posture SHALL be carried by gate records, trust posture, and workflow items, not by a blocked
manifest lifecycle state.

If the helper is invoked with `decision_status = REVIEW_REQUIRED` before the manifest has entered
`IN_PROGRESS`, it SHALL fail closed unless the caller first progresses the manifest legally into run
execution.

Before finalizing, the helper SHALL ensure that every object reference carried in the supplied
`DecisionBundle`, `terminal_reasons`, or `gate_records` is already durably persisted. For pre-start
blocked outcomes this SHALL include persisting the supplied snapshot/input/gate artifacts through
`PERSIST_PRESTART_TERMINAL_CONTEXT(...)` or an equivalent transactional persistence step before the
bundle is written.

The helper SHALL derive and persist required `ErrorRecord` / `RemediationTask` objects from terminal
reasons, emit the manifest lifecycle audit event implied by the terminal decision (`ManifestBlocked`
or `ManifestCompleted`), release any active manifest-start lease, apply retention and observability
across the currently materialized manifest refs, and normalize the bundle's replay-safe UX bridge
before persistence. That normalization SHALL preserve backward-compatible `decision_status` while also
backfilling `decision_bundle_id`, `artifact_type = DecisionBundle`, the common execution-context
field group, `decision_reason_codes[]`, `outcome_class`, `waiting_on`, `checkpoint_state`,
`truth_state`, `plain_reason`, `reason_codes[]`, `next_action_codes[]`, `blocked_action_codes[]`,
`next_checkpoint_at`, and `persisted_at` from terminal reasons, gate records, workflow posture, and
known authority posture. When `manifest.output_refs{}` already contains `filing_case_id` or
`amendment_case_id`,
the helper SHALL copy those refs into the bundle unless the caller supplied a more specific value.
It SHALL also attach artifact-contract metadata before persistence. The helper SHALL then persist the
supplied `DecisionBundle`, synchronize `decision_bundle_hash`, and return the persisted bundle.  
**Output**: persisted `DecisionBundle`.

## FINALIZE_RUN_FAILURE(...)
**Goal**: Normalize an unhandled system fault after manifest allocation.  
The helper SHALL transition `RunManifest` with `system_fault` when legal, persist the normalized
`ErrorRecord`, release any active manifest-start lease, emit `ManifestFailed`, apply retention and
observability across already materialized refs, and return a manifest-linked failure response.  
**Output**: failure response linked to `manifest_id` and `error_id`.

## PERSIST_PRESTART_TERMINAL_CONTEXT(...)
**Goal**: Persist the minimum authoritative artifact pack required to explain and defend a blocked
pre-start outcome before the run ever enters `IN_PROGRESS`.  
**Output**: persisted refs for snapshot, input freeze, boundary artifacts, and ordered pre-seal gate records.  
**Invariant**:
- no pre-start blocked `DecisionBundle` may reference a snapshot, input freeze, or gate record that
  has not already been durably persisted
- the helper SHALL persist its artifact set transactionally or fail closed
- the helper SHALL NOT mark the manifest `SEALED`

## PLAN_SOURCE_COLLECTION(...)
**Goal**: Build a required-domain source plan before canonicalization begins.  
**Output**: `source_plan` with source classes, partitions, read model, cursor strategy, late-data policy, and completeness expectations.
**Invariant**:
- planning SHALL bind to `runtime_scope[]` and frozen connector/input policy
- projection masking SHALL NOT remove source domains or fields required to execute the authorized tokens

## COLLECT_SOURCES(...)
**Goal**: Fetch raw payloads via the controlled gateway according to `source_plan`.  
**Output**: `raw_batch` + page/request audit refs.  
**Invariant**: Never access providers directly from application code.

## FREEZE_COLLECTION_BOUNDARY(...)
**Goal**: Freeze the source completeness and read boundary before canonicalization.  
**Output**: `collection_boundary` with `source_window_id`, read cutoff, provider version set, connector build/profile refs, cursor checkpoints, request audit refs, completeness expectations, and late-data policy.

## LATE_DATA_INDICATORS(...)
**Goal**: Derive late-arrival indicators and policy-relevant source freshness signals from the frozen source plan and collection boundary.  
**Output**: late-data indicator set.

## MATERIALIZE_SOURCE_WINDOW(...)
**Goal**: Materialize the frozen collection interval as a first-class `SourceWindow` artifact.  
**Output**: `source_window`.

## MATERIALIZE_SOURCE_RECORDS(...)
**Goal**: Convert frozen raw payloads into first-class `SourceRecord` artifacts.  
**Output**: `source_records`.

## MATERIALIZE_EVIDENCE_ITEMS(...)
**Goal**: Create first-class `EvidenceItem` artifacts from source records and extraction rules.  
**Output**: `evidence_items`.

## EXTRACT_CANDIDATE_FACTS(...)
**Goal**: Extract normalized `CandidateFact` artifacts from source records and evidence items.  
**Output**: `candidate_facts`.

## DETECT_CONFLICTS(...)
**Goal**: Persist first-class `ConflictRecord` artifacts for unresolved inconsistencies.  
**Output**: `conflicts`.

## PROMOTE_CANONICAL_FACTS(...)
**Goal**: Promote eligible candidates into first-class `CanonicalFact` artifacts under promotion rules.  
**Output**: `canonical_facts`.

## BUILD_ARTIFACT_SET(...)
**Goal**: Wrap artifact lists into first-class set artifacts with deterministic ordering and stable set identity.  
**Output**: typed set artifact (for example `SourceRecordSet`, `EvidenceItemSet`, `CandidateFactSet`, `ConflictSet`, `CanonicalFactSet`).

## WRAP_AND_HASH(...)
**Goal**: Build a typed artifact set and compute deterministic `set_hash` and `artifact_contract_hash`.  
**Output**: typed set artifact with hashing fields ready for contract validation.

## FREEZE_NORMALIZATION_CONTEXT(...)
**Goal**: Freeze mapping, evidence, promotion, and normalization rules used for candidate/canonical formation into a first-class artifact.  
**Output**: `normalization_context` + normalization context hash.

## DECLARED_EXCLUSIONS(...)
**Goal**: Materialize the explicit exclusion declarations attached to the frozen input set.  
**Output**: exclusion declaration set.

## DECLARE_MISSING_SOURCES(...)
**Goal**: Declare source domains that were required but not present inside the frozen collection boundary.  
**Output**: missing-source declaration set.

## DECLARE_STALE_SOURCES(...)
**Goal**: Declare source domains whose freshness state violates the frozen freshness policy.  
**Output**: stale-source declaration set.

## FREEZE_INPUT_SET(...)
**Goal**: Freeze the exact source/evidence/candidate/canonical/conflict population and authoritative artifact-contract set in scope for the run, together with the exact frozen `source_plan_ref`, `source_window_ref`, and per-source `late_data_policy_bindings[]`.  
**Input**: `manifest`, `source_plan`, `source_window`, `collection_boundary`, authoritative record/fact sets, exclusion declarations, missing/stale declarations, normalization context, `artifact_contract_refs[]`, and `artifact_contract_hash`.  
**Output**: `input_freeze` with `source_plan_ref`, `source_window_ref`, `collection_boundary_ref`, `late_data_policy_bindings[]`, `input_set_hash`, exclusion/missing/stale declarations, normalization context ref/hash, `artifact_contract_refs[]`, and `artifact_contract_hash`.

## COLLECTION_LATE_DATA_BINDINGS(...)
**Goal**: Project the ordered set of frozen late-data policy bindings that apply to the current runtime scope from the frozen collection boundary.  
**Output**: ordered binding records keyed by `source_domain` and the applicable partition/scope refs.

## LOAD_SCHEMA_BUNDLE(...)
**Goal**: Load the frozen schema bundle by `schema_bundle_hash` and expose versioned artifact contracts for intake-boundary and intake-data artifacts.  
**Output**: `schema_bundle` with schema metadata (`schema_id`, `artifact_type`, `semantic_version`, `content_hash`, compatibility metadata).

## VALIDATE_ARTIFACT_SET(...)
**Goal**: Validate each intake artifact set against the frozen set schema before authoritative use.  
**Output**: validation result + `artifact_contract_hash`.
**Invariant**: Leaf schemas are closed with `additionalProperties: false`; composed schemas are closed with `unevaluatedProperties: false`.

## VALIDATE_ARTIFACT(...)
**Goal**: Validate a single authoritative artifact against the frozen schema for its artifact type.  
**Output**: validation result + artifact contract metadata.

## RECORD_ARTIFACT_CONTRACT_REF(...)
**Goal**: Persist the contract reference for one authoritative intake-boundary artifact.  
**Output**: single contract ref for `SourcePlan`, `SourceWindow`, `CollectionBoundary`, or `NormalizationContext`.

## RECORD_ARTIFACT_CONTRACT_REFS(...)
**Goal**: Persist contract references for the authoritative intake-data artifact sets included in `InputFreeze`.  
**Output**: `artifact_contract_refs[]` + ordered `artifact_contract_hashes[]`.

## ARTIFACT_CONTRACT_GATE(...)
**Goal**: Fail closed when intake-boundary or intake-data artifacts are unvalidated, schema-mismatched, or version-incompatible for the frozen bundle.  
**Output**: non-access `GateDecisionRecord` with decision enum
`{PASS, PASS_WITH_NOTICE, MANUAL_REVIEW, OVERRIDABLE_BLOCK, HARD_BLOCK}`.

## MANIFEST_GATE(...)
**Goal**: Verify that the manifest envelope, lineage, build refs, and freeze state are valid
for the ordered pre-seal compliance gate chain and that the manifest is ready to be sealed
into a reproducible execution envelope.  
**Output**: non-access `GateDecisionRecord`.
**Invariant**:
- `MANIFEST_GATE` is a pre-seal gate, not a post-seal gate
- it runs while `RunManifest.lifecycle_state == FROZEN`
- sealed-state checks required before authority calls are enforced separately by the authority
  interaction preflight sequence

## INPUT_BOUNDARY_GATE(...)
**Goal**: Verify that the frozen input boundary, late-data policy, and exclusion declarations remain valid for this manifest.  
**Output**: non-access `GateDecisionRecord`.

## DATA_QUALITY_GATE(...)
**Goal**: Convert snapshot quality and completeness posture into a policy-governed non-access gate decision.  
**Output**: non-access `GateDecisionRecord`.

## SEAL_MANIFEST(...)
**Goal**: Seal manifest scope, build refs, config freeze, input freeze, deterministic controls, and the gate results required before seal before filing-capable outputs.  
**Output**: sealed manifest state.  
**Invariant**:
- sealed manifest fields do not drift silently after seal
- later gate refs may append without changing the frozen manifest core
- `SEAL_MANIFEST(...)` persists the successful pre-seal gate chain; it does not retroactively
  reinterpret `MANIFEST_GATE` as a post-seal check

## WRITE_ARTIFACT(...)
**Goal**: Persist one first-class artifact under exactly one manifest with the correct retention and contract metadata.  
**Output**: persisted artifact reference.

## RECORD_EVENT(...)
**Goal**: Persist the named lifecycle or protocol event for the manifest and linked objects; implementations MAY realize this via `AuditEvent`. Manifest-scoped events SHALL append their audit refs to `RunManifest.audit_refs[]`.  
**Output**: event/audit reference.

## RETENTION_TAG(...)
**Goal**: Resolve the retention class and tagging metadata to apply when an artifact is persisted.  
**Output**: `RetentionTag` or equivalent retention-tag reference.

## BUILD_SNAPSHOT(...)
**Goal**: Build a snapshot from first-class intake artifacts.  
**Output**: snapshot + refs to source, evidence, candidate, canonical, and conflict sets.

## VALIDATE / MEASURE_COMPLETENESS(...)
**Goal**: Identify invalid data and incompleteness explicitly.  
**Output**: quality flags, completeness metrics, incomplete domain set.

## VALIDATE(...)
**Goal**: Validate one authoritative artifact or composite artifact against the frozen rules/profile in context.  
**Output**: validation result.

## MEASURE_COMPLETENESS(...)
**Goal**: Measure completeness of the snapshot or required-domain set against the frozen completeness rules.  
**Output**: completeness metrics.

## SCORE_GRAPH_QUALITY(...)
**Goal**: Score provenance coverage, critical-path completeness, and retention limitations for the built evidence graph.  
**Output**: graph quality summary.

## COMPUTE_OUTCOME(...) / FORECAST(...)
**Goal**: Produce liability/obligation figures; optionally forecast.  
**Output**: compute result, forecast scenarios.  
**Invariant**: Forecast must not mutate compliance artifacts.

## FORECAST(...)
**Goal**: Produce deterministic analysis-only forecast scenarios from the frozen snapshot and compute result.  
**Output**: `ForecastSet`.

## SEED(...)
**Goal**: Derive a deterministic seed only from frozen deterministic-seed controls and module-local forecast or analysis inputs; `manifest_id` alone SHALL never perturb the seed, and wall-clock randomness is forbidden.  
**Output**: deterministic seed value.

## SCORE_RISK(...)
**Goal**: Generate deterministic feature-level risk flags and a normalized `risk_score` under the
frozen `risk_threshold_profile_ref`, plus `unresolved_material_blocking_risk_flag` for trust
synthesis and workflow gating.  

## EVALUATE_PARITY(...)
**Goal**: Compare computed values against authority values / previously submitted values.  

## RETENTION_EVIDENCE_GATE(...)
**Goal**: Gate filing-capable progression on provenance coverage, critical-path explainability, and retention limitations.  
**Output**: non-access `GateDecisionRecord`.

## PARITY_GATE(...)
**Goal**: Convert parity outcomes into a filing/governance gate decision under the frozen parity policy.  
**Output**: non-access `GateDecisionRecord`.

## LOAD_OVERRIDES(...)
**Goal**: Load active approved overrides that are in scope for the current manifest, gate family, or filing action, optionally constrained to request-supplied `override_refs[]`.  
**Output**: ordered override set.

## EXTRACT_AUTHORITY_VIEWS(...)
**Goal**: Derive authority comparison views from the frozen intake artifacts within collection boundary scope.  
**Output**: authority view refs for parity and reconciliation.

## LOAD_AUTHORITY_STATE(...)
**Goal**: Materialize the best current authority-grounded state for baseline, reconciliation, filing, and amendment decisions from authority views plus known submission lineage.  
**Output**: authority state summary suitable for drift and filing decisions.

## OBLIGATION_STATUS(...)
**Goal**: Project a normalized obligation-status value from the authority-state summary for filing gating.  
**Output**: obligation status enum.

## AUTHORITY_LINK_STATE(...)
**Goal**: Project whether the principal and client currently have the authority-link prerequisites required for the requested operation.  
**Output**: authority-link state enum.

## APPROVAL_STATE(...)
**Goal**: Evaluate approval posture for either the pre-trust phase or the packet phase.  
**Input**: principal, authorized `runtime_scope[]`, `required_approvals[]`, optional `packet`, and
`phase in {PRE_TRUST, PACKET}`.  
**Output**: one of `{NOT_REQUIRED, SATISFIED, REQUIRED_PENDING, UNSATISFIABLE, DENIED}`.  
**Rules**:
- when `phase = PRE_TRUST`, packet-local approvals SHALL NOT yield `REQUIRED_PENDING`; they SHALL be
  deferred until packet build
- when `phase = PACKET`, unresolved packet-local approvals that can still be satisfied through the
  filing-notice flow SHALL yield `REQUIRED_PENDING`

## DECLARED_BASIS_ACK_STATE(...)
**Goal**: Evaluate declaration-basis acknowledgement posture for the concrete filing packet.  
**Input**: principal, authorized `runtime_scope[]`, `packet`.  
**Output**: one of `{NOT_APPLICABLE, NOT_REQUIRED, SATISFIED, REQUIRED_PENDING, UNSATISFIABLE}`.  
**Rules**:
- this module SHALL be evaluated only after `BUILD_FILING_PACKET(...)`
- callers on a legitimate pre-packet path SHALL treat the acknowledgement state as `NOT_APPLICABLE`

## DERIVE_REQUIRED_HUMAN_STEPS(...)
**Goal**: Produce only the pre-trust human-step catalog from the current runtime scope, mode, authority state,
authority-link posture, pre-trust approval posture, parity posture, and amendment posture.  
**Output**: ordered step records with:
- `step_code`
- `reason_codes[]`
- `scope_refs[]`  
**Rule**:
- this module SHALL NOT emit packet-local declaration-basis, disclaimer, or packet-local approval steps
- packet-local notice steps SHALL be emitted only by `DERIVE_PACKET_NOTICE_STEPS(...)` after
  `BUILD_FILING_PACKET(...)`

## DERIVE_PACKET_NOTICE_STEPS(...)
**Goal**: Derive packet-local declaration-basis, disclaimer, and packet-local approval notice steps
from a `PREPARED` filing packet plus the current actor state.  
**Input**: `packet`, principal, authorized `runtime_scope[]`, packet-phase `approval_state`,
packet-phase `declared_basis_ack_state`, `required_approvals[]`.  
**Output**: ordered packet-local step records with:
- `step_code`
- `reason_codes[]`
- `scope_refs[]`
- `packet_refs[]`

## SYNTHESIZE_TRUST(...)
**Goal**: Convert quality, parity, risk, graph/defence quality, required human steps, and override reliance into one actionable trust posture:
- trust_band (machine-facing)
- trust_level (human-facing)
- automation_level (for autopilot)
- filing_readiness (for submission)
**Input note**:
- `required_human_steps[]` consumed by trust SHALL include only pre-trust human steps
- `baseline_submission_state` and `live_authority_progression_requested` SHALL be explicit inputs;
  trust SHALL NOT infer legal progression posture from UI state or packet-local state
- the `risk` input SHALL expose at least `risk_score` and `unresolved_material_blocking_risk_flag`
- packet-local declaration-basis, disclaimer, and packet-local approval notices SHALL NOT be
  inputs to trust synthesis
- packet-local notice steps SHALL instead be derived only after packet build and carried to
  `FILING_GATE(...)` and `RESOLVE_FILING_NOTICES(...)`

## TRUST_GATE(...)
**Goal**: Convert the synthesized trust posture, upstream gate posture, and unresolved pre-trust
human steps into a non-access gate decision for review, filing, or block progression.  
**Output**: non-access `GateDecisionRecord`.

## BUILD_EVIDENCE_GRAPH(...)
**Goal**: Build a manifest-scoped provenance graph with stable node/edge ids, critical paths, and support semantics.  
**Output**: `EvidenceGraph` + critical path projection + graph address refs.  
**Invariant**:
- canonical graph semantics SHALL be derived from unmasked canonical facts
- any `projection_masking_context` SHALL affect only rendered/projection views of the graph, not its
  canonical support semantics

## GET_PROVENANCE(...)
**Goal**: Return graph projections, defence paths, authority-state paths, drift paths, or retention-limitation paths for a target object.  
**Output**: manifest-safe provenance query response.

## GENERATE_ENQUIRY_PACK(...)
**Goal**: Render a deterministic enquiry pack from graph critical paths, evidence refs, config refs, authority refs, and limitation notes.  
**Output**: human-readable and machine-readable enquiry pack.

## BUILD_TWIN_VIEW(...)
**Goal**: Render a time-aware, cross-source compliance view that highlights deltas and readiness.  
**Invariant**:
- canonical twin semantics SHALL be derived from unmasked canonical facts
- any `projection_masking_context` SHALL affect only the rendered view

## PLAN_WORKFLOW(...)
**Goal**: Produce prioritized work items from gate decisions, trust posture, parity/risk outcomes, and drift/amendment posture with lineage references.

## UPSERT_WORKFLOW_ITEMS(...)
**Goal**: Create, update, or supersede workflow items deterministically from the current planned action set.  
**Output**: workflow item refs.

## UPSERT_FILING_CASE(...)
**Goal**: Persist or advance the filing-case artifact from current manifest posture, trust/parity readiness, packet state, submission state, and amendment posture, including any calculation-basis refs used for final declaration or amendment flows.  
**Output**: `FilingCase`.  
**Invariant**:
- persisted filing-case artifacts SHALL carry the common execution-context field group

## BUILD_FILING_PACKET(...)
**Goal**: Produce a structured filing packet in `PREPARED` state with declared basis and required disclaimers.  
**Invariant**:
- filing-packet bytes SHALL derive from canonical unmasked facts required for the authorized tokens
- projection masking is not an execution transform and SHALL NOT alter packet payload bytes

## FILING_GATE(...)
**Goal**: Govern filing-capable progression across both:
- a prepared filing-packet path, and
- a pre-packet readiness path such as trust-blocked progression, amendment-blocked progression, or a
  failed/review-required `intent-to-finalise` calculation.  
**Input**:
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
- declaration-basis acknowledgement state, which may be `NOT_APPLICABLE` on pre-packet paths
- authorized `runtime_scope[]`
- amendment posture
- active overrides
- `filing_notice_steps[]`
- `late_data_status`
- `late_data_policy_bindings[]`
- optional `filing_readiness_context` from pre-packet filing preparation  
**Output**: non-access `GateDecisionRecord`.  
**Invariant**:
- every filing-capable terminal or review-required outcome SHALL have a `FILING_GATE` record, even when
  no filing packet could be prepared
- analysis-mode manifests SHALL hard-block here for any filing-capable action token
- a null filing packet is legal only on an explicit pre-packet readiness branch
- for `amendment_submit`, `AMENDMENT_GATE` posture SHALL remain upstream input to `FILING_GATE` so the
  filing-capable terminal decision still emits a `FILING_GATE` record

## RESOLVE_FILING_NOTICES(...)
**Goal**: Resolve packet-local declaration-basis, disclaimer, and packet-local approval notices for a `PREPARED` filing packet before promotion to `APPROVED_TO_SUBMIT`.  
**Input**: `packet`, `principal`, authorized `runtime_scope[]`, packet-local `filing_notice_steps[]`.  
**Output**: `notice_requirements_satisfied` + updated packet-phase approval state + updated packet-phase
declaration-basis acknowledgement state + notice refs.

## APPROVE_FILING_PACKET(...)
**Goal**: Promote a `PREPARED` filing packet to `APPROVED_TO_SUBMIT` once filing-gate, approval, acknowledgement, and any `PASS_WITH_NOTICE` notice-resolution requirements are satisfied.  
**Output**: filing packet in `APPROVED_TO_SUBMIT` state.

## TRANSITION_FILING_PACKET(...)
**Goal**: Apply a named filing-packet lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `FilingPacket`.

## EXECUTE_AUTHORITY_CALCULATION_FLOW(...)
**Goal**: Execute the authority calculation handshake for flows that require an authority-grounded calculation basis, including trigger, retrieve, user confirmation, and basis capture.  
**Output**: `calculation_request_ref`, `calculation_id`, `calculation_type`, `calculation_hash`,
`calculation_basis_ref`, `user_confirmation_ref`, `validation_outcome`, `reason_codes[]`,
`live_authority_call_executed`.  
**Invariant**:
- For end-of-year final declaration flows, this module must execute the authority calculation path before a final-declaration filing packet is prepared for submission.
- For amendment flows, this module must execute the `intent-to-amend` path before confirm-amendment submission is permitted.
- The module SHALL first evaluate any supplied `local_precondition_context`. When local preconditions
  already prove the calculation is illegal, unavailable, or non-live, the module SHALL return a
  modeled non-`PASS` outcome without emitting authority request/response artifacts.
- Before any live authority interaction, the module SHALL execute `AUTHORITY_PREFLIGHT(...)`.
- In `mode = ANALYSIS`, the module SHALL NOT issue live authority traffic unless the frozen provider
  contract explicitly declares the specific calculation path `read_only_analysis_allowed = true`.
  Otherwise the module SHALL return a modeled `HARD_BLOCK` with reason
  `AUTHORITY_LIVE_CALL_FORBIDDEN_IN_ANALYSIS` and `live_authority_call_executed = false`.
- Callers SHALL persist the returned calculation/basis refs on a `FilingCase`, `AmendmentCase`, or equivalent first-class artifact before packet build or terminal outcome decisions rely on them.
- Callers SHALL not terminate a filing-capable run directly from a pre-packet filing-readiness `validation_outcome`; they SHALL route that result through `FILING_GATE(...)` so the gate chain remains explicit and auditable.
- Callers SHALL not terminate an amendment-capable run directly from raw `intent-to-amend` `validation_outcome`; they SHALL persist the returned context on `AmendmentCase` and route any non-`PASS` outcome through `AMENDMENT_GATE(...)`, never through `FILING_GATE(...)`.
- If an `intent-to-amend` calculation was already executed earlier in the same manifest run, later
  amendment-stage logic SHALL reuse the persisted calculation context instead of re-triggering the
  authority call.

## AUTHORITY_PREFLIGHT(...)
**Goal**: Execute the mandatory post-seal authority preflight immediately before any live authority
calculation or submission path.  
**Output**:
- `reauthorization_decision`
- `manifest_state_ok`
- `binding_valid`
- `approval_valid`
- `declared_basis_ack_valid`
- `operation`
- `binding`
**Invariant**:
- the helper SHALL re-run `AUTHORIZE(...)` for the live authority action
- the helper SHALL verify `RunManifest.lifecycle_state in {SEALED, IN_PROGRESS}` for compliance-capable
  live authority operations
- the helper SHALL resolve the frozen `AuthorityOperationProfile` and `AuthorityBinding`
- the helper SHALL verify token/client binding and required approvals/acknowledgements before any live
  authority call is attempted
- the helper SHALL be used inside `EXECUTE_AUTHORITY_CALCULATION_FLOW(...)` and immediately before any
  submission-path request canonicalization/build/transmit sequence

## RESOLVE_AUTHORITY_OPERATION(...)
**Goal**: Materialize the intended authority action under a frozen authority operation profile.  
**Output**: `AuthorityOperation` + profile refs + target obligation/basis context.  
**Invariant**:
- the materialized `AuthorityOperation` SHALL preserve raw `requested_scope[]` for audit, but SHALL also stamp the authorized `runtime_scope[]` that drives request identity, duplicate handling, and live authority legality
- downstream request hashing, duplicate prevention, and amendment eligibility SHALL read only the authorized executable scope, never raw caller intent

## RESOLVE_AUTHORITY_BINDING(...)
**Goal**: Bind the request to the correct authority link, token context, client scope, and provider version.  
**Output**: `AuthorityBinding`.  
**Invariant**: Ambiguous token-to-client binding fails closed.

## CANONICALIZE_AUTHORITY_REQUEST(...)
**Goal**: Produce canonical path, canonical query, canonical payload bytes, and header-profile refs for
an authority request before the sealed envelope is materialized.  
**Output**: canonical request material.  
**Invariant**:
- canonical request material SHALL be derived from preflight-resolved operation/binding and canonical
  unmasked packet bytes
- projection masking SHALL NOT alter canonical request bytes, request hashes, or idempotency keys

## DERIVE_AUTHORITY_REQUEST_HASHES(...)
**Goal**: Compute `request_body_hash`, `request_hash`, and authority-attempt `idempotency_key` from
canonical request material plus the manifest access binding.  
**Input**: manifest lineage, operation, binding, canonical request material (`http_method`,
`canonical_path`, `canonical_query`, ordered `header_profile_refs[]`, canonical payload bytes), and
`access_binding_hash`.  
**Output**: `request_body_hash`, `request_hash`, `idempotency_key`.

## BUILD_AUTHORITY_REQUEST_ENVELOPE(...)
**Goal**: Construct the sealed authority request only after canonical request material and all derived
identity fields are already known, including `request_body_hash`, `request_hash`, `idempotency_key`,
`access_binding_hash`, `canonical_path`, `canonical_query`, and fraud-header profile refs.  
**Output**: `AuthorityRequestEnvelope`.  
**Invariant**:
- an `AuthorityRequestEnvelope` SHALL NOT be materialized or written without populated
  `request_body_hash`, `request_hash`, `idempotency_key`, and `access_binding_hash`

## BEGIN_SUBMISSION_RECORD(...)
**Goal**: Create the initial `SubmissionRecord` for one authority transmit attempt before the request leaves the engine.  
**Output**: `SubmissionRecord` in `INTENT_RECORDED`.

## TRANSITION_SUBMISSION_RECORD(...)
**Goal**: Apply one named `SubmissionRecord` lifecycle transition and fail closed if the transition is illegal.  
**Output**: updated `SubmissionRecord`.

## EXISTING_SUBMISSIONS(...)
**Goal**: Load existing `SubmissionRecord`s for the same authority meaning, obligation, and operation family before transmit.  
**Output**: ordered submission lineage set.

## RECOVER_SUBMISSION_ATTEMPT(...)
**Goal**: Reuse the already-persisted request/response/submission lineage for a safe idempotent retry instead of transmitting a duplicate authority request.  
**Output**: recovered request/response refs + `SubmissionRecord` + `AuthorityInteractionRecord` + authority-state summary.  
**Invariant**: Recovery alone does not prove legal state; callers SHALL still run `RECONCILE_AUTHORITY_STATE(...)` before emitting reconciliation-resolved or submission-outcome events.

## SUBMISSION_GATE(...)
**Goal**: Protect the actual transmit step against duplicate, pending, malformed, illegally staged, or amendment-ineligible submissions.  
**Input**:
- filing packet payload hash
- filing packet manifest-binding hash
- expected manifest-binding hash
- authority-request idempotency key
- existing `SubmissionRecord`s for the same obligation / operation family
- authority link status
- request-body hash
- filing packet state
- authorized `runtime_scope[]`
- amendment posture  
**Output**: non-access `GateDecisionRecord`.

## SUBMIT_TO_AUTHORITY(...)
**Goal**: Transmit a sealed authority request through the controlled gateway and capture the resulting authority response envelope.  
**Output**: `AuthorityResponseEnvelope`.

## NORMALIZE_AUTHORITY_RESPONSE(...)
**Goal**: Convert transport/provider responses into protocol response classes and advance the in-flight `SubmissionRecord` to its normalized post-response state.  
**Output**: normalized response class + updated `SubmissionRecord`.

## RECORD_AUTHORITY_INTERACTION(...)
**Goal**: Persist the cross-reference record linking operation, request, response, submission, audit refs, and provenance refs for one authority exchange.  
**Output**: `AuthorityInteractionRecord`.

## RECONCILE_AUTHORITY_STATE(...)
**Goal**: Resolve pending, unknown, out-of-band, or authority-corrected states using `SubmissionRecord`, obligation mirror context, authority reference, and correlation keys.  
**Output**: reconciliation outcome + updated `SubmissionRecord` + updated `ObligationMirror` + authority-state summary.

## UPSERT_OBLIGATION_MIRROR(...)
**Goal**: Persist the authority-grounded obligation mirror returned from reconciliation or obligations reads without discarding prior legal-state evidence.  
**Output**: updated `ObligationMirror`.

## SELECT_DRIFT_BASELINE(...)
**Goal**: Choose the highest-precedence legal/operational baseline for drift comparison.  
**Output**: baseline manifest/reference + baseline type.  
**Invariant**: Filed truth is never guessed from a lower-precedence internal state when a higher-precedence authority-grounded baseline exists.

## DETECT_DRIFT(...)
**Goal**: Detect post-baseline change and classify it as correction, explanation-only drift, review materiality, or amendment-worthy change.

## EVALUATE_AMENDMENT_ELIGIBILITY(...)
**Goal**: Determine whether a post-finalisation change is legally and operationally eligible for the amendment path.  
**Output**: amendment eligibility posture + required next steps.

## UPSERT_AMENDMENT_CASE(...)
**Goal**: Persist or advance the amendment-case artifact, including lifecycle state, baseline/drift refs, amendment-window posture, and any authority calculation / confirmation refs produced by the intent-to-amend flow.  
**Output**: `AmendmentCase`.

## AMENDMENT_GATE(...)
**Goal**: Govern both:
- the right to begin an amendment journey, and
- the right to continue an amendment journey once `intent-to-amend` readiness context exists.  
**Output**: non-access `GateDecisionRecord`.  
**Rule**:
- `AMENDMENT_GATE(...)` SHALL be the only gate family that speaks for amendment `intent-to-amend` readiness failure.
- A caller SHALL never route `intent-to-amend` readiness failure through `FILING_GATE(...)`.
- A caller SHALL never terminate an amendment-capable run directly from raw `validation_outcome`.
- Where an amendment-intent run begins the authority call inside the amendment stage itself, the caller MAY emit a preparatory `AMENDMENT_GATE(...)` before the authority call and a decisive `AMENDMENT_GATE(...)` after `amendment_readiness_context` is persisted; the later record governs continuation or terminal outcome for that run.

## APPLY_RETENTION_POLICY(...)
**Goal**: Tag all manifest-attached artifacts, enforce expiry/erasure rules consistently, and preserve structural explainability through limitation states and erasure proofs.

## RECORD_ERROR(...)
**Goal**: Persist normalized error records with retry, blocking, remediation, projection, and visibility semantics.  
**Output**: `ErrorRecord`.

## CREATE_REMEDIATION_TASK(...)
**Goal**: Create an owned remediation task from a blocking or review-relevant error.  
**Output**: `RemediationTask`.

## RECORD_COMPENSATION(...)
**Goal**: Persist compensating actions when a partial stateful progression cannot be silently rewound.  
**Output**: `CompensationRecord`.

## RECORD_OBSERVABILITY(...)
**Goal**: Emit correlated traces, metrics, and logs for manifest, gate, authority, retention, and drift events without leaking sensitive data.  
**Output**: telemetry records linked by resource and correlation keys.

## COLLECT_RUN_ERRORS(...)
**Goal**: Collect the `ErrorRecord`s linked to the current manifest for observability, reporting, or terminal bundle enrichment.  
**Output**: ordered error-record refs.

## EMIT_WORKFLOW_ITEM(...)
**Goal**: Emit one workflow item directly when a narrow post-processing action is needed outside the main planner.  
**Output**: workflow item ref.

## ARTIFACT_CONTENT_HASH(...)
**Goal**: Compute the deterministic content hash for a first-class artifact envelope or payload.  
**Output**: content hash.

## EMIT_AUDIT_EVENT(...)
**Goal**: Persist append-only audit evidence for filing-critical, authority-critical, security-critical, and privacy-critical events.  
**Output**: `AuditEvent`.

## LOW_NOISE_COGNITIVE_BUDGET(...)
**Goal**: Return the frozen production attention budget used by low-noise shell composition and schema validation.  
**Output**: `cognitive_budget{ persistent_surface_limit=4, concurrent_primary_limit=1, primary_reason_limit=3, secondary_action_limit=2, visible_warning_limit=1, detail_entry_point_limit=5, expanded_detail_module_limit=1 }`.

## LOW_NOISE_COPY_BUDGET(...)
**Goal**: Return the frozen microcopy budget for the low-noise shell so summary surfaces stay one-scan readable even when legal or authority source text is verbose.  
**Output**: `copy_budget{ manifest_label_max_chars=64, context_label_max_chars=48, headline_max_chars=96, reason_label_max_chars=120, explanation_max_chars=240, action_label_max_chars=40, blocking_reason_max_chars=160, uncertainty_max_chars=160, detail_entry_label_max_chars=48, detail_entry_reason_max_chars=120 }`.

## TRIM_LOW_NOISE_COPY(...)
**Goal**: Normalize shell copy to the frozen low-noise budget before schema serialization without mutating machine-stable legal meaning.  
**Output**: bounded context labels, bounded summary copy, bounded action labels, and bounded detail-entry copy.  
**Rule**:
- preserve machine-stable reason codes and action codes even when visible text is shortened
- prefer one literal sentence over stacked clauses, repeated qualifiers, or branded metaphor
- when source text exceeds shell budget, keep the legal nucleus in the shell and route remaining detail into the relevant drawer module

## DERIVE_ATTENTION_POLICY(...)
**Goal**: Rank visible concerns and select one dominant posture, one dominant safe action or explicit `NO_SAFE_ACTION`, collapsed notice counts, ordered detail entry points, and the default detail module.  
**Output**: `attention_policy`.  
**Rule**:
- hard blocks, integrity fractures, and authority contradictions outrank neutral progress or success
- limitation states outrank neutral progress when they change what the user can safely do
- the top-level primary surface in `LOW_NOISE` SHALL be one of `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, or `DETAIL_DRAWER`; richer observatory surfaces remain internal source modules unless investigation mode is explicit
- the output SHALL mirror the top-level convenience fields emitted in `ExperienceDelta`

## FILTER_VISIBLE_ACTIONS(...)
**Goal**: Omit non-legal, unavailable, or non-material actions and return the bounded default action set for the low-noise shell.  
**Output**: `primary_action`, `secondary_actions[]`, `investigation_entry_point`.  
**Rule**:
- at most one primary action and at most two secondary actions
- visible action labels SHALL fit the frozen low-noise copy budget
- when waiting posture or `NO_SAFE_ACTION` applies, disabled controls SHALL NOT be emitted as placeholders

## NORMALIZE_LIMITATION_STATE(...)
**Goal**: Classify visible absence so latency, policy limits, irrelevance, and true emptiness never collapse into one ambiguous state.  
**Output**: normalized limitation / empty-state classification from `{NONE, NOT_REQUESTED, NOT_YET_MATERIALIZED, LIMITED, NOT_APPLICABLE}`.

## BUILD_CONTEXT_BAR_STATE(...)
**Goal**: Build the compressed persistent orientation strip for the low-noise shell.  
**Output**: `CONTEXT_BAR` payload.  
**Rule**:
- mode or non-live posture SHALL appear here once by default rather than as repeated banners elsewhere
- labels SHALL fit the frozen low-noise copy budget and prefer terse, literal status language over decorative phrasing

## BUILD_DECISION_SUMMARY_STATE(...)
**Goal**: Build the primary posture object with a bounded reason set, explicit limitation statement, and plain-language explanation.  
**Output**: `DECISION_SUMMARY` payload.  
**Rule**:
- emit at most three visible reasons plus `additional_reason_count`
- headline, reason labels, uncertainty text, and explanation text SHALL fit the frozen low-noise copy budget
- distinguish `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE`

## BUILD_ACTION_STRIP_STATE(...)
**Goal**: Build the dominant next-step surface for the low-noise shell.  
**Output**: `ACTION_STRIP` payload.  
**Rule**:
- expose one dominant safe action
- expose at most two subordinate secondary actions
- action labels, ownership copy, waiting copy, and blocking reasons SHALL fit the frozen low-noise copy budget
- when no safe legal action exists, emit `NO_SAFE_ACTION`, the blocking reason, and a deterministic investigation entry point

## BUILD_DETAIL_DRAWER_STATE(...)
**Goal**: Build the collapsed expert-module drawer without allowing expert depth to overwhelm the default shell.  
**Output**: `DETAIL_DRAWER` payload.  
**Rule**:
- expose only modules relevant to the current posture
- expose at most five entry points on default load
- entry labels and entry reasons SHALL fit the frozen low-noise copy budget
- allow at most one expanded module unless compare or audit mode is explicit
- preserve `focus_anchor_ref` whenever the anchored object still exists

## BUILD_LIVE_EXPERIENCE_FRAME(...)
**Goal**: Materialize the reconnect-safe shell frame and composite low-noise surfaces from the richer observatory read models.  
**Output**: latest experience frame plus `ExperienceDelta` patch set.  
**Rule**:
- validate composite shell payloads against surface-specific contracts
- emit only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` as peer top-level surfaces when `experience_profile = LOW_NOISE`
- emit `attention_policy{{...}}`, `cognitive_budget{{...}}`, `focus_anchor_ref`, and `shell_stability_token`
- preserve shell order as `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` unless compare or audit mode is explicit
- preserve shell order, reading order, and focus anchor across reconnect, catch-up, and non-destructive refresh whenever the focused object still exists

## DERIVE_CLIENT_PORTAL_STATUS(...)
**Goal**: Flatten internal workflow, gate, trust, filing, and authority posture into one plain-language client-facing status hero.  
**Output**: `status_hero`.  
**Rule**:
- emit literal client language such as `Action needed`, `Waiting on us`, `Ready to sign`, or `Completed` rather than raw gate enums or expert terminology
- expose one dominant next step, one due label where relevant, and a bounded step list showing what happens next
- internal-only reason codes, manifest lineage, and expert module names SHALL NOT appear in the first-view client projection

## BUILD_CLIENT_TASK_QUEUE(...)
**Goal**: Group client-visible work into a low-friction queue optimized for completion rather than investigation.  
**Output**: ordered `task_groups[]` partitioned into `DO_NOW`, `COMING_UP`, and `DONE`.  
**Rule**:
- the home route SHALL expose at most one dominant task CTA above the fold
- tasks SHALL be grouped by urgency and outcome, not by internal subsystem ownership
- every task SHALL state the requested action, why it matters, the due point if known, and the route that will complete it

## BUILD_CLIENT_DOCUMENT_CENTER(...)
**Goal**: Project secure document-request and upload state for the customer/client portal.  
**Output**: `document_center`.  
**Rule**:
- every upload SHALL remain attached to a request, category, or explicit uncategorized holding area; orphaned uploads are forbidden
- accepted file types, size limits, scanner state, and retry posture SHALL be visible without opening help copy
- mobile capture and desktop drag/drop SHALL resolve to the same governed `ClientUploadSession` lifecycle

## BUILD_CLIENT_APPROVAL_CENTER(...)
**Goal**: Build the plain-language review and sign-off experience for client declarations, summaries, and approval packs.  
**Output**: `approval_center`.  
**Rule**:
- separate `what you are approving`, `what changed`, and `what happens after you sign` into distinct visible sections
- sign-off actions SHALL bind to the current `approval_pack_hash`, stale-view guards, and explicit step-up requirements where applicable
- the client-facing summary SHALL omit operator-only diagnostics while preserving the legal meaning of the declaration

## BUILD_CLIENT_ONBOARDING_STATE(...)
**Goal**: Build the one-step-at-a-time onboarding journey for invited client users.  
**Output**: `onboarding_journey`.  
**Rule**:
- only one required onboarding step may be primary at a time
- completed steps SHALL collapse into a concise progress summary rather than remain open as a long form stack
- save-and-return SHALL preserve the current step, entered answers, and any in-progress upload sessions

## BUILD_CLIENT_PORTAL_WORKSPACE(...)
**Goal**: Compose the simplified customer/client portal workspace from status, tasks, documents, approvals, onboarding, support, and activity data.  
**Output**: `ClientPortalWorkspace`.  
**Rule**:
- global navigation SHALL expose at most five destinations and SHALL omit inactive sections rather than disable them
- the workspace SHALL present one dominant status hero, one dominant CTA, and a bounded recent-activity timeline before any secondary detail
- expert observatory modules SHALL remain staff-only or help-mediated routes rather than first-view client surfaces
