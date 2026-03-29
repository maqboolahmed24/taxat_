# Evidence-Linked Manifest Decision Engine (Core Algorithm)

## Field
This disclosure describes a system and method for producing **defensible, replayable, evidence-linked compliance decisions**
in regulated reporting contexts (e.g., tax reporting) by combining: (i) manifest-frozen execution envelopes, (ii) canonical snapshots,
(iii) policy gates and human overrides, (iv) evidence-linked provenance graphs, and (v) authority-acknowledged state machines.

## Background (problem)
Regulated reporting requires:
- multiple data sources (authority data, bank, ledgers, documents)
- changing rules and configurations across periods
- strict auditability and reproducibility
- safe automation with explicit uncertainty
- handling of conflicts between computed values and authority values
Traditional systems often fail by:
- losing lineage between outputs and evidence
- mixing exploratory analysis with compliance decisions
- silently reconciling conflicts without recording rationale
- lacking deterministic replay when rules or data change

## Summary (technical solution)
The core algorithm constructs a **RunManifest** as the run-control spine with an immutable frozen execution envelope, then executes a sequenced pipeline that:
1) collects and canonicalizes evidence into a **Snapshot**,
2) computes outcomes and forecasts,
3) derives risk signals and an evidence-linked provenance graph,
4) executes the ordered non-access gate chain as stage-specific inputs become available,
5) synthesizes a **TrustSummary** that governs automation and filing,
6) renders a cross-source twin view and workflow actions,
7) optionally generates and submits a filing packet to an external authority,
8) records the resulting authority acknowledgement and drift monitoring,
9) applies retention and erasure policies across all artifacts.

The output is a **DecisionBundle** whose contents are fully traceable from results back to raw evidence and configuration.

## Definitions
See `glossary.md`, `data_model.md`, `actor_and_authority_model.md`, and
`canonical_source_and_evidence_taxonomy.md`.

## Inputs
- `principal` (`PrincipalContext` authenticated actor context)
- `tenant_id`, `client_id`, `period`
- `requested_scope` (canonical ordered scope-token array containing exactly one reporting-scope token and zero or more action tokens;
  e.g. `["year_end"]`, `["year_end", "prepare_submission"]`, `["year_end", "prepare_submission", "submit"]`,
  `["year_end", "amendment_intent"]`, or `["year_end", "amendment_submit"]`)
- `mode ∈ {COMPLIANCE, ANALYSIS}`
- `run_kind ∈ {INTERACTIVE, NIGHTLY, BACKFILL, REPLAY, REMEDIATION, AMENDMENT, MIGRATION}`
- optional `manifest_id` (for replay / continuation)
- optional `override_refs` (pre-existing approved overrides)
- `config_channels` (rule versions, policy versions, connector config versions)

## Outputs (DecisionBundle)
A `DecisionBundle` returned after manifest allocation MUST include:
- `decision_bundle_id`
- `manifest_id`
- `artifact_type = DecisionBundle`
- `execution_mode`
- `analysis_only`
- `non_compliance_config_refs[]`
- `counterfactual_basis`
- `workflow_item_refs`
- `decision_status`
- `decision_reason_codes[]`
- `persisted_at`
- `contract`

Before any terminal or review return after manifest allocation, the engine SHALL route through
`FINALIZE_TERMINAL_OUTCOME(...)`, which persists the `DecisionBundle`, sets
`RunManifest.decision_bundle_hash`, synchronizes the bundle's top-level refs into the manifest's
append-only outcome projection, records required errors/remediation, and applies retention /
observability to the currently materialized refs.

When the caller omits bundle identity, execution-context stamping, compact terminal reason summary,
the durable persistence timestamp, or artifact-contract metadata, `FINALIZE_TERMINAL_OUTCOME(...)`
SHALL synthesize them before
persistence so terminal reload and idempotent bundle reuse never depend on ad hoc client inference.

It SHALL include top-level references for the primary decision artifacts materialized during the run.
Subordinate artifact refs MAY remain reachable through `manifest.output_refs`, `gating_decisions[]`, or provenance references.
Common top-level refs include:
- `snapshot_id`
- `compute_id` (and optional `forecast_id`)
- `risk_id`
- `parity_id`
- `trust_id`
- `graph_id`
- `twin_id`
- optional `filing_packet_id`
- optional `submission_record_id`

For replay-safe UX continuity, `FINALIZE_TERMINAL_OUTCOME(...)` SHALL also synthesize an
outcome-bridge projection on the persisted bundle whenever the caller omits it. At minimum this
bridge SHALL preserve `outcome_class`, `waiting_on`, `checkpoint_state`, `truth_state`,
`plain_reason`, `reason_codes[]`, `next_action_codes[]`, `blocked_action_codes[]`,
`actionability_state`, `primary_action_code`, `no_safe_action_reason_code`,
`suggested_detail_surface_code`, `active_detail_surface_code`, `focus_anchor_ref`, and
`next_checkpoint_at`; when available in `manifest.output_refs{}`, `filing_case_id` and
`amendment_case_id` SHALL be copied into the bundle so a reloaded terminal view can restore the
correct consequence rail without replaying the entire gate chain.

Architectural note: these shell-bridge fields are replay-safe UX checkpoints only. They speed up
terminal reload and route-stable restoration, but they SHALL NOT replace command-side truth, gate
records, workflow state, or authority artifacts.

Access exits that occur before manifest allocation (for example `DENY`, `REQUIRE_STEP_UP`, or
`REQUIRE_APPROVAL`) may return an access-blocked response instead of a `DecisionBundle`. That
response SHALL still use the same low-noise posture envelope as the mounted shell:
`attention_state`, `plain_reason`, `actionability_state`, `primary_action_code`,
`no_safe_action_reason_code`, `detail_entry_points[]`, and `suggested_detail_surface_code`, so
pre-manifest step-up or approval never forces the user into a different decision model.

## Required invariants
See `invariants_and_gates.md`.

---

## Core Procedure (pseudocode)

### Procedure: RUN_ENGINE(principal, tenant_id, client_id, period, requested_scope, mode, run_kind, manifest_id=None, override_refs=None, config_channels=None)

For each numbered phase below, the engine SHALL bracket execution with `RECORD_OBSERVABILITY(...)`
for the corresponding phase span named in `observability_and_audit_contract.md`.

Any unhandled system fault after `ManifestAllocated` SHALL route through `FINALIZE_RUN_FAILURE(...)`.
If `run_started` has not yet occurred, the failure finalizer SHALL mark the manifest `BLOCKED`,
emit reason code `PRESTART_SYSTEM_FAULT`, and delete or quarantine any uncommitted staging
artifacts. If `run_started` has occurred, the manifest lifecycle MUST transition via `system_fault`
to `FAILED`.

1. Authorize and bind execution scope

   * raw_requested_scope = CANONICALIZE_REQUESTED_SCOPE(requested_scope)
   * access_decision = AUTHORIZE(principal, tenant_id, client_id, period, raw_requested_scope, mode, run_kind)
   * if access_decision.decision in {DENY, REQUIRE_STEP_UP, REQUIRE_APPROVAL}: return ACCESS_BLOCKED_RESPONSE(reason=access_decision)
   * if access_decision.decision not in {ALLOW, ALLOW_MASKED}: return ERROR(INVALID_ACCESS_DECISION)
   * runtime_scope, masking_context = ENFORCE_ACCESS_SCOPE_AND_MASKING(raw_requested_scope, access_decision, mode)
   * access_scope_validation = VALIDATE_EFFECTIVE_SCOPE_BINDING(raw_requested_scope, access_decision, runtime_scope)
   * if access_scope_validation.status != VALID:
     return ERROR(access_scope_validation.reason_code)
   * access_binding_hash = ACCESS_BINDING_HASH(access_decision, runtime_scope)

   * Architectural note: `runtime_scope[]` is the single executable scope for the rest of the run.
   * Fail closed here instead of relying on crash-style assertions because access output is still
     derived from user/policy input and directly shapes the launch UX and legal action envelope.

Global substitution rule inside `RUN_ENGINE(...)`:

* preserve the raw requested scope on the manifest for audit and idempotency
* use `runtime_scope[]` for every downstream control-flow, collection, compute, workflow, packet, transmit, reconciliation, and terminal decision
* if `access_decision.decision = ALLOW_MASKED`, bind `masking_context` only to downstream render, export, and read-model projection steps
* `masking_context` SHALL NOT alter authoritative collection, canonical fact promotion, compute, parity, trust, filing-packet construction, request canonicalization, request hashing, transport, or reconciliation
* every user-visible lifecycle transition after manifest allocation SHALL be emitted as an idempotent, monotonic `ExperienceDelta` stream keyed by `manifest_id`
* after manifest allocation, the user-visible experience SHALL remain inside one mounted Live Observatory shell keyed by `manifest_id`; route reset, page reload, destructive unmount, or full-screen replacement SHALL NOT be required to observe phase progression, step-up, approval, transmit, reconciliation, late-data propagation, or drift
* `ExperienceDelta` SHALL preserve the distinction between local intent, persisted internal state, authority-pending state, authority-confirmed state, authority-rejected state, authority-unknown state, and out-of-band authority state; no client or helper MAY collapse these into a generic `submitted`, `done`, or `loading` label
* `ExperienceDelta` is a read-side signal only; it SHALL NOT become command-side truth or replace persisted artifacts, state machines, or audit evidence
* default user-facing delivery SHALL use `experience_profile="LOW_NOISE"`; the richer observatory read models remain available as backing surfaces and detail modules, but the mounted shell SHALL initially expose only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and a collapsed `DETAIL_DRAWER`
* the default shell SHALL enforce a visible-attention budget of at most one primary posture, one primary call-to-action, and one expanded detail module at a time unless the user explicitly enters compare, audit, or expert investigation mode
* every published `ExperienceDelta` SHALL include a machine-readable `attention_policy{{...}}` plus frozen `cognitive_budget{{...}}`; shell convenience fields (`attention_state`, `primary_object_ref`, `primary_action_code`, `secondary_notice_count`, `detail_entry_points[]`) MUST mirror `attention_policy{{...}}` exactly
* the low-noise renderer SHALL prefer omission over disabled clutter: non-legal, unavailable, or non-material actions SHALL be omitted from the default shell instead of rendered as disabled controls or placeholder panels
* analysis-only, modeled, or otherwise non-live posture SHALL be compressed into `CONTEXT_BAR` by default; the same caveat SHALL NOT be repeated as competing persistent banners across the shell

2. Resolve scope intent, validate runtime grammar, load any prior manifest, and choose config inheritance

   * active_override_refs = override_refs if override_refs else []
   * scope_flags = COMPUTE_SCOPE_FLAGS(runtime_scope)
   * reporting_scope = scope_flags.reporting_scope
   * wants_prepare_submission = scope_flags.wants_prepare_submission
   * wants_submit = scope_flags.wants_submit
   * wants_amendment_intent = scope_flags.wants_amendment_intent
   * wants_amendment_submit = scope_flags.wants_amendment_submit

   * scope_validation = VALIDATE_SCOPE_GRAMMAR(runtime_scope)

   * if scope_validation.status != VALID:
     return ERROR(scope_validation.reason_code)

   * prior_context = LOAD_AND_VALIDATE_PRIOR_MANIFEST_CONTEXT(
     manifest_id,
     tenant_id,
     client_id,
     period,
     mode,
     raw_requested_scope,
     runtime_scope,
     run_kind,
     access_binding_hash
     )

   * if prior_context.status == INVALID:
     return ERROR(prior_context.reason_code)

   * prior_manifest = prior_context.prior_manifest

   * manifest_strategy = DECIDE_MANIFEST_REUSE_STRATEGY(
     prior_context,
     raw_requested_scope,
     runtime_scope,
     run_kind
     )

   * if manifest_strategy.action == RETURN_EXISTING_BUNDLE:
     return LOAD_EXISTING_DECISION_BUNDLE(prior_manifest)

   * config_resolution = RESOLVE_CONFIG_FOR_REQUEST(
     tenant_id,
     period,
     runtime_scope,
     mode,
     config_channels,
     prior_context,
     manifest_strategy
     )

   * cfg = config_resolution.cfg
   * cfg_freeze = config_resolution.cfg_freeze if exists(config_resolution.cfg_freeze) else None
   * resolved_schema_bundle_hash = config_resolution.schema_bundle_hash
   * config_inheritance_mode = config_resolution.config_inheritance_mode

   * before any compliance artifact is persisted, `cfg_freeze` MUST include every minimum config type enumerated in `manifest_and_config_freeze_contract.md`
   * `cfg_freeze` MUST include `required_config_types_present[]` and all mandatory top-level profile refs
   * `cfg_freeze` MUST include: rule_version_ref, policy_version_ref, connector_profile_ref, thresholds, materiality rules
   * no compliance artifact may be persisted against floating configuration

3. Allocate, continue, or reuse manifest context and initialize the live experience stream

   * reuse_sealed_context = manifest_strategy.action == REUSE_SEALED_MANIFEST

   * if manifest_strategy.action == NEW_MANIFEST:
     manifest = BEGIN_MANIFEST(
     tenant_id,
     client_id,
     period,
     raw_requested_scope,
     mode,
     run_kind,
     code_build_id(),
     schema_bundle_hash=resolved_schema_bundle_hash,
     principal_context_ref=principal.context_ref,
     access_decision=access_decision
     )
     RECORD_EVENT(ManifestAllocated, manifest.manifest_id)

     else if manifest_strategy.action == REUSE_SEALED_MANIFEST:
     reuse_context_validation = VALIDATE_REUSE_SEALED_CONTEXT(prior_manifest)
     if reuse_context_validation.status != VALID:
     return ERROR(reuse_context_validation.reason_code)
     manifest = prior_manifest

     else:
     manifest = BEGIN_CHILD_MANIFEST(
     prior_manifest,
     raw_requested_scope,
     mode,
     run_kind,
     cfg_freeze=cfg_freeze if exists(cfg_freeze) else None,
     code_build_id=code_build_id(),
     continuation_basis=manifest_strategy.continuation_basis,
     replay_of_manifest_id=prior_manifest.manifest_id if manifest_strategy.action == REPLAY_CHILD else None,
     config_inheritance_mode=config_inheritance_mode
     )
     RECORD_EVENT(ManifestAllocated, manifest.manifest_id)

   * if not reuse_sealed_context and not exists(cfg_freeze):
     cfg_freeze = FREEZE_CONFIG(
     cfg,
     manifest.manifest_id,
     mode,
     environment_ref(),
     code_build_id(),
     resolved_schema_bundle_hash
     )

   * if not reuse_sealed_context:
     UPDATE_MANIFEST_PRESEAL_CONTEXT(
     manifest,
     access_decision=access_decision,
     config_freeze=cfg_freeze,
     continuation_set_patch={"config_inheritance_mode": config_inheritance_mode}
     )

   * lineage_projection_validation = VALIDATE_MANIFEST_LINEAGE_PROJECTION(manifest)
   * if lineage_projection_validation.status != VALID:
     return ERROR(lineage_projection_validation.reason_code)

   * Architectural note: duplicated top-level lineage fields are fast-read mirrors of
     `continuation_set{...}`. They SHALL never become a second source of truth or drift silently.

   * manifest MUST capture principal_context_ref, config freeze identity, deterministic seed, manifest-level idempotency key, and lineage refs

   * same-manifest reuse is legal only when `manifest_strategy.action = REUSE_SEALED_MANIFEST` and raw requested scope, executable scope, run kind, and access binding are identical
   * same-manifest reuse SHALL NOT rewrite the sealed manifest's frozen envelope, access decision projection, or config freeze identity
   * child-manifest creation MUST persist `continuation_basis` and `config_inheritance_mode` so replay, recovery, amendment, and fresh-child UX paths remain distinguishable in lineage and audit views

   * experience_stream = INIT_EXPERIENCE_STREAM(
     manifest,
     channel_key=HASH(manifest.manifest_id, access_binding_hash),
     shell_route_key=manifest.manifest_id,
     experience_profile="LOW_NOISE",
     surface_codes=[
     "CONTEXT_BAR",
     "DECISION_SUMMARY",
     "ACTION_STRIP",
     "DETAIL_DRAWER",
     "PULSE_SPINE",
     "MANIFEST_RIBBON",
     "HANDOFF_BATON",
     "DECISION_STAGE",
     "CONSEQUENCE_RAIL",
     "EVIDENCE_TIDE",
     "PACKET_FORGE",
     "AUTHORITY_TUNNEL",
     "DRIFT_FIELD",
     "FOCUS_LENS",
     "TWIN_PANEL"
     ]
     )

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="ManifestAllocated" if not reuse_sealed_context else "ManifestContextReused",
     surface_updates=[
     SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
     manifest,
     shell_state="LIVE_OBSERVATORY",
     connection_state="CONNECTED",
     catchup_state="CAUGHT_UP",
     activity_state="STREAMING" if not reuse_sealed_context else "IDLE",
     truth_state="PERSISTED_INTERNAL",
     active_phase="ALLOCATED" if not reuse_sealed_context else "PRESEAL_REUSED",
     checkpoint_state="NONE",
     latest_cause_ref="ManifestAllocated" if not reuse_sealed_context else "ManifestContextReused",
     pending_object_refs=[]
     )),
     SURFACE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(manifest, lifecycle_state=manifest.lifecycle_state, runtime_scope=runtime_scope)),
     SURFACE_UPDATE("HANDOFF_BATON", BUILD_HANDOFF_BATON_STATE(
     principal=principal,
     access_decision=access_decision,
     authority_binding=None,
     approval_state="NOT_REQUIRED",
     handoff_state="ACTIVE_OPERATOR_BOUND" if access_decision.decision == ALLOW else "MASKED_OPERATOR_BOUND"
     )),
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="ALLOCATED", gate_summary=[])),
     SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE([], [], mode, runtime_scope))
     ],
     posture_state="STREAMING" if not reuse_sealed_context else "FROZEN",
     semantic_motion="ORBIT" if not reuse_sealed_context else "ECHO"
     )

4. Load or build the sealed pre-start context using a barriered, partition-aware execution plan

   * Concurrency and modernization rules for all remaining phases:

     * `RUN_ENGINE(...)` SHALL remain the single durable control-plane orchestrator for one manifest, but it SHALL NOT perform heavyweight intake transforms, bulk graph construction, or authority transport inline when those actions can be delegated to idempotent stage workers or governed gateway workers
     * fan-out work SHALL execute as idempotent stage tasks published through a transactional outbox; workers SHALL be stateless and SHALL NOT mutate manifest core, rewrite prior gate records, or bypass manifest seal rules
     * every async boundary SHALL use both:

       * a transactional outbox for command publication; and
       * a transactional inbox/dedupe layer for inbound provider callbacks, polls, worker results, or transport acknowledgements before any state transition is applied
     * ordering SHALL be enforced only within `order_domain_key`; there SHALL be no platform-wide FIFO queue or tenant-wide serialization for unrelated manifests
     * recommended `order_domain_key` forms:

       * pre-seal intake / normalization: `HASH(manifest.manifest_id, source_domain, ordered(partition_scope_refs))`
       * authority calculation / transmit: `HASH(tenant_id, client_id, period, target_obligation_ref if exists else operation_family, ordered(runtime_scope))`
     * stage task identity SHALL be deterministic from manifest identity + frozen inputs; replay or retry with the same `task_key` SHALL reuse prior results rather than duplicate side effects
     * stage workers SHALL persist output artifacts before marking a task complete; the orchestrator SHALL adopt persisted output refs and SHALL NOT re-write byte-equivalent duplicates
     * merge/reduce steps over partitioned stage outputs SHALL use a balanced-tree reduction strategy whenever more than one partition contributes to the same authoritative set
     * gate prerequisites MAY be prepared in parallel, but `GateDecisionRecord` emission SHALL remain strictly ordered per `exact_gate_logic_and_decision_tables.md`
     * every persisted state transition that changes user-visible posture SHALL be followed by an incremental `ExperienceDelta` update rather than waiting for terminal bundle materialization
     * heavy user-facing read models SHALL be produced asynchronously and incrementally; full navigation reset or page reload SHALL NOT be required to observe phase progression
     * any unhandled failure after stage publication SHALL cancel or quarantine open worksets for that manifest; late worker completions SHALL be ignored unless adopted by a child recovery manifest

   * if `reuse_sealed_context`:
     (
     source_plan,
     source_window,
     collection_boundary,
     normalization_context,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     conflict_set,
     canonical_fact_set,
     snapshot,
     input_freeze,
     ordered_preseal_gate_records
     ) = LOAD_SEALED_RUN_CONTEXT(manifest)

     preseal_gate_records = ordered_preseal_gate_records
     non_access_gate_records = ordered_preseal_gate_records

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="PrestartContextReused",
     surface_updates=[
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="PRESEAL_REUSED", gate_summary=preseal_gate_records)),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="REUSED"))
     ],
     posture_state="FROZEN",
     semantic_motion="ECHO"
     )

     else:
     RECORD_EVENT(SourceCollectionStarted, manifest.manifest_id)

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="SourceCollectionStarted",
     surface_updates=[
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SOURCE_COLLECTION", gate_summary=[])),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(None, None, status="STREAMING"))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

     source_plan = PLAN_SOURCE_COLLECTION(
     manifest,
     runtime_scope,
     cfg.input_policy_ref,
     cfg.connector_profile_ref
     )

     source_plan SHALL enumerate `planned_sources[]`, one entry per required source domain, and each entry SHALL capture:
     - `source_domain`
     - `source_class`
     - provider/system binding
     - tenant/client/business/income-source/period partitions
     - query/filter basis
     - pagination/cursor strategy
     - read model `{AS_OF, WINDOWED, POINT_IN_TIME, LATEST_ALLOWED}`
     - late-data policy `{EXCLUDE_LATE, SPAWN_CHILD_MANIFEST, REVIEW_IF_LATE}`
     - freshness SLO and required schema refs

     fetch_tasks = [
     BUILD_STAGE_TASK(
     manifest_id=manifest.manifest_id,
     stage_code="SOURCE_FETCH",
     task_key=HASH(
     manifest.manifest_id,
     "SOURCE_FETCH",
     planned_source.source_domain,
     ordered(planned_source.partition_scope_refs),
     planned_source.query_basis_ref,
     planned_source.read_model,
     planned_source.cursor_strategy_ref
     ),
     order_domain_key=HASH(
     manifest.manifest_id,
     planned_source.source_domain,
     ordered(planned_source.partition_scope_refs)
     ),
     payload_ref=planned_source
     )
     for planned_source in source_plan.planned_sources
     ]

     PERSIST_STAGE_WORKSET_AND_OUTBOX(
     manifest,
     stage_code="SOURCE_FETCH",
     tasks=fetch_tasks,
     completion_policy="ALL_REQUIRED"
     )

     fetch_results = AWAIT_STAGE_WORKSET(
     manifest,
     stage_code="SOURCE_FETCH",
     timeout=EXECUTION_SLO(cfg, "SOURCE_FETCH"),
     allow_result_reuse=true,
     on_timeout="FAIL_CLOSED"
     )

     raw_batch = MERGE_FETCH_RESULTS(
     fetch_results,
     stable_order=source_plan.planned_sources,
     reduction_strategy="BALANCED_TREE"
     )

     collection_boundary = FREEZE_COLLECTION_BOUNDARY(source_plan, raw_batch)
     source_window = MATERIALIZE_SOURCE_WINDOW(collection_boundary)
     RECORD_EVENT(SourceCollectionCompleted, manifest.manifest_id, collection_boundary.collection_boundary_id)

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="SourceCollectionCompleted",
     surface_updates=[
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="COLLECTED")),
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SOURCE_COLLECTION_COMPLETED", gate_summary=[]))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

     late_data_findings = CLASSIFY_LATE_DATA(collection_boundary, runtime_scope)
     FOR_EACH finding IN late_data_findings:
     - if finding.policy == `SPAWN_CHILD_MANIFEST`:
     SPAWN_CHILD_MANIFEST_FOR_LATE_DATA(manifest, finding)
     - else if finding.policy == `REVIEW_IF_LATE`:
     RECORD_EVENT(LateDataDetected, manifest.manifest_id, finding.finding_id)
     - else if finding.policy == `EXCLUDE_LATE`:
     NOOP()
     - else:
     return ERROR(LATE_DATA_POLICY_UNKNOWN)

     if late_data_findings != []:
     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="LateDataClassified",
     surface_updates=[
     SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_LATE_DATA(late_data_findings)),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="LATE_DATA_CLASSIFIED"))
     ],
     posture_state="CONTAINED" if any(f.policy == "REVIEW_IF_LATE" for f in late_data_findings) else "STREAMING",
     semantic_motion="RIPPLE"
     )

     normalize_tasks = [
     BUILD_STAGE_TASK(
     manifest_id=manifest.manifest_id,
     stage_code="NORMALIZE_INTAKE",
     task_key=HASH(manifest.manifest_id, "NORMALIZE_INTAKE", fetch_result.task_key),
     order_domain_key=fetch_result.order_domain_key,
     payload_ref=fetch_result.result_ref
     )
     for fetch_result in fetch_results
     ]

     PERSIST_STAGE_WORKSET_AND_OUTBOX(
     manifest,
     stage_code="NORMALIZE_INTAKE",
     tasks=normalize_tasks,
     completion_policy="ALL_REQUIRED"
     )

     normalize_results = AWAIT_STAGE_WORKSET(
     manifest,
     stage_code="NORMALIZE_INTAKE",
     timeout=EXECUTION_SLO(cfg, "NORMALIZE_INTAKE"),
     allow_result_reuse=true,
     on_timeout="FAIL_CLOSED"
     )

     source_records = MERGE_STAGE_OUTPUTS(
     normalize_results,
     artifact_type=SourceRecord,
     reduction_strategy="BALANCED_TREE"
     )
     evidence_items = MERGE_STAGE_OUTPUTS(
     normalize_results,
     artifact_type=EvidenceItem,
     reduction_strategy="BALANCED_TREE"
     )
     candidate_facts = MERGE_STAGE_OUTPUTS(
     normalize_results,
     artifact_type=CandidateFact,
     reduction_strategy="BALANCED_TREE"
     )

     canonicalize_tasks = BUILD_CANONICALIZATION_TASKS(
     manifest,
     candidate_facts,
     source_records,
     evidence_items,
     partition_scope_strategy="BY_PARTITION_SCOPE"
     )

     PERSIST_STAGE_WORKSET_AND_OUTBOX(
     manifest,
     stage_code="CANONICALIZE_FACTS",
     tasks=canonicalize_tasks,
     completion_policy="ALL_REQUIRED"
     )

     canonicalize_results = AWAIT_STAGE_WORKSET(
     manifest,
     stage_code="CANONICALIZE_FACTS",
     timeout=EXECUTION_SLO(cfg, "CANONICALIZE_FACTS"),
     allow_result_reuse=true,
     on_timeout="FAIL_CLOSED"
     )

     partition_conflicts = MERGE_STAGE_OUTPUTS(
     canonicalize_results,
     artifact_type=ConflictRecord,
     reduction_strategy="BALANCED_TREE"
     )
     partition_canonical_facts = MERGE_STAGE_OUTPUTS(
     canonicalize_results,
     artifact_type=CanonicalFact,
     reduction_strategy="BALANCED_TREE"
     )

     cross_partition_conflicts = DETECT_CROSS_PARTITION_CONFLICTS(
     candidate_facts,
     cfg.conflict_rules,
     prohibition="NO_CROSS_PARTITION_CONTAMINATION"
     )

     conflicts = MERGE_CONFLICTS(
     partition_conflicts,
     cross_partition_conflicts,
     reduction_strategy="BALANCED_TREE"
     )

     canonical_facts = PROMOTE_CANONICAL_FACTS(
     candidate_facts,
     conflicts,
     partition_canonical_facts,
     cfg.promotion_rules,
     partition_integrity_required=true
     )

     if not NO_CROSS_PARTITION_PROMOTION(canonical_facts): return ERROR(CROSS_PARTITION_PROMOTION_DETECTED)

     source_record_set = BUILD_ARTIFACT_SET(SourceRecordSet, source_records)
     evidence_item_set = BUILD_ARTIFACT_SET(EvidenceItemSet, evidence_items)
     candidate_fact_set = BUILD_ARTIFACT_SET(CandidateFactSet, candidate_facts)
     conflict_set = BUILD_ARTIFACT_SET(ConflictSet, conflicts)
     canonical_fact_set = BUILD_ARTIFACT_SET(CanonicalFactSet, canonical_facts)

     normalization_context = FREEZE_NORMALIZATION_CONTEXT(
     manifest,
     cfg.mapping_rules,
     cfg.evidence_rules,
     cfg.promotion_rules,
     cfg.normalization_rules
     )

     snapshot = BUILD_SNAPSHOT(
     manifest,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     canonical_fact_set,
     conflict_set
     )
     RECORD_EVENT(SnapshotBuilt, manifest.manifest_id, snapshot.snapshot_id)

     snapshot.quality = VALIDATE(snapshot, cfg.data_quality_rules)
     snapshot.completeness = MEASURE_COMPLETENESS(
     snapshot,
     cfg.completeness_rules,
     expected=source_plan.required_domains
     )
     RECORD_EVENT(SnapshotValidated, manifest.manifest_id, snapshot.snapshot_id)

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="SnapshotValidated",
     surface_updates=[
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SNAPSHOT_VALIDATED", gate_summary=[])),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="SNAPSHOT_VALIDATED")),
     SURFACE_UPDATE("FOCUS_LENS", BUILD_FOCUS_LENS_STATE(available=false, reason="WAITING_FOR_GRAPH"))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

     no canonical fact used for compute, parity, trust, filing, or graphing may exist unless it was derived exclusively from the frozen `collection_boundary` for that manifest

     schema_bundle = LOAD_SCHEMA_BUNDLE(manifest.schema_bundle_hash)

     VALIDATE_ARTIFACT_CONTRACTS_FOR_PRESEAL_SET(
     schema_bundle,
     cfg_freeze,
     source_plan,
     source_window,
     collection_boundary,
     normalization_context,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     conflict_set,
     canonical_fact_set,
     snapshot
     )

     artifact_contract_refs = RECORD_PRESEAL_ARTIFACT_CONTRACT_REFS(
     schema_bundle,
     source_plan,
     source_window,
     collection_boundary,
     normalization_context,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     conflict_set,
     canonical_fact_set,
     snapshot
     )

     artifact_contract_hash = HASH(
     manifest.schema_bundle_hash,
     ordered(artifact_contract_refs),
     source_record_set.set_hash,
     evidence_item_set.set_hash,
     candidate_fact_set.set_hash,
     conflict_set.set_hash,
     canonical_fact_set.set_hash,
     ARTIFACT_CONTENT_HASH(snapshot)
     )

     input_freeze = FREEZE_INPUT_SET(
     manifest,
     source_plan,
     source_window,
     collection_boundary,
     source_records,
     evidence_items,
     candidate_facts,
     canonical_facts,
     conflicts,
     exclusions=DECLARED_EXCLUSIONS(...),
     missing_source_declarations=DECLARE_MISSING_SOURCES(...),
     stale_source_declarations=DECLARE_STALE_SOURCES(...),
     normalization_context=normalization_context,
     artifact_contract_refs=artifact_contract_refs,
     artifact_contract_hash=artifact_contract_hash
     )

     VALIDATE_ARTIFACT(InputFreeze, input_freeze, schema_bundle.InputFreeze)

5. Evaluate the ordered pre-seal gate chain, persist pre-start blocked context if needed, and seal only when a new pre-start context was built

   * if `reuse_sealed_context`:
     if manifest.lifecycle_state != SEALED: return FINALIZE_RUN_FAILURE(manifest, MANIFEST_NOT_SEALED_FOR_REUSE)
     if preseal_gate_records != ordered_preseal_gate_records: return FINALIZE_RUN_FAILURE(manifest, PRESEAL_GATE_CHAIN_MISMATCH)
     non_access_gate_records = preseal_gate_records

     else:
     if manifest.lifecycle_state == ALLOCATED:
     TRANSITION_MANIFEST(manifest, event="freeze_success")
     RECORD_EVENT(ManifestFrozen, manifest.manifest_id)

     if manifest.lifecycle_state != FROZEN: return FINALIZE_RUN_FAILURE(manifest, MANIFEST_NOT_FROZEN_FOR_PRESEAL)

     gate_manifest = MANIFEST_GATE(
     manifest,
     cfg_freeze,
     input_freeze,
     manifest.schema_bundle_hash,
     PROVIDER_ENVIRONMENT_REFS(collection_boundary)
     )

     gate_contracts = ARTIFACT_CONTRACT_GATE(
     schema_bundle,
     source_plan,
     source_window,
     collection_boundary,
     normalization_context,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     conflict_set,
     canonical_fact_set,
     snapshot,
     input_freeze
     )

     gate_boundary = INPUT_BOUNDARY_GATE(
     input_freeze,
     collection_boundary,
     DECLARED_EXCLUSIONS(input_freeze)
     )

     gate_quality = DATA_QUALITY_GATE(snapshot, cfg)

     preseal_gate_records = EMIT_ORDERED_GATES(
     manifest,
     [
     gate_manifest,
     gate_contracts,
     gate_boundary,
     gate_quality
     ],
     required_order=[
     "MANIFEST_GATE",
     "ARTIFACT_CONTRACT_GATE",
     "INPUT_BOUNDARY_GATE",
     "DATA_QUALITY_GATE"
     ],
     persist_immediately=false
     )

     SYNC_LIVE_EXPERIENCE_FROM_GATES(
     manifest,
     preseal_gate_records,
     phase_code="PRESEAL_GATES"
     )

     if any(GATE_BLOCKS_PROGRESS(g) for g in preseal_gate_records):
     PERSIST_PRESTART_TERMINAL_CONTEXT(
     manifest,
     cfg_freeze,
     source_plan,
     source_window,
     collection_boundary,
     normalization_context,
     source_record_set,
     evidence_item_set,
     candidate_fact_set,
     conflict_set,
     canonical_fact_set,
     snapshot,
     input_freeze,
     preseal_gate_records
     )

     ```
     SYNC_LIVE_EXPERIENCE(
       manifest,
       cause_ref="PresealBlocked",
       surface_updates=[
        SURFACE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(
        manifest,
        lifecycle_state=manifest.lifecycle_state,
        decision_posture="BLOCKED_PRESTART",
        runtime_scope=runtime_scope
        )),
        SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="PRESEAL_BLOCKED", gate_summary=preseal_gate_records)),
        SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_GATES(preseal_gate_records))
       ],
       posture_state="FRACTURED",
       semantic_motion="FRACTURE",
       is_terminal=true
     )

     bundle = DecisionBundle(
       manifest_id=manifest.manifest_id,
       decision_status="BLOCKED",
       snapshot_id=snapshot.snapshot_id,
       workflow_item_refs=[]
     )

     return FINALIZE_TERMINAL_OUTCOME(
       manifest,
       bundle,
       terminal_reasons=preseal_gate_records,
       gate_records=preseal_gate_records,
       retention_profile=cfg.retention_profile
     )
     ```

     BEGIN_ATOMIC_TRANSACTION()
     WRITE_ARTIFACT(ConfigFreeze, cfg_freeze)
     WRITE_ARTIFACT(InputFreeze, input_freeze)
     WRITE_ARTIFACT(SourcePlan, source_plan)
     WRITE_ARTIFACT(SourceWindow, source_window)
     WRITE_ARTIFACT(CollectionBoundary, collection_boundary)
     WRITE_ARTIFACT(NormalizationContext, normalization_context)
     WRITE_ARTIFACT(SourceRecordSet, source_record_set)
     WRITE_ARTIFACT(EvidenceItemSet, evidence_item_set)
     WRITE_ARTIFACT(CandidateFactSet, candidate_fact_set)
     WRITE_ARTIFACT(ConflictSet, conflict_set)
     WRITE_ARTIFACT(CanonicalFactSet, canonical_fact_set)
     WRITE_ARTIFACT(Snapshot, snapshot, RETENTION_TAG(cfg, "regulated_record"))

     PERSIST_GATE_BATCH(manifest, preseal_gate_records)

     SEAL_MANIFEST(manifest, cfg_freeze, input_freeze, preseal_gate_records)
     TRANSITION_MANIFEST(manifest, event="seal_success")
     COMMIT_ATOMIC_TRANSACTION()

     RECORD_EVENT(ManifestSealed, manifest.manifest_id)

     non_access_gate_records = preseal_gate_records

     pre-seal decisions in `{PASS_WITH_NOTICE, MANUAL_REVIEW}` remain binding unresolved posture after seal; sealing does not clear them, and later `TRUST_GATE` / `FILING_GATE` SHALL consume them from `non_access_gate_records`

     if manifest.lifecycle_state != SEALED: return FINALIZE_RUN_FAILURE(manifest, MANIFEST_SEAL_TRANSITION_INVALID)

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="ManifestSealed",
     surface_updates=[
     SURFACE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(manifest, lifecycle_state="SEALED", runtime_scope=runtime_scope)),
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SEALED", gate_summary=preseal_gate_records))
     ],
     posture_state="FROZEN",
     semantic_motion="SEAL"
     )

6. Claim the sealed manifest and publish the post-seal command DAG atomically

   * raw_requested_scope SHALL remain the canonical ordered scope frozen on the manifest for audit

   * runtime_scope SHALL drive all downstream execution branching

   * command_dag = BUILD_STAGE_DAG(
     manifest,
     stage_group="POST_SEAL_COMMANDS",
     nodes=[
     STAGE_TASK(
     stage_code="COMPUTE_OUTCOME",
     task_key=HASH(manifest.manifest_id, "COMPUTE_OUTCOME", input_freeze.input_freeze_id, cfg.rule_version_ref),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "COMPUTE_OUTCOME"),
     payload_ref=snapshot.snapshot_id
     ),
     OPTIONAL_STAGE_TASK(
     stage_code="FORECAST",
     depends_on=["COMPUTE_OUTCOME"],
     task_key=HASH(manifest.manifest_id, "FORECAST", input_freeze.input_freeze_id, cfg.forecast_options, SEED(manifest.deterministic_seed, cfg.forecast_options, input_freeze.input_set_hash)),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "FORECAST"),
     payload_ref=snapshot.snapshot_id
     ),
     STAGE_TASK(
     stage_code="SCORE_RISK",
     depends_on=["COMPUTE_OUTCOME"],
     task_key=HASH(manifest.manifest_id, "SCORE_RISK", input_freeze.input_freeze_id, cfg.risk_threshold_profile_ref),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "SCORE_RISK"),
     payload_ref=snapshot.snapshot_id
     ),
     STAGE_TASK(
     stage_code="BUILD_EVIDENCE_GRAPH",
     depends_on=["COMPUTE_OUTCOME", "SCORE_RISK"],
     task_key=HASH(manifest.manifest_id, "BUILD_EVIDENCE_GRAPH", input_freeze.input_freeze_id, cfg.graph_rules, cfg.graph_quality_rules, ordered(runtime_scope)),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "BUILD_EVIDENCE_GRAPH"),
     payload_ref=snapshot.snapshot_id
     ),
     STAGE_TASK(
     stage_code="LOAD_AUTHORITY_CONTEXT",
     task_key=HASH(manifest.manifest_id, "LOAD_AUTHORITY_CONTEXT", client_id, period, ordered(runtime_scope)),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "LOAD_AUTHORITY_CONTEXT"),
     payload_ref=collection_boundary.collection_boundary_id
     ),
     STAGE_TASK(
     stage_code="MONITOR_LATE_DATA_AFTER_SEAL",
     task_key=HASH(manifest.manifest_id, "MONITOR_LATE_DATA_AFTER_SEAL", collection_boundary.collection_boundary_id, ordered(runtime_scope)),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "MONITOR_LATE_DATA_AFTER_SEAL"),
     payload_ref=collection_boundary.collection_boundary_id
     )
     ]
     )

   * BEGIN_ATOMIC_TRANSACTION()

   * manifest_start_claim = CLAIM_MANIFEST_START(
     manifest,
     lease_holder_ref=SERVICE_INSTANCE_ID(),
     lease_ttl=EXECUTION_LEASE_TTL(cfg)
     )

   * if manifest_start_claim.status == ALREADY_TERMINAL:
     ROLLBACK_ATOMIC_TRANSACTION()
     return LOAD_EXISTING_DECISION_BUNDLE(manifest)

   * if manifest_start_claim.status == ALREADY_ACTIVE:
     ROLLBACK_ATOMIC_TRANSACTION()
     return ERROR(ATTEMPT_ALREADY_ACTIVE)

   * if manifest_start_claim.status != CLAIMED:
     ROLLBACK_ATOMIC_TRANSACTION()
     return ERROR(MANIFEST_START_CLAIM_INVALID)

   * PERSIST_STAGE_DAG_AND_OUTBOX(manifest, command_dag)

   * COMMIT_ATOMIC_TRANSACTION()

   * RECORD_EVENT(RunStarted, manifest.manifest_id)

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="RunStarted",
     surface_updates=[
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="POST_SEAL_COMMANDS", gate_summary=non_access_gate_records)),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="LIVE"))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

7. Await post-seal command DAG completion and adopt mandatory outputs

   * workflow_item_refs = []

   * twin = None

   * focus_lens_index = None

   * experience_frame = None

   * command_outputs = AWAIT_STAGE_DAG(
     manifest,
     stage_group="POST_SEAL_COMMANDS",
     timeout=EXECUTION_SLO(cfg, "POST_SEAL_COMMANDS"),
     allow_result_reuse=true,
     on_timeout="FAIL_CLOSED"
     )

   * compute = ADOPT_PERSISTED_STAGE_ARTIFACT(
     command_outputs,
     stage_code="COMPUTE_OUTCOME",
     artifact_type=ComputeResult
     )

   * if HAS_STAGE_ARTIFACT(command_outputs, stage_code="FORECAST"):
     forecast = ADOPT_PERSISTED_STAGE_ARTIFACT(
     command_outputs,
     stage_code="FORECAST",
     artifact_type=ForecastSet
     )
     else:
     forecast = None

   * risk = ADOPT_PERSISTED_STAGE_ARTIFACT(
     command_outputs,
     stage_code="SCORE_RISK",
     artifact_type=RiskReport
     )

   * graph = ADOPT_PERSISTED_STAGE_ARTIFACT(
     command_outputs,
     stage_code="BUILD_EVIDENCE_GRAPH",
     artifact_type=EvidenceGraph
     )

   * if not exists(graph.quality): return FINALIZE_RUN_FAILURE(manifest, GRAPH_QUALITY_MISSING)

   * authority_context = LOAD_STAGE_RESULT(command_outputs, stage_code="LOAD_AUTHORITY_CONTEXT")

   * late_data_monitor = LOAD_STAGE_RESULT(command_outputs, stage_code="MONITOR_LATE_DATA_AFTER_SEAL")

   * authority_views = authority_context.authority_views

   * known_submission_lineage = authority_context.known_submission_lineage

   * authority_state = authority_context.authority_state

   * authority_link_state = authority_context.authority_link_state

   * pretrust_approval_state = authority_context.pretrust_approval_state

   * late_data_status = late_data_monitor.late_data_status

   * late_data_policy_bindings = COLLECTION_LATE_DATA_BINDINGS(collection_boundary, runtime_scope)

   * RECORD_EVENT(ComputeCompleted, manifest.manifest_id, compute.compute_id)

   * if forecast: RECORD_EVENT(ForecastCompleted, manifest.manifest_id, forecast.forecast_id)

   * RECORD_EVENT(RiskScored, manifest.manifest_id, risk.risk_id)

   * RECORD_EVENT(GraphBuilt, manifest.manifest_id, graph.graph_id)

   * graph MUST expose stable node/edge ids, critical paths, and graph addresses for filing-capable and trust-capable artifacts

   * UPDATE_MANIFEST_OUTPUTS(
     manifest,
     output_refs={
     "snapshot_id": snapshot.snapshot_id,
     "compute_id": compute.compute_id,
     "risk_id": risk.risk_id,
     "graph_id": graph.graph_id
     }
     )

   * if forecast:
     UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"forecast_id": forecast.forecast_id})

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="PostSealCommandsCompleted",
     surface_updates=[
     SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="ANALYTICS_READY", gate_summary=non_access_gate_records)),
     SURFACE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="GRAPH_READY")),
     SURFACE_UPDATE("FOCUS_LENS", BUILD_FOCUS_LENS_STATE(available=true, graph_ref=graph.graph_id))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

8. Retention evidence gate

   * gate_retention = RETENTION_EVIDENCE_GATE(
     graph.quality.graph_quality_score,
     graph.quality.critical_path_coverage,
     graph.quality.critical_retention_limited_count,
     graph.quality.critical_evidence_erased_count,
     graph.quality.inferred_critical_path_ratio
     )

   * WRITE_ARTIFACT(GateDecisionRecord, gate_retention)

   * RECORD_EVENT(GateEvaluated, manifest.manifest_id, gate_retention.gate_code)

   * APPEND_MANIFEST_GATES(manifest, [gate_retention])

   * non_access_gate_records = non_access_gate_records + [gate_retention]

   * SYNC_LIVE_EXPERIENCE_FROM_GATES(
     manifest,
     [gate_retention],
     phase_code="RETENTION_GATE"
     )

9. Authority context, comparison basis, parity, and parity gate

   * filing_calculation = None

   * amendment_calc = None

   * comparison_basis = RESOLVE_AUTHORITY_COMPARISON_BASIS(
     runtime_scope,
     authority_state,
     authority_views,
     known_submission_lineage,
     cfg.parity_rules,
     provider_contract_profile=cfg.provider_contract_profile_ref
     )

   * if comparison_basis.requires_authority_calculation:
     calc_result = EXECUTE_AUTHORITY_CALCULATION_FLOW(
     manifest,
     principal,
     client_id,
     authority_state,
     calculation_type=comparison_basis.calculation_type,
     authority_operation_profile=cfg.authority_operation_profile,
     delivery_mode="OUTBOX_WITH_IDEMPOTENT_RECOVERY",
     order_domain_key=HASH(
     tenant_id,
     client_id,
     period,
     comparison_basis.target_obligation_ref if exists(comparison_basis.target_obligation_ref) else comparison_basis.calculation_type,
     ordered(runtime_scope)
     ),
     inline_budget=EXECUTION_SLO(cfg, "AUTHORITY_INLINE")
     )

     if calc_result.calculation_type == "intent-to-amend":
     amendment_calc = calc_result

     ```
     if amendment_calc.validation_outcome != PASS:
       baseline = SELECT_DRIFT_BASELINE(
         client_id,
         period,
         authority_state,
         precedence="authority_corrected > amended > filed > out_of_band > working"
       )
       RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

       drift = DETECT_DRIFT(manifest, baseline, cfg.drift_rules)
       WRITE_ARTIFACT(DriftRecord, drift)
       RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)
       RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

       amendment = EVALUATE_AMENDMENT_ELIGIBILITY(drift, baseline, authority_state, cfg.amendment_rules)
       amendment.intent_status = INTENT_SUBMITTED
       amendment.calculation_request_ref = amendment_calc.calculation_request_ref
       amendment.calculation_id = amendment_calc.calculation_id
       amendment.calculation_type = amendment_calc.calculation_type
       amendment.calculation_hash = amendment_calc.calculation_hash
       amendment.calculation_basis_ref = amendment_calc.calculation_basis_ref
       amendment.user_confirmation_ref = amendment_calc.user_confirmation_ref
       amendment.validation_outcome = amendment_calc.validation_outcome

       amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment)
       UPDATE_MANIFEST_OUTPUTS(
         manifest,
         drift_refs=[drift.drift_id],
         output_refs={"amendment_case_id": amendment_case.amendment_case_id}
       )
       RECORD_EVENT(IntentToAmendTriggered, manifest.manifest_id, amendment_case.amendment_case_id)

       SYNC_LIVE_EXPERIENCE(
         manifest,
         cause_ref="IntentToAmendTriggered",
         surface_updates=[
           SURFACE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="INTENT_TRIGGERED")),
           SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
         ],
         posture_state="CONTAINED",
         semantic_motion="RIPPLE"
       )

       amendment_gate = AMENDMENT_GATE(
         baseline,
         amendment.window_state,
         drift.classification,
         amendment.intent_status if exists(amendment.intent_status) else amendment_case.lifecycle_state,
         authority_state,
         runtime_scope,
         amendment_readiness_context=amendment_calc
       )

       WRITE_ARTIFACT(GateDecisionRecord, amendment_gate)
       RECORD_EVENT(GateEvaluated, manifest.manifest_id, amendment_gate.gate_code)
       APPEND_MANIFEST_GATES(manifest, [amendment_gate])
       non_access_gate_records = non_access_gate_records + [amendment_gate]

       SYNC_LIVE_EXPERIENCE_FROM_GATES(
         manifest,
         [amendment_gate],
         phase_code="AMENDMENT_READINESS_EARLY"
       )

       actions = PLAN_WORKFLOW(
         non_access_gate_records,
         None,
         risk,
         None,
         drift,
         snapshot,
         cfg.workflow_rules
       )
       workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
       if workflow_item_refs != []:
         RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
         SYNC_LIVE_EXPERIENCE(
           manifest,
           cause_ref="WorkflowOpened",
           surface_updates=[
             SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
           ],
           posture_state="CONTAINED",
           semantic_motion="ECHO"
         )

       bundle = DecisionBundle(
         manifest_id=manifest.manifest_id,
         decision_status=(
           "BLOCKED"
           if GATE_BLOCKS_PROGRESS(amendment_gate)
              or amendment_calc.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
           else "REVIEW_REQUIRED"
         ),
         snapshot_id=snapshot.snapshot_id,
         compute_id=compute.compute_id,
         risk_id=risk.risk_id,
         workflow_item_refs=workflow_item_refs
       )

       return FINALIZE_TERMINAL_OUTCOME(
         manifest,
         bundle,
         terminal_reasons=[amendment_gate, amendment_calc.validation_outcome],
         gate_records=non_access_gate_records,
         graph=graph,
         drift=drift,
         retention_profile=cfg.retention_profile
       )

     comparison_basis = MERGE_COMPARISON_BASIS(comparison_basis, amendment_calc)
     ```

     else:
     filing_calculation = calc_result

     ```
     if filing_calculation.validation_outcome != PASS:
       if wants_prepare_submission or wants_submit or wants_amendment_submit:
         early_filing_gate = FILING_GATE(
           access_decision,
           manifest.lifecycle_state,
           mode,
           None,
           None,
           upstream_gate_records=non_access_gate_records,
           obligation_status=OBLIGATION_STATUS(authority_state),
           filing_packet_state=None,
           authority_link_state=authority_link_state,
           approval_state=pretrust_approval_state,
           declared_basis_ack_state=NOT_APPLICABLE,
           runtime_scope=runtime_scope,
           amendment_posture=None,
           overrides=LOAD_OVERRIDES(active_override_refs),
           filing_notice_steps=[],
           late_data_status=late_data_status,
           late_data_policy_bindings=late_data_policy_bindings,
           filing_readiness_context=filing_calculation
         )

         WRITE_ARTIFACT(GateDecisionRecord, early_filing_gate)
         RECORD_EVENT(GateEvaluated, manifest.manifest_id, early_filing_gate.gate_code)
         APPEND_MANIFEST_GATES(manifest, [early_filing_gate])
         non_access_gate_records = non_access_gate_records + [early_filing_gate]

         SYNC_LIVE_EXPERIENCE_FROM_GATES(
           manifest,
           [early_filing_gate],
           phase_code="EARLY_FILING_READINESS"
         )

         bundle = DecisionBundle(
           manifest_id=manifest.manifest_id,
           decision_status=(
             "BLOCKED"
             if GATE_BLOCKS_PROGRESS(early_filing_gate)
                or filing_calculation.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
             else "REVIEW_REQUIRED"
           ),
           snapshot_id=snapshot.snapshot_id,
           compute_id=compute.compute_id,
           risk_id=risk.risk_id,
           workflow_item_refs=[]
         )

         return FINALIZE_TERMINAL_OUTCOME(
           manifest,
           bundle,
           terminal_reasons=[early_filing_gate, filing_calculation.validation_outcome],
           gate_records=non_access_gate_records,
           graph=graph,
           retention_profile=cfg.retention_profile
         )

       bundle = DecisionBundle(
         manifest_id=manifest.manifest_id,
         decision_status=(
           "BLOCKED"
           if filing_calculation.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
           else "REVIEW_REQUIRED"
         ),
         snapshot_id=snapshot.snapshot_id,
         compute_id=compute.compute_id,
         risk_id=risk.risk_id,
         workflow_item_refs=[]
       )

       return FINALIZE_TERMINAL_OUTCOME(
         manifest,
         bundle,
         terminal_reasons=[filing_calculation.validation_outcome],
         gate_records=non_access_gate_records,
         graph=graph,
         retention_profile=cfg.retention_profile
       )

     comparison_basis = MERGE_COMPARISON_BASIS(comparison_basis, filing_calculation)
     ```

   * parity = EVALUATE_PARITY(
     snapshot,
     compute,
     authority_views,
     comparison_basis,
     cfg.parity_rules
     )

   * WRITE_ARTIFACT(ParityResult, parity)

   * RECORD_EVENT(ParityEvaluated, manifest.manifest_id, parity.parity_id)

   * gate_parity = PARITY_GATE(
     parity,
     cfg.parity_rules,
     overrides=LOAD_OVERRIDES(active_override_refs)
     )

   * WRITE_ARTIFACT(GateDecisionRecord, gate_parity)

   * RECORD_EVENT(GateEvaluated, manifest.manifest_id, gate_parity.gate_code)

   * APPEND_MANIFEST_GATES(manifest, [gate_parity])

   * non_access_gate_records = non_access_gate_records + [gate_parity]

   * SYNC_LIVE_EXPERIENCE_FROM_GATES(
     manifest,
     [gate_parity],
     phase_code="PARITY_GATE"
     )

10. Drift posture and amendment posture preparation

* amendment_gate = None

* amendment_case = None

* baseline = SELECT_DRIFT_BASELINE(
  client_id,
  period,
  authority_state,
  precedence="authority_corrected > amended > filed > out_of_band > working"
  )

* RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

* drift = DETECT_DRIFT(manifest, baseline, cfg.drift_rules)

* WRITE_ARTIFACT(DriftRecord, drift)

* RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)

* RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

* amendment = EVALUATE_AMENDMENT_ELIGIBILITY(drift, baseline, authority_state, cfg.amendment_rules)

* amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment)

* RECORD_EVENT(AmendmentEligibilityEvaluated, manifest.manifest_id, amendment_case.amendment_case_id)

* UPDATE_MANIFEST_OUTPUTS(
  manifest,
  drift_refs=[drift.drift_id],
  output_refs={"amendment_case_id": amendment_case.amendment_case_id}
  )

* SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="DriftDetected",
  surface_updates=[
  SURFACE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="ELIGIBILITY_EVALUATED")),
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
  ],
  posture_state="CONTAINED" if drift.materiality_class in {MATERIAL_REVIEW, AMENDMENT_REQUIRED} or amendment.eligible else "STREAMING",
  semantic_motion="RIPPLE"
  )

* if wants_amendment_submit and amendment_case.lifecycle_state != READY_TO_AMEND:
  amendment_case = LOAD_AMENDMENT_CASE(client_id, period, manifest)
  if not exists(amendment_case): return FINALIZE_RUN_FAILURE(manifest, AMENDMENT_CASE_NOT_FOUND)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})

* no `AMENDMENT_GATE` may be evaluated in this step

11. Trust synthesis and command-side case state

* filing_notice_steps = []

* baseline_submission_state = BASELINE_SUBMISSION_STATE(authority_state, known_submission_lineage, baseline)

* live_authority_progression_requested = wants_prepare_submission or wants_submit or wants_amendment_submit

* pre_trust_human_steps = DERIVE_REQUIRED_HUMAN_STEPS(
  runtime_scope,
  mode,
  authority_state,
  authority_link_state,
  pretrust_approval_state,
  parity,
  amendment_case if exists(amendment_case) else amendment
  )

* trust = SYNTHESIZE_TRUST(
  snapshot,
  compute,
  risk,
  parity,
  graph.quality,
  baseline_submission_state=baseline_submission_state,
  live_authority_progression_requested=live_authority_progression_requested,
  required_human_steps=pre_trust_human_steps,
  upstream_gates=non_access_gate_records,
  cfg.trust_policy,
  overrides=LOAD_OVERRIDES(active_override_refs)
  )

* WRITE_ARTIFACT(TrustSummary, trust)

* RECORD_EVENT(TrustSynthesized, manifest.manifest_id, trust.trust_id)

* gate_trust = TRUST_GATE(
  non_access_gate_records,
  trust,
  required_human_steps=pre_trust_human_steps
  )

* WRITE_ARTIFACT(GateDecisionRecord, gate_trust)

* RECORD_EVENT(GateEvaluated, manifest.manifest_id, gate_trust.gate_code)

* APPEND_MANIFEST_GATES(manifest, [gate_trust])

* non_access_gate_records = non_access_gate_records + [gate_trust]

* filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet=None,
  submission=None,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation
  )

* UPDATE_MANIFEST_OUTPUTS(
  manifest,
  output_refs={
  "parity_id": parity.parity_id,
  "trust_id": trust.trust_id,
  "filing_case_id": filing_case.filing_case_id
  }
  )

* if exists(amendment_case):
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})

* SYNC_LIVE_EXPERIENCE_FROM_GATES(
  manifest,
  [gate_trust],
  phase_code="TRUST_GATE"
  )

* SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="TrustSynthesized",
  surface_updates=[
  SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="TRUST_READY", gate_summary=non_access_gate_records)),
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet=None, filing_case=filing_case, status="NOT_STARTED"))
  ],
  posture_state="CONTAINED" if GATE_REQUIRES_REVIEW(gate_trust) else ("FRACTURED" if GATE_BLOCKS_PROGRESS(gate_trust) else "STREAMING"),
  semantic_motion="TRACE" if gate_trust.decision in {PASS, PASS_WITH_NOTICE} else ("FRACTURE" if GATE_BLOCKS_PROGRESS(gate_trust) else "ECHO")
  )

12. Workflow planning and immediate consequence refresh

* actions = PLAN_WORKFLOW(
  non_access_gate_records,
  trust,
  risk,
  parity,
  drift,
  snapshot,
  cfg.workflow_rules
  )

* workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)

* if workflow_item_refs != []:
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  surface_updates=[
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

13. Publish live read-model projections and conditionally terminalize on trust posture

* projection_dag = BUILD_STAGE_DAG(
  manifest,
  stage_group="LIVE_READ_MODEL_PROJECTIONS",
  nodes=[
  OPTIONAL_STAGE_TASK(
  stage_code="BUILD_TWIN_VIEW",
  task_key=HASH(manifest.manifest_id, "BUILD_TWIN_VIEW", snapshot.snapshot_id, compute.compute_id, parity.parity_id, risk.risk_id, trust.trust_id, ordered(runtime_scope)),
  order_domain_key=HASH(manifest.manifest_id, "LIVE_READ_MODEL_PROJECTIONS", "BUILD_TWIN_VIEW"),
  payload_ref={
  "snapshot_id": snapshot.snapshot_id,
  "compute_id": compute.compute_id,
  "parity_id": parity.parity_id,
  "risk_id": risk.risk_id,
  "trust_id": trust.trust_id,
  "runtime_scope": runtime_scope,
  "projection_masking_context": masking_context
  }
  ),
  OPTIONAL_STAGE_TASK(
  stage_code="BUILD_FOCUS_LENS_INDEX",
  task_key=HASH(manifest.manifest_id, "BUILD_FOCUS_LENS_INDEX", graph.graph_id, ordered(non_access_gate_records)),
  order_domain_key=HASH(manifest.manifest_id, "LIVE_READ_MODEL_PROJECTIONS", "BUILD_FOCUS_LENS_INDEX"),
  payload_ref={
  "graph_id": graph.graph_id,
  "gate_refs": EXTRACT_GATE_IDS(non_access_gate_records),
  "snapshot_id": snapshot.snapshot_id
  }
  ),
  OPTIONAL_STAGE_TASK(
  stage_code="BUILD_LIVE_EXPERIENCE_FRAME",
  task_key=HASH(
  manifest.manifest_id,
  "BUILD_LIVE_EXPERIENCE_FRAME",
  snapshot.snapshot_id,
  compute.compute_id,
  risk.risk_id,
  parity.parity_id,
  trust.trust_id,
  graph.graph_id,
  ordered(workflow_item_refs),
  ordered(non_access_gate_records)
  ),
  order_domain_key=HASH(manifest.manifest_id, "LIVE_READ_MODEL_PROJECTIONS", "BUILD_LIVE_EXPERIENCE_FRAME"),
  payload_ref={
  "manifest_id": manifest.manifest_id,
  "runtime_scope": runtime_scope,
  "mode": mode,
  "experience_profile": "LOW_NOISE",
  "workflow_item_refs": workflow_item_refs,
  "projection_masking_context": masking_context,
  "surface_order": [
  "CONTEXT_BAR",
  "DECISION_SUMMARY",
  "ACTION_STRIP",
  "DETAIL_DRAWER",
  "PULSE_SPINE",
  "MANIFEST_RIBBON",
  "HANDOFF_BATON",
  "DECISION_STAGE",
  "CONSEQUENCE_RAIL",
  "EVIDENCE_TIDE",
  "PACKET_FORGE",
  "AUTHORITY_TUNNEL",
  "DRIFT_FIELD",
  "FOCUS_LENS",
  "TWIN_PANEL"
  ]
  }
  )
  ]
  )

* PERSIST_STAGE_DAG_AND_OUTBOX(manifest, projection_dag)

* projection_outputs = AWAIT_STAGE_DAG(
  manifest,
  stage_group="LIVE_READ_MODEL_PROJECTIONS",
  timeout=PROJECTION_INLINE_BUDGET(cfg),
  allow_result_reuse=true,
  on_timeout="CONTINUE_WITHOUT_PROJECTION"
  )

* if HAS_STAGE_ARTIFACT(projection_outputs, stage_code="BUILD_TWIN_VIEW"):
  twin = ADOPT_PERSISTED_STAGE_ARTIFACT(
  projection_outputs,
  stage_code="BUILD_TWIN_VIEW",
  artifact_type=TwinView
  )
  RECORD_EVENT(TwinBuilt, manifest.manifest_id, twin.twin_id)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"twin_id": twin.twin_id})

* if HAS_STAGE_RESULT(projection_outputs, stage_code="BUILD_FOCUS_LENS_INDEX"):
  focus_lens_index = LOAD_STAGE_RESULT(projection_outputs, stage_code="BUILD_FOCUS_LENS_INDEX")

* if HAS_STAGE_RESULT(projection_outputs, stage_code="BUILD_LIVE_EXPERIENCE_FRAME"):
  experience_frame = LOAD_STAGE_RESULT(projection_outputs, stage_code="BUILD_LIVE_EXPERIENCE_FRAME")
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="ExperienceFrameRefreshed",
  surface_updates=experience_frame.surface_updates,
  posture_state=experience_frame.posture_state,
  semantic_motion=experience_frame.semantic_motion
  )

* if exists(twin):
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="TwinBuilt",
  surface_updates=[
  SURFACE_UPDATE("TWIN_PANEL", BUILD_TWIN_PANEL_STATE(twin, parity, trust))
  ],
  posture_state="STREAMING",
  semantic_motion="TRACE"
  )

* if exists(focus_lens_index):
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="FocusLensIndexed",
  surface_updates=[
  SURFACE_UPDATE("FOCUS_LENS", BUILD_FOCUS_LENS_STATE(available=true, graph_ref=graph.graph_id, index_ref=focus_lens_index.index_ref if exists(focus_lens_index.index_ref) else None))
  ],
  posture_state="STREAMING",
  semantic_motion="ECHO"
  )

* trust_terminal_requires_block = GATE_BLOCKS_PROGRESS(gate_trust)

* trust_terminal_requires_review = GATE_REQUIRES_REVIEW(gate_trust)

* later_amendment_gate_required = wants_amendment_intent or wants_amendment_submit

* later_filing_gate_required = wants_prepare_submission or wants_submit or wants_amendment_submit

* if not later_amendment_gate_required and not later_filing_gate_required:
  if trust_terminal_requires_block:
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="BLOCKED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[gate_trust],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  if trust_terminal_requires_review:
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="REVIEW_REQUIRED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[gate_trust],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

14. Amendment gate and intent-to-amend progression

* if wants_amendment_intent or wants_amendment_submit:
  amendment_gate = AMENDMENT_GATE(
  baseline,
  amendment.window_state,
  drift.classification,
  amendment.intent_status if exists(amendment.intent_status) else amendment_case.lifecycle_state,
  authority_state,
  runtime_scope
  )

  WRITE_ARTIFACT(GateDecisionRecord, amendment_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, amendment_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [amendment_gate])
  non_access_gate_records = non_access_gate_records + [amendment_gate]

  SYNC_LIVE_EXPERIENCE_FROM_GATES(
  manifest,
  [amendment_gate],
  phase_code="AMENDMENT_GATE"
  )

  actions = PLAN_WORKFLOW(
  non_access_gate_records,
  trust,
  risk,
  parity,
  drift,
  snapshot,
  cfg.workflow_rules
  )
  workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
  if workflow_item_refs != []:
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  surface_updates=[
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

  if wants_amendment_intent:
  if GATE_BLOCKS_PROGRESS(amendment_gate):
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="BLOCKED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[amendment_gate],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  ```
  if GATE_REQUIRES_REVIEW(amendment_gate):
    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status="REVIEW_REQUIRED",
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[amendment_gate],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )

  if trust_terminal_requires_block:
    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status="BLOCKED",
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[gate_trust, amendment_gate],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )

  if trust_terminal_requires_review:
    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status="REVIEW_REQUIRED",
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[gate_trust, amendment_gate],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )
  ```

  if wants_amendment_intent and amendment_gate.decision in {PASS, PASS_WITH_NOTICE}:
  amendment_calc = EXECUTE_AUTHORITY_CALCULATION_FLOW(
  manifest,
  principal,
  client_id,
  authority_state,
  calculation_type="intent-to-amend",
  authority_operation_profile=cfg.authority_operation_profile,
  delivery_mode="OUTBOX_WITH_IDEMPOTENT_RECOVERY",
  order_domain_key=HASH(tenant_id, client_id, period, "intent-to-amend", ordered(runtime_scope)),
  inline_budget=EXECUTION_SLO(cfg, "AUTHORITY_INLINE")
  )

  ```
  amendment.intent_status = INTENT_SUBMITTED
  amendment.calculation_request_ref = amendment_calc.calculation_request_ref
  amendment.calculation_id = amendment_calc.calculation_id
  amendment.calculation_type = amendment_calc.calculation_type
  amendment.calculation_hash = amendment_calc.calculation_hash
  amendment.calculation_basis_ref = amendment_calc.calculation_basis_ref
  amendment.user_confirmation_ref = amendment_calc.user_confirmation_ref
  amendment.validation_outcome = amendment_calc.validation_outcome

  amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})
  RECORD_EVENT(IntentToAmendTriggered, manifest.manifest_id, amendment_case.amendment_case_id)

  SYNC_LIVE_EXPERIENCE(
    manifest,
    cause_ref="IntentToAmendTriggered",
    surface_updates=[
      SURFACE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="INTENT_SUBMITTED")),
      SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
    ],
    posture_state="CONTAINED",
    semantic_motion="RIPPLE"
  )

  if amendment_calc.validation_outcome == PASS:
    amendment.intent_status = READY_TO_AMEND
    amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment)
    UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})
    RECORD_EVENT(IntentToAmendValidated, manifest.manifest_id, amendment_case.amendment_case_id)

    SYNC_LIVE_EXPERIENCE(
      manifest,
      cause_ref="IntentToAmendValidated",
      surface_updates=[
        SURFACE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="READY_TO_AMEND"))
      ],
      posture_state="BRIDGED",
      semantic_motion="BRIDGE"
    )

  else:
    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status=(
        "BLOCKED"
        if amendment_calc.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
        else "REVIEW_REQUIRED"
      ),
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[amendment_gate, amendment_calc.validation_outcome],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )
  ```

  if wants_amendment_submit:
  # do not terminalize here from amendment posture
  # amendment-derived block/review posture remains upstream input to `FILING_GATE`
  pass

15. Authority calculation, filing readiness, packet preparation, and filing gate

* packet = None

* filing_gate = None

* if wants_prepare_submission or wants_submit or wants_amendment_submit:

  if mode != COMPLIANCE:
  filing_gate = FILING_GATE(
  access_decision,
  manifest.lifecycle_state,
  mode,
  trust,
  parity,
  upstream_gate_records=non_access_gate_records,
  obligation_status=OBLIGATION_STATUS(authority_state),
  filing_packet_state=None,
  authority_link_state=authority_link_state,
  approval_state=pretrust_approval_state,
  declared_basis_ack_state=NOT_APPLICABLE,
  runtime_scope=runtime_scope,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  overrides=LOAD_OVERRIDES(active_override_refs),
  filing_notice_steps=[],
  late_data_status=late_data_status,
  late_data_policy_bindings=late_data_policy_bindings,
  filing_readiness_context=None
  )
  WRITE_ARTIFACT(GateDecisionRecord, filing_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, filing_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [filing_gate])
  non_access_gate_records = non_access_gate_records + [filing_gate]

  ```
  SYNC_LIVE_EXPERIENCE_FROM_GATES(
    manifest,
    [filing_gate],
    phase_code="FILING_GATE_MODE_BLOCK"
  )

  actions = PLAN_WORKFLOW(non_access_gate_records, trust, risk, parity, drift, snapshot, cfg.workflow_rules)
  workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
  if workflow_item_refs != []:
    RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
    SYNC_LIVE_EXPERIENCE(
      manifest,
      cause_ref="WorkflowOpened",
      surface_updates=[
        SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
      ],
      posture_state="CONTAINED",
      semantic_motion="ECHO"
    )

  bundle = DecisionBundle(
    manifest_id=manifest.manifest_id,
    decision_status="BLOCKED",
    snapshot_id=snapshot.snapshot_id,
    compute_id=compute.compute_id,
    risk_id=risk.risk_id,
    parity_id=parity.parity_id,
    trust_id=trust.trust_id,
    graph_id=graph.graph_id,
    twin_id=twin.twin_id if exists(twin) else None,
    workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
    manifest,
    bundle,
    terminal_reasons=[filing_gate],
    gate_records=non_access_gate_records,
    graph=graph,
    drift=drift,
    retention_profile=cfg.retention_profile
  )
  ```

  prepacket_terminal_required = any(
  GATE_BLOCKS_PROGRESS(g) or GATE_REQUIRES_REVIEW(g)
  for g in non_access_gate_records
  )

  if prepacket_terminal_required:
  filing_gate = FILING_GATE(
  access_decision,
  manifest.lifecycle_state,
  mode,
  trust,
  parity,
  upstream_gate_records=non_access_gate_records,
  obligation_status=OBLIGATION_STATUS(authority_state),
  filing_packet_state=None,
  authority_link_state=authority_link_state,
  approval_state=pretrust_approval_state,
  declared_basis_ack_state=NOT_APPLICABLE,
  runtime_scope=runtime_scope,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  overrides=LOAD_OVERRIDES(active_override_refs),
  filing_notice_steps=[],
  late_data_status=late_data_status,
  late_data_policy_bindings=late_data_policy_bindings,
  filing_readiness_context=None
  )
  WRITE_ARTIFACT(GateDecisionRecord, filing_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, filing_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [filing_gate])
  non_access_gate_records = non_access_gate_records + [filing_gate]

  ```
  SYNC_LIVE_EXPERIENCE_FROM_GATES(
    manifest,
    [filing_gate],
    phase_code="FILING_GATE_PREPACKET"
  )

  actions = PLAN_WORKFLOW(non_access_gate_records, trust, risk, parity, drift, snapshot, cfg.workflow_rules)
  workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
  if workflow_item_refs != []:
    RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
    SYNC_LIVE_EXPERIENCE(
      manifest,
      cause_ref="WorkflowOpened",
      surface_updates=[
        SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
      ],
      posture_state="CONTAINED",
      semantic_motion="ECHO"
    )

  bundle = DecisionBundle(
    manifest_id=manifest.manifest_id,
    decision_status="BLOCKED" if GATE_BLOCKS_PROGRESS(filing_gate) else "REVIEW_REQUIRED",
    snapshot_id=snapshot.snapshot_id,
    compute_id=compute.compute_id,
    risk_id=risk.risk_id,
    parity_id=parity.parity_id,
    trust_id=trust.trust_id,
    graph_id=graph.graph_id,
    twin_id=twin.twin_id if exists(twin) else None,
    workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
    manifest,
    bundle,
    terminal_reasons=[filing_gate],
    gate_records=non_access_gate_records,
    graph=graph,
    drift=drift,
    retention_profile=cfg.retention_profile
  )
  ```

  if reporting_scope == "year_end" and not wants_amendment_submit and filing_calculation is None:
  filing_calculation = EXECUTE_AUTHORITY_CALCULATION_FLOW(
  manifest,
  principal,
  client_id,
  authority_state,
  calculation_type="intent-to-finalise",
  authority_operation_profile=cfg.authority_operation_profile,
  delivery_mode="OUTBOX_WITH_IDEMPOTENT_RECOVERY",
  order_domain_key=HASH(tenant_id, client_id, period, "intent-to-finalise", ordered(runtime_scope)),
  inline_budget=EXECUTION_SLO(cfg, "AUTHORITY_INLINE")
  )

  ```
  filing_case = UPSERT_FILING_CASE(
    manifest,
    trust,
    parity,
    packet=None,
    submission=None,
    amendment_posture=amendment_case if exists(amendment_case) else amendment,
    calculation_context=filing_calculation
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"filing_case_id": filing_case.filing_case_id})

  if filing_calculation.validation_outcome != PASS:
    filing_gate = FILING_GATE(
      access_decision,
      manifest.lifecycle_state,
      mode,
      trust,
      parity,
      upstream_gate_records=non_access_gate_records,
      obligation_status=OBLIGATION_STATUS(authority_state),
      filing_packet_state=None,
      authority_link_state=authority_link_state,
      approval_state=pretrust_approval_state,
      declared_basis_ack_state=NOT_APPLICABLE,
      runtime_scope=runtime_scope,
      amendment_posture=amendment_case if exists(amendment_case) else amendment,
      overrides=LOAD_OVERRIDES(active_override_refs),
      filing_notice_steps=[],
      late_data_status=late_data_status,
      late_data_policy_bindings=late_data_policy_bindings,
      filing_readiness_context=filing_calculation
    )
    WRITE_ARTIFACT(GateDecisionRecord, filing_gate)
    RECORD_EVENT(GateEvaluated, manifest.manifest_id, filing_gate.gate_code)
    APPEND_MANIFEST_GATES(manifest, [filing_gate])
    non_access_gate_records = non_access_gate_records + [filing_gate]

    SYNC_LIVE_EXPERIENCE_FROM_GATES(
      manifest,
      [filing_gate],
      phase_code="FILING_GATE_YEAR_END_CALC"
    )

    actions = PLAN_WORKFLOW(non_access_gate_records, trust, risk, parity, drift, snapshot, cfg.workflow_rules)
    workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
    if workflow_item_refs != []:
      RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
      SYNC_LIVE_EXPERIENCE(
        manifest,
        cause_ref="WorkflowOpened",
        surface_updates=[
          SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
        ],
        posture_state="CONTAINED",
        semantic_motion="ECHO"
      )

    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status=(
        "BLOCKED"
        if GATE_BLOCKS_PROGRESS(filing_gate)
           or filing_calculation.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
        else "REVIEW_REQUIRED"
      ),
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[filing_gate],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )
  ```

  if wants_amendment_submit:
  if not (exists(amendment_case) and amendment_case.lifecycle_state == READY_TO_AMEND): return ERROR(AMENDMENT_CASE_NOT_READY_TO_SUBMIT)
  filing_calculation = amendment_case

  packet = BUILD_FILING_PACKET(
  snapshot,
  compute,
  parity,
  trust,
  cfg.submission_format,
  runtime_scope=runtime_scope,
  calculation_basis_ref=filing_calculation.calculation_basis_ref if exists(filing_calculation) and exists(filing_calculation.calculation_basis_ref) else None,
  authority_calculation_ref=filing_calculation.calculation_id if exists(filing_calculation) and exists(filing_calculation.calculation_id) else None
  )

  if packet.manifest_binding_hash != HASH(manifest.hash_set.manifest_hash, packet.payload_hash): return FINALIZE_RUN_FAILURE(manifest, FILING_PACKET_MANIFEST_BINDING_MISMATCH)

  WRITE_ARTIFACT(FilingPacket, packet)
  RECORD_EVENT(FilingPacketPrepared, manifest.manifest_id, packet.packet_id)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="FilingPacketPrepared",
  surface_updates=[
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case if exists(filing_case) else None, status="PREPARED"))
  ],
  posture_state="FROZEN",
  semantic_motion="SEAL"
  )

  approval_state = APPROVAL_STATE(
  principal,
  runtime_scope,
  required_approvals=access_decision.required_approvals,
  packet=packet,
  phase=PACKET
  )

  declared_basis_ack_state = DECLARED_BASIS_ACK_STATE(principal, runtime_scope, packet)

  filing_notice_steps = DERIVE_PACKET_NOTICE_STEPS(
  packet,
  principal,
  runtime_scope,
  approval_state,
  declared_basis_ack_state,
  access_decision.required_approvals
  )

  filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet,
  submission=None,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation
  )

  UPDATE_MANIFEST_OUTPUTS(
  manifest,
  output_refs={
  "filing_packet_id": packet.packet_id,
  "filing_case_id": filing_case.filing_case_id
  }
  )

  filing_gate = FILING_GATE(
  access_decision,
  manifest.lifecycle_state,
  mode,
  trust,
  parity,
  upstream_gate_records=non_access_gate_records,
  obligation_status=OBLIGATION_STATUS(authority_state),
  filing_packet_state=packet.lifecycle_state,
  authority_link_state=authority_link_state,
  approval_state=approval_state,
  declared_basis_ack_state=declared_basis_ack_state,
  runtime_scope=runtime_scope,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  overrides=LOAD_OVERRIDES(active_override_refs),
  filing_notice_steps=filing_notice_steps,
  late_data_status=late_data_status,
  late_data_policy_bindings=late_data_policy_bindings,
  filing_readiness_context=filing_calculation if exists(filing_calculation) else None
  )

  WRITE_ARTIFACT(GateDecisionRecord, filing_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, filing_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [filing_gate])
  non_access_gate_records = non_access_gate_records + [filing_gate]

  SYNC_LIVE_EXPERIENCE_FROM_GATES(
  manifest,
  [filing_gate],
  phase_code="FILING_GATE"
  )

  actions = PLAN_WORKFLOW(non_access_gate_records, trust, risk, parity, drift, snapshot, cfg.workflow_rules)
  workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
  if workflow_item_refs != []:
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  surface_updates=[
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

  if GATE_BLOCKS_PROGRESS(filing_gate):
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="BLOCKED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  filing_packet_id=packet.packet_id,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[filing_gate],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  if GATE_REQUIRES_REVIEW(filing_gate):
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="REVIEW_REQUIRED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  filing_packet_id=packet.packet_id,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[filing_gate],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  if filing_gate.decision == PASS_WITH_NOTICE:
  notice_resolution = RESOLVE_FILING_NOTICES(
  packet,
  principal,
  runtime_scope,
  filing_notice_steps
  )
  approval_state = notice_resolution.approval_state
  declared_basis_ack_state = notice_resolution.declared_basis_ack_state
  if not notice_resolution.notice_requirements_satisfied: return FINALIZE_RUN_FAILURE(manifest, FILING_NOTICE_RESOLUTION_INCOMPLETE)
  if approval_state not in {NOT_REQUIRED, SATISFIED}: return ERROR(FILING_APPROVAL_UNRESOLVED_AFTER_NOTICE)
  if declared_basis_ack_state not in {NOT_REQUIRED, SATISFIED}: return ERROR(FILING_DECLARED_BASIS_ACK_UNRESOLVED_AFTER_NOTICE)
  if exists(notice_resolution.notice_refs):
  UPDATE_MANIFEST_OUTPUTS(manifest, audit_refs=notice_resolution.notice_refs)

  packet = APPROVE_FILING_PACKET(packet, filing_gate, approval_state, declared_basis_ack_state)
  WRITE_ARTIFACT(FilingPacket, packet)

  filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet,
  submission=None,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation
  )

  UPDATE_MANIFEST_OUTPUTS(
  manifest,
  output_refs={
  "filing_packet_id": packet.packet_id,
  "filing_case_id": filing_case.filing_case_id
  }
  )

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="FilingPacketApproved",
  surface_updates=[
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="APPROVED_TO_SUBMIT"))
  ],
  posture_state="FROZEN",
  semantic_motion="SEAL"
  )

16. Submission enqueue, governed transmit, inbox-normalized recovery, and bounded reconciliation

* submission = None

* operation = None

* request = None

* response = None

* interaction = None

* obligation_mirror = None

* reconciliation = None

* if (wants_submit or wants_amendment_submit) and exists(packet) and packet.lifecycle_state == APPROVED_TO_SUBMIT:

  if manifest.lifecycle_state not in {SEALED, IN_PROGRESS}: return ERROR(MANIFEST_NOT_READY_FOR_AUTHORITY_PREFLIGHT)

  operation = RESOLVE_AUTHORITY_OPERATION(
  manifest,
  packet,
  runtime_scope,
  cfg.authority_operation_profile
  )
  WRITE_ARTIFACT(AuthorityOperation, operation)
  RECORD_EVENT(AuthorityOperationPlanned, manifest.manifest_id, operation.operation_id)

  binding = RESOLVE_AUTHORITY_BINDING(
  principal,
  client_id,
  operation,
  cfg.authority_channel
  )
  WRITE_ARTIFACT(AuthorityBinding, binding)

  request_material = CANONICALIZE_AUTHORITY_REQUEST(
  operation,
  binding,
  packet,
  manifest,
  runtime_scope
  )

  request_identity = DERIVE_AUTHORITY_REQUEST_HASHES(
  manifest,
  operation,
  binding,
  request_material,
  access_binding_hash
  )

  request = BUILD_AUTHORITY_REQUEST_ENVELOPE(
  operation,
  binding,
  request_material,
  packet,
  manifest,
  request_body_hash=request_identity.request_body_hash,
  request_hash=request_identity.request_hash,
  idempotency_key=request_identity.idempotency_key,
  access_binding_hash=access_binding_hash
  )

  WRITE_ARTIFACT(AuthorityRequestEnvelope, request)
  RECORD_EVENT(AuthorityRequestBuilt, manifest.manifest_id, request.request_id)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="AuthorityRequestBuilt",
  surface_updates=[
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(operation, request, submission=None, reconciliation=None, status="REQUEST_BUILT"))
  ],
  posture_state="STREAMING",
  semantic_motion="TRACE"
  )

  expected_packet_manifest_binding_hash = HASH(manifest.hash_set.manifest_hash, packet.payload_hash)

  submission_gate = SUBMISSION_GATE(
  packet.payload_hash,
  packet.manifest_binding_hash,
  expected_packet_manifest_binding_hash,
  request.idempotency_key,
  EXISTING_SUBMISSIONS(client_id, operation),
  binding,
  request.request_body_hash,
  packet.lifecycle_state,
  runtime_scope,
  amendment_case if exists(amendment_case) else amendment
  )

  WRITE_ARTIFACT(GateDecisionRecord, submission_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, submission_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [submission_gate])
  non_access_gate_records = non_access_gate_records + [submission_gate]

  SYNC_LIVE_EXPERIENCE_FROM_GATES(
  manifest,
  [submission_gate],
  phase_code="SUBMISSION_GATE"
  )

  actions = PLAN_WORKFLOW(non_access_gate_records, trust, risk, parity, drift, snapshot, cfg.workflow_rules)
  workflow_item_refs = UPSERT_WORKFLOW_ITEMS(actions)
  if workflow_item_refs != []:
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, workflow_item_refs)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  surface_updates=[
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

  if GATE_BLOCKS_PROGRESS(submission_gate):
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="BLOCKED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  filing_packet_id=packet.packet_id,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[submission_gate],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  if GATE_REQUIRES_REVIEW(submission_gate):
  bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status="REVIEW_REQUIRED",
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  filing_packet_id=packet.packet_id,
  workflow_item_refs=workflow_item_refs
  )
  return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=[submission_gate],
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift,
  retention_profile=cfg.retention_profile
  )

  if wants_amendment_submit:
  amendment_case.lifecycle_state = AMEND_SUBMITTED
  amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment_case)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})
  RECORD_EVENT(AmendmentSubmitted, manifest.manifest_id, amendment_case.amendment_case_id)

  transmit_order_domain_key = HASH(
  tenant_id,
  client_id,
  period,
  operation.target_obligation_ref if exists(operation.target_obligation_ref) else operation.operation_family,
  ordered(runtime_scope)
  )

  BEGIN_ATOMIC_TRANSACTION()
  submission = BEGIN_SUBMISSION_RECORD(manifest, operation, request)
  submission = TRANSITION_SUBMISSION_RECORD(submission, event="send_queued")
  WRITE_ARTIFACT(SubmissionRecord, submission)
  UPDATE_MANIFEST_OUTPUTS(manifest, submission_refs=[submission.submission_id])

  PERSIST_OUTBOX_MESSAGE(
  topic="AUTHORITY_TRANSMIT",
  message=BUILD_TRANSMIT_COMMAND(
  manifest,
  operation,
  binding,
  request,
  submission,
  packet,
  runtime_scope
  ),
  order_domain_key=transmit_order_domain_key,
  dedupe_key=request.idempotency_key
  )

  packet = TRANSITION_FILING_PACKET(packet, event="submit_begin")
  WRITE_ARTIFACT(FilingPacket, packet)

  filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet,
  submission,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"filing_case_id": filing_case.filing_case_id})
  COMMIT_ATOMIC_TRANSACTION()

  RECORD_EVENT(SubmissionAttempted, manifest.manifest_id, submission.submission_id)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="SubmissionAttempted",
  surface_updates=[
  SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="LIVE_OBSERVATORY",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="LOCAL_INTENT_ONLY",
  active_phase="AUTHORITY_TRANSMIT",
  checkpoint_state="TRANSMIT_PENDING",
  latest_cause_ref="SubmissionAttempted",
  pending_object_refs=[submission.submission_id, request.request_id]
  )),
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
  operation,
  request,
  submission,
  reconciliation=None,
  status="TRANSMIT_PENDING",
  transport_state="QUEUED",
  authority_state="NOT_YET_OBSERVED",
  truth_origin="INTERNAL_OUTBOX",
  next_checkpoint_at=AUTHORITY_NEXT_CHECKPOINT_AT(cfg, submission, phase="TRANSMIT_PENDING")
  )),
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="SUBMIT_IN_PROGRESS"))
  ],
  posture_state="STREAMING",
  semantic_motion="TRACE"
  )

  recovery = WAIT_FOR_TRANSMIT_OR_RECONCILIATION(
  manifest,
  submission,
  request.idempotency_key,
  timeout=EXECUTION_SLO(cfg, "AUTHORITY_INLINE"),
  allow_idempotent_recovery=true
  )

  if recovery.status == "RESOLVED_RECONCILIATION":
  request = recovery.request if exists(recovery.request) else request
  response = recovery.response if exists(recovery.response) else None
  submission = recovery.submission_record
  interaction = recovery.interaction_record
  authority_state = recovery.authority_state_summary
  reconciliation = RECONCILE_AUTHORITY_STATE(
  submission,
  authority_state.obligation_mirror_ref,
  submission.authority_reference,
  submission.correlation_refs,
  cfg.authority_operation_profile
  )

  else if recovery.status == "TRANSMITTED_AWAITING_ACK":
  request = recovery.request if exists(recovery.request) else request
  response = recovery.response if exists(recovery.response) else None
  submission = recovery.submission_record
  interaction = recovery.interaction_record if exists(recovery.interaction_record) else None

  if exists(interaction):
  WRITE_ARTIFACT(AuthorityInteractionRecord, interaction)

  UPDATE_MANIFEST_OUTPUTS(manifest, submission_refs=[submission.submission_id])

  pending_submission_workflow_ref = EMIT_WORKFLOW_ITEM(
  "TrackSubmissionReconciliation",
  refs=[submission.submission_id, request.request_id, operation.operation_id]
  )
  workflow_item_refs = workflow_item_refs + [pending_submission_workflow_ref]
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, pending_submission_workflow_ref)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="SubmissionAwaitingAuthorityConfirmation",
  surface_updates=[
  SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="LIVE_OBSERVATORY",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="AUTHORITY_PENDING",
  active_phase="AUTHORITY_RECONCILIATION",
  checkpoint_state="PENDING_ACK",
  latest_cause_ref="SubmissionAwaitingAuthorityConfirmation",
  pending_object_refs=[submission.submission_id]
  )),
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
  operation,
  request,
  submission,
  reconciliation=None,
  status="PENDING_ACK",
  transport_state="TRANSMITTED",
  authority_state="AWAITING_CONFIRMATION",
  truth_origin="AUTHORITY_ACK_PENDING",
  next_checkpoint_at=AUTHORITY_NEXT_CHECKPOINT_AT(cfg, submission, phase="PENDING_ACK")
  )),
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="SUBMITTED_PENDING")),
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

  else:
  pending_submission_workflow_ref = EMIT_WORKFLOW_ITEM(
  "TrackTransmitRecovery",
  refs=[submission.submission_id, request.request_id, operation.operation_id]
  )
  workflow_item_refs = workflow_item_refs + [pending_submission_workflow_ref]
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, pending_submission_workflow_ref)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="SubmissionTransmitStillPending",
  surface_updates=[
  SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="LIVE_OBSERVATORY",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="LOCAL_INTENT_ONLY",
  active_phase="AUTHORITY_TRANSMIT",
  checkpoint_state="TRANSMIT_PENDING",
  latest_cause_ref="SubmissionTransmitStillPending",
  pending_object_refs=[submission.submission_id, request.request_id]
  )),
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
  operation,
  request,
  submission,
  reconciliation=None,
  status="TRANSMIT_PENDING",
  transport_state="QUEUED_OR_UNVERIFIED",
  authority_state="NOT_YET_OBSERVED",
  truth_origin="INTERNAL_OUTBOX",
  next_checkpoint_at=AUTHORITY_NEXT_CHECKPOINT_AT(cfg, submission, phase="TRANSMIT_PENDING")
  )),
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

* if exists(reconciliation):
  submission = reconciliation.submission_record
  obligation_mirror = reconciliation.obligation_mirror
  authority_state = reconciliation.authority_state_summary

  RECORD_EVENT(AuthorityReconciliationResolved, manifest.manifest_id, submission.submission_id)

  if reconciliation.outcome == RECONCILED_CONFIRMED:
  RECORD_EVENT(SubmissionConfirmed, manifest.manifest_id, submission.submission_id)
  else if reconciliation.outcome == RECONCILED_REJECTED:
  RECORD_EVENT(SubmissionRejected, manifest.manifest_id, submission.submission_id)
  else if reconciliation.outcome == RECONCILED_OUT_OF_BAND:
  RECORD_EVENT(OutOfBandStateObserved, manifest.manifest_id, submission.submission_id)
  else:
  RECORD_EVENT(SubmissionUnknown, manifest.manifest_id, submission.submission_id)

  RECORD_EVENT(SubmissionReconciled, manifest.manifest_id, submission.submission_id)

  WRITE_ARTIFACT(SubmissionRecord, submission)
  if exists(interaction):
  WRITE_ARTIFACT(AuthorityInteractionRecord, interaction)
  if exists(obligation_mirror):
  UPSERT_OBLIGATION_MIRROR(obligation_mirror)

  UPDATE_MANIFEST_OUTPUTS(manifest, submission_refs=[submission.submission_id])

  filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet,
  submission,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"filing_case_id": filing_case.filing_case_id})

  resolved_authority_status = (
  "CONFIRMED" if reconciliation.outcome == RECONCILED_CONFIRMED
  else ("REJECTED" if reconciliation.outcome == RECONCILED_REJECTED
  else ("OUT_OF_BAND" if reconciliation.outcome == RECONCILED_OUT_OF_BAND else "UNKNOWN"))
  )

  resolved_truth_state = (
  "AUTHORITY_CONFIRMED" if resolved_authority_status == "CONFIRMED"
  else ("AUTHORITY_REJECTED" if resolved_authority_status == "REJECTED"
  else ("AUTHORITY_OUT_OF_BAND" if resolved_authority_status == "OUT_OF_BAND" else "AUTHORITY_UNKNOWN"))
  )

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="SubmissionReconciled",
  surface_updates=[
  SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="LIVE_OBSERVATORY",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="IDLE" if resolved_authority_status == "CONFIRMED" else "WAITING_ON_HUMAN",
  truth_state=resolved_truth_state,
  active_phase="AUTHORITY_RECONCILED",
  checkpoint_state=resolved_authority_status,
  latest_cause_ref="SubmissionReconciled",
  pending_object_refs=[] if resolved_authority_status == "CONFIRMED" else workflow_item_refs
  )),
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
  operation,
  request,
  submission,
  reconciliation,
  status=resolved_authority_status,
  transport_state="TRANSMITTED",
  authority_state=resolved_authority_status,
  truth_origin="AUTHORITY_RECONCILIATION",
  next_checkpoint_at=None
  )),
  SURFACE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="RECONCILED"))
  ],
  posture_state=(
  "BRIDGED" if resolved_authority_status == "CONFIRMED"
  else ("FRACTURED" if resolved_authority_status == "REJECTED" else "CONTAINED")
  ),
  semantic_motion=(
  "BRIDGE" if resolved_authority_status == "CONFIRMED"
  else ("FRACTURE" if resolved_authority_status == "REJECTED" else "ECHO")
  )
  )

  if wants_amendment_submit:
  if reconciliation.outcome == RECONCILED_CONFIRMED:
  amendment_case.lifecycle_state = AMEND_CONFIRMED
  RECORD_EVENT(AmendmentConfirmed, manifest.manifest_id, amendment_case.amendment_case_id)
  else if reconciliation.outcome == RECONCILED_REJECTED:
  amendment_case.lifecycle_state = AMEND_REJECTED
  else:
  amendment_case.lifecycle_state = AMEND_PENDING
  amendment_case = UPSERT_AMENDMENT_CASE(manifest, baseline, drift, amendment_case)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})

17. Post-authority drift monitoring

* if exists(submission) and exists(reconciliation):
  baseline = SELECT_DRIFT_BASELINE(
  client_id,
  period,
  authority_state,
  precedence="authority_corrected > amended > filed > out_of_band > working"
  )
  RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

  drift = DETECT_DRIFT(manifest, baseline, cfg.drift_rules)
  WRITE_ARTIFACT(DriftRecord, drift)
  RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)
  RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

  amendment = EVALUATE_AMENDMENT_ELIGIBILITY(drift, baseline, authority_state, cfg.amendment_rules)
  amendment_case = UPSERT_AMENDMENT_CASE(
  manifest,
  baseline,
  drift,
  amendment_case if exists(amendment_case) else amendment
  )
  RECORD_EVENT(AmendmentEligibilityEvaluated, manifest.manifest_id, amendment_case.amendment_case_id)

  UPDATE_MANIFEST_OUTPUTS(
  manifest,
  drift_refs=[drift.drift_id],
  output_refs={"amendment_case_id": amendment_case.amendment_case_id}
  )

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="PostAuthorityDriftEvaluated",
  surface_updates=[
  SURFACE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="POST_AUTHORITY_EVALUATED")),
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
  ],
  posture_state="CONTAINED" if drift.materiality_class in {MATERIAL_REVIEW, AMENDMENT_REQUIRED} or amendment.eligible else "STREAMING",
  semantic_motion="RIPPLE"
  )

  if drift.materiality_class in {MATERIAL_REVIEW, AMENDMENT_REQUIRED} or amendment.eligible:
  drift_workflow_ref = EMIT_WORKFLOW_ITEM("ReviewDrift/Amendment", refs=drift.provenance)
  workflow_item_refs = workflow_item_refs + [drift_workflow_ref]
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, drift_workflow_ref)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  surface_updates=[
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state="CONTAINED",
  semantic_motion="ECHO"
  )

18. Terminal finalization and return

* final_decision_status = "COMPLETED"

* final_terminal_reasons = []

* if exists(submission) and not exists(reconciliation):
  final_decision_status = "REVIEW_REQUIRED"
  final_terminal_reasons = ["SUBMISSION_PENDING_EXTERNAL_CONFIRMATION", submission.lifecycle_state]

* else if exists(submission):
  if reconciliation.outcome == RECONCILED_CONFIRMED:
  final_decision_status = "COMPLETED"
  else if reconciliation.outcome == RECONCILED_REJECTED:
  final_decision_status = "BLOCKED"
  final_terminal_reasons = [reconciliation.outcome, submission.lifecycle_state]
  else:
  final_decision_status = "REVIEW_REQUIRED"
  final_terminal_reasons = [reconciliation.outcome, submission.lifecycle_state]

* final_posture_state = (
  "BRIDGED" if final_decision_status == "COMPLETED"
  else ("FRACTURED" if final_decision_status == "BLOCKED" else "CONTAINED")
  )

* final_semantic_motion = (
  "BRIDGE" if final_decision_status == "COMPLETED"
  else ("FRACTURE" if final_decision_status == "BLOCKED" else "ECHO")
  )

* authority_tunnel_terminal_status = (
  submission.lifecycle_state if exists(submission)
  else ("REQUEST_BUILT" if exists(request) else "NOT_STARTED")
  )

* terminal_truth_state = (
  "AUTHORITY_CONFIRMED" if authority_tunnel_terminal_status == "CONFIRMED"
  else ("AUTHORITY_REJECTED" if authority_tunnel_terminal_status == "REJECTED"
  else ("AUTHORITY_OUT_OF_BAND" if authority_tunnel_terminal_status == "OUT_OF_BAND"
  else ("AUTHORITY_UNKNOWN" if authority_tunnel_terminal_status == "UNKNOWN"
  else ("AUTHORITY_PENDING" if authority_tunnel_terminal_status in {"TRANSMITTED", "PENDING_ACK"}
  else ("LOCAL_INTENT_ONLY" if authority_tunnel_terminal_status == "TRANSMIT_PENDING" else "PERSISTED_INTERNAL")))))
  )

* terminal_transport_state = (
  "TRANSMITTED" if exists(submission) and submission.lifecycle_state in {PENDING_ACK, CONFIRMED, REJECTED, UNKNOWN, OUT_OF_BAND}
  else (submission.lifecycle_state if exists(submission) else "NOT_STARTED")
  )

* terminal_activity_state = (
  "IDLE" if final_decision_status == "COMPLETED"
  else ("WAITING_ON_AUTHORITY" if authority_tunnel_terminal_status in {"TRANSMIT_PENDING", "TRANSMITTED", "PENDING_ACK"} else "WAITING_ON_HUMAN")
  )

* SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="TerminalFinalization",
  surface_updates=[
  SURFACE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="LIVE_OBSERVATORY",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state=terminal_activity_state,
  truth_state=terminal_truth_state,
  active_phase="TERMINAL",
  checkpoint_state=authority_tunnel_terminal_status,
  latest_cause_ref="TerminalFinalization",
  pending_object_refs=[] if final_decision_status == "COMPLETED" else workflow_item_refs
  )),
  SURFACE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(
  manifest,
  lifecycle_state=("COMPLETED" if final_decision_status in {"COMPLETED", "REVIEW_REQUIRED"} else "BLOCKED"),
  decision_posture=final_decision_status,
  runtime_scope=runtime_scope
  )),
  SURFACE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="TERMINAL", gate_summary=non_access_gate_records)),
  SURFACE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope)),
  SURFACE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
  operation if exists(operation) else None,
  request if exists(request) else None,
  submission if exists(submission) else None,
  reconciliation if exists(reconciliation) else None,
  status=authority_tunnel_terminal_status,
  transport_state=terminal_transport_state,
  authority_state=authority_tunnel_terminal_status,
  truth_origin="TERMINAL_FRAME"
  ))
  ],
  posture_state=final_posture_state,
  semantic_motion=final_semantic_motion,
  is_terminal=true
  )

* bundle = DecisionBundle(
  manifest_id=manifest.manifest_id,
  decision_status=final_decision_status,
  workflow_item_refs=workflow_item_refs,
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  forecast_id=forecast.forecast_id if forecast else None,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  twin_id=twin.twin_id if exists(twin) else None,
  filing_packet_id=packet.packet_id if exists(packet) else None,
  submission_record_id=submission.submission_id if exists(submission) else None
  )

* return FINALIZE_TERMINAL_OUTCOME(
  manifest,
  bundle,
  terminal_reasons=final_terminal_reasons,
  gate_records=non_access_gate_records,
  graph=graph,
  drift=drift if exists(drift) else None,
  authority_refs=(
  [operation.operation_id, request.request_id, interaction.interaction_id] + ([response.response_id] if exists(response) else [])
  ) if exists(operation) and exists(request) and exists(interaction) else [],
  retention_profile=cfg.retention_profile
  )

---

## Execution helper constraints used above

* `CLAIM_MANIFEST_START(...)` SHALL be compare-and-swap protected, SHALL establish a single-writer lease, and SHALL be valid inside the same transaction that publishes the first post-seal command DAG.
* `PERSIST_STAGE_WORKSET_AND_OUTBOX(...)` and `PERSIST_STAGE_DAG_AND_OUTBOX(...)` SHALL atomically persist both the work definition and the outbox messages that make the work visible to workers.
* `AWAIT_STAGE_WORKSET(...)` and `AWAIT_STAGE_DAG(...)` SHALL accept reused task results when `task_key` matches a previously completed attempt for the same manifest lineage.
* `AWAIT_STAGE_DAG(..., on_timeout="CONTINUE_WITHOUT_PROJECTION")` SHALL return completed projection refs plus pending stage refs without failing the command-side run.
* stage workers SHALL persist first-class artifact outputs before they mark a task complete.
* `ADOPT_PERSISTED_STAGE_ARTIFACT(...)` SHALL verify:

  * `manifest_id` matches;
  * artifact type matches the expected type;
  * schema/contract refs are valid for the sealed schema bundle when applicable; and
  * the orchestrator does not re-emit a duplicate artifact body for an already-persisted identical output.
* `MERGE_STAGE_OUTPUTS(..., reduction_strategy="BALANCED_TREE")` SHALL preserve deterministic ordering while avoiding a single monolithic reducer bottleneck when multiple partitions are present.
* `EXECUTE_AUTHORITY_CALCULATION_FLOW(...)` in `delivery_mode="OUTBOX_WITH_IDEMPOTENT_RECOVERY"` SHALL:

  * derive deterministic request and idempotency hashes from frozen inputs;
  * recover an existing equivalent authority interaction before any resend;
  * publish external work through the controlled gateway rather than inline direct calls hidden inside the orchestrator;
  * normalize all inbound provider results through a transactional inbox before applying any state transition;
  * return a deterministic non-`PASS` validation outcome when the inline budget expires without a resolved authoritative result.
* `WAIT_FOR_TRANSMIT_OR_RECONCILIATION(...)` SHALL:

  * first attempt `RECOVER_SUBMISSION_ATTEMPT(...)` using request hash + idempotency key before assuming a resend is required;
  * read only persisted, inbox-normalized authority artifacts when determining recovery state;
  * wait only up to the configured inline budget; and
  * SHALL NOT hold unrelated manifests behind the same queue partition.
* workers consuming `AUTHORITY_TRANSMIT` SHALL use competing-consumer scaling, with ordering enforced only by `transmit_order_domain_key`.
* read-side projection workers such as `BUILD_TWIN_VIEW`, `BUILD_FOCUS_LENS_INDEX`, and `BUILD_LIVE_EXPERIENCE_FRAME` SHALL NOT mutate command-side truth, SHALL NOT require the manifest-start lease, and SHALL be allowed to complete after `DecisionBundle` persistence.
* `PLAN_SOURCE_COLLECTION(...)`, `BUILD_FILING_PACKET(...)`, and `CANONICALIZE_AUTHORITY_REQUEST(...)` SHALL reject or ignore any attempt to apply `masking_context`; execution semantics MUST use canonical unmasked compliance facts and frozen access binding, while masking remains limited to human/view/export projections.
* `INIT_EXPERIENCE_STREAM(...)` SHALL allocate a reconnect-safe subscription key, stable `shell_route_key = manifest_id`, and monotonic `experience_sequence` ordering across live delivery, catch-up delivery, and snapshot reload; it SHALL also persist `frame_epoch`, `last_published_sequence`, `surface_version_map`, `last_materialized_frame_ref`, a deterministic resume token `RESUME_TOKEN(manifest_id, frame_epoch, experience_sequence)`, stream-level `experience_profile`, `attention_policy_version`, the default detail-module policy, `shell_stability_token`, the last shell-level `actionability_state`, the last `active_detail_surface_code`, and the last resolvable `focus_anchor_ref`. `frame_epoch` SHALL change only when clients must rebase from a new derived frame baseline; it SHALL NOT imply a route reset, page reload, or destructive shell remount.
* `AUTHORITY_NEXT_CHECKPOINT_AT(cfg, submission, phase)` SHALL deterministically derive the next visible checkpoint from provider profile, last authority event, retry policy, and reconciliation cadence.
* `WAIT_FOR_TRANSMIT_OR_RECONCILIATION(...)` SHALL return one of:

  * `RESOLVED_RECONCILIATION` when a deterministic authority outcome is available inside the inline budget;
  * `TRANSMITTED_AWAITING_ACK` when outbound dispatch or accepted-pending authority receipt is proven but legal confirmation is still outstanding; or
  * `TRANSMIT_PENDING_UNVERIFIED` when the engine has queued transmit intent but has not yet observed outbound proof inside the inline budget.
* `BUILD_SURFACE_PATCH_SET(previous_frame, surface_updates, shell_overrides)` SHALL:

  * diff each requested surface against the latest materialized frame for the same manifest;
  * when `experience_profile="LOW_NOISE"`, synthesize composite shell surfaces `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` from the richer semantic surface set before final diff emission while retaining the source surfaces as detail-module inputs or explicit investigation-mode surfaces;
  * when `experience_profile="LOW_NOISE"`, publish only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` as peer entries in `surface_updates[]`; richer observatory surfaces SHALL remain drawer inputs and SHALL NOT be emitted as additional sibling regions in the default shell;
  * compute `cognitive_budget = LOW_NOISE_COGNITIVE_BUDGET(...)`, `copy_budget = LOW_NOISE_COPY_BUDGET(...)`, `attention_policy = DERIVE_ATTENTION_POLICY(...)`, `visible_action_set = FILTER_VISIBLE_ACTIONS(...)`, and normalized limitation states before any composite shell payload is emitted;
  * trim context labels, summary copy, action labels, and detail-entry copy through `TRIM_LOW_NOISE_COPY(...)` before schema serialization so the shell remains one-scan readable under verbose authority, drift, or audit inputs;
  * emit explicit shell-level `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref` whenever the dominant action, recommended investigation path, or mounted detail context changes, so reconnect and terminal reload never depend on client-side inference;
  * enforce the default visible-attention budget so that the published shell contains at most one primary issue, one primary action, and one expanded detail module unless explicit compare or audit mode is active;
  * preserve the fixed low-noise reading order `CONTEXT_BAR -> DECISION_SUMMARY -> ACTION_STRIP -> DETAIL_DRAWER` unless the user has explicitly entered compare or audit mode;
  * cap detail entry points and secondary actions according to the frozen cognitive budget, and omit non-legal or non-material actions rather than rendering disabled-control clutter;
  * compress non-primary warnings and notices into collapsed counts and direct detail entry points rather than parallel high-weight panels;
  * emit object-level patch envelopes rather than whole-screen replacement payloads;
  * preserve the last non-contradictory material state when a heavier read model is still building, marking the surface `surface_lifecycle_state="UPDATING"` or `surface_lifecycle_state="MATERIALIZING"` instead of blanking it;
  * preserve `focus_anchor_ref` and `shell_stability_token` across reconnect, catch-up, and non-destructive refresh whenever the anchored object still exists in the latest materialized frame;
  * emit `surface_lifecycle_state="LIMITED"` when retention, masking, permission, or unavailable upstream truth intentionally narrows what may be shown;
  * include per-surface `surface_code`, `surface_version`, `patch_kind`, `surface_lifecycle_state`, `affected_object_refs[]`, `plain_reason`, `blocked_action_codes[]`, `default_visibility`, `attention_tier`, and `summary_rank`;
  * support `patch_kind in {UPSERT_OBJECT, REPLACE_FRAGMENT, APPEND_EVENT, REMOVE_OBJECT, NOOP}`;
  * support `surface_lifecycle_state in {UNBORN, MATERIALIZING, STABLE, UPDATING, SUPERSEDED, LIMITED}`;
  * support `default_visibility in {VISIBLE, COLLAPSED, HIDDEN}`;
  * support `attention_tier in {PRIMARY, SECONDARY, CONTEXTUAL, INVESTIGATIVE}`;
  * treat `summary_rank` as a deterministic total-order integer where `1` is the highest-priority visible summary candidate; and
  * allow threshold ghosting or other non-blocking placeholders only as explicit surface metadata, never as implied absence.
* `SYNC_LIVE_EXPERIENCE(...)` SHALL:

  * execute in the following order:

    1. `previous_frame = LOAD_OR_BUILD_LATEST_EXPERIENCE_FRAME(manifest.manifest_id)`
    2. derive shell-level `connection_state`, `activity_state`, `truth_state`, `checkpoint_state`, `truth_origin`, and `posture_state` from persisted command-side truth, inbox-normalized authority artifacts, workflow state, and the current causal transition
    3. `patch_set = BUILD_SURFACE_PATCH_SET(previous_frame, surface_updates, shell_overrides)`
    4. assign `semantic_motion` from semantic transition type, delta priority, and delivery class
    5. increment `experience_sequence` and publish one idempotent `ExperienceDelta`
    6. persist the new materialized frame or frame-diff index needed for reconnect-safe catch-up

  * publish idempotent `ExperienceDelta` patches rather than full-screen replacements;

  * keep one mounted Live Observatory shell keyed by `manifest_id`; page reload, route reset, blocking full-screen loader, or destructive surface remount SHALL NOT be required for phase progression, authority waiting, reconciliation, approval, late-data propagation, projection readiness, or drift surfacing;

  * include at minimum `manifest_id`, `experience_sequence`, `frame_epoch`, `delivery_class`, `shell_route_key`, `posture_state`, `semantic_motion`, `cause_ref`, `affected_object_refs[]`, `affected_surface_codes[]`, `occurred_at`, and `surface_updates[]`; each entry in `surface_updates[]` SHALL carry its own `surface_code`, there SHALL be at most one patch per composite surface in a single delta, and the low-noise profile SHALL emit no more than four composite surface updates per delta;

  * serialize every published `ExperienceDelta` against `schemas/experience_delta.schema.json` (or an equivalent frozen contract) so reconnect, catch-up, reduced-motion rendering, and terminal-view restoration all bind to one machine-checkable UX envelope rather than ad hoc client inference;

  * also include or deterministically derive shell-level `connection_state`, `activity_state`, `truth_state`, `checkpoint_state`, and `truth_origin`; any transition crossing an async boundary, review boundary, approval boundary, or authority boundary SHALL set these explicitly rather than relying on client inference;

  * also include or deterministically derive shell-level `experience_profile`, `attention_state`, `primary_object_ref`, `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, `secondary_notice_count`, `detail_entry_points[]`, `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref`; any transition that changes the dominant user question SHALL set these explicitly rather than relying on client inference;

  * also include the canonical `attention_policy{{...}}`, frozen `cognitive_budget{{...}}`, and when available `focus_anchor_ref` plus `shell_stability_token` so reconnect-safe shells do not reconstruct hierarchy or object permanence heuristically on the client;

  * support `delivery_class in {LIVE, CATCH_UP, SNAPSHOT}` and SHALL mark replayed or catch-up deltas so clients do not re-run high-amplitude motion as if the event were newly happening;

  * support `posture_state in {STREAMING, FROZEN, CONTAINED, BRIDGED, FRACTURED}`;

  * support `attention_state in {CALM, NOTICE, REVIEW, BLOCKED, WAITING, LIMITED}`;

  * support `connection_state in {CONNECTED, RECONNECTING, CATCHING_UP, STALE, DEGRADED}` and `activity_state in {IDLE, STREAMING, WAITING_ON_HUMAN, WAITING_ON_AUTHORITY, WAITING_ON_LATE_DATA, RECONNECTING, REPLAYING}`;

  * support `truth_state in {LOCAL_INTENT_ONLY, PERSISTED_INTERNAL, AUTHORITY_PENDING, AUTHORITY_CONFIRMED, AUTHORITY_REJECTED, AUTHORITY_UNKNOWN, AUTHORITY_OUT_OF_BAND}`;

  * support `truth_origin in {LOCAL_INTENT, PERSISTED_STATE, AUTHORITY_ARTIFACT, OUT_OF_BAND_DISCOVERY}`;

  * support `checkpoint_state in {NONE, SOURCE_COLLECTION, PROJECTION_PENDING, HUMAN_REVIEW, APPROVAL_PENDING, AUTHORITY_PREFLIGHT, TRANSMIT_PENDING, PENDING_ACK, RECONCILIATION_PENDING, LATE_DATA_PENDING, CONFIRMED, REJECTED, UNKNOWN, OUT_OF_BAND}`;

  * include `next_checkpoint_at` whenever an external confirmation, reconciliation pass, late-data adoption, approval decision, or delayed worker completion is still expected;

  * include `checkpoint_reason`, `plain_reason`, and `blocked_action_codes[]` whenever `activity_state != IDLE`, `checkpoint_state != NONE`, `posture_state in {CONTAINED, FRACTURED}`, or any surface enters `LIMITED`;

  * allow clients to update mounted surfaces in place without page reload or route reset and preserve focus anchor, compare pin, selected node, and scroll position whenever the focused object still exists;

  * prohibit a global blocking loader after manifest allocation; when a derived view is not ready, the affected surface SHALL remain interactive where safe and SHALL use `surface_lifecycle_state="MATERIALIZING"` or `surface_lifecycle_state="UPDATING"` with explicit placeholder metadata rather than hiding the whole shell;

  * in the low-noise profile, `DECISION_SUMMARY` and `ACTION_STRIP` SHALL remain mounted during reconnect, projection lag, or detail-module refresh; freshness, checkpoint, and limitation metadata SHALL update inline rather than causing shell reflow;

  * when multiple simultaneous issues exist, only the highest-ranked issue from `DERIVE_ATTENTION_POLICY(...)` MAY occupy the primary summary region; remaining issues SHALL collapse into `secondary_notice_count` plus detail entry points;

  * allow local optimistic interaction only for focus changes, compare pins, filter or sort changes, reversible draft composition, and local acknowledgement of notices; every optimistic update SHALL be tagged `optimistic_scope="LOCAL_VIEW_ONLY"` and SHALL be reconciled or removed by the next persisted delta;

  * SHALL NOT optimistically advance legal submission state, authority confirmation, amendment confirmation, override approval, authority binding validity, or any other externally binding posture;

  * support reconnect by allowing `LOAD_OR_BUILD_LATEST_EXPERIENCE_FRAME(manifest_id)` followed by resume-from-sequence subscription using `frame_epoch` + `experience_sequence`;

  * on `delivery_class in {CATCH_UP, SNAPSHOT}`, high-amplitude motion SHALL be downgraded to `ECHO` unless the client has an explicit replay-safe policy bound to delivery class; replayed deltas SHALL preserve state meaning without visually restaging the original moment;

  * allow coalescing of low-severity refresh deltas, but SHALL NOT coalesce away legal transitions, state-machine transitions, focus-invalidating object removal, or distinctions between `TRANSMIT_PENDING`, `TRANSMITTED`, `PENDING_ACK`, `CONFIRMED`, `REJECTED`, `UNKNOWN`, and `OUT_OF_BAND`;

  * treat command-side truth, inbox-normalized authority artifacts, workflow items, and audit events as the only valid sources for user-visible legal posture.
* `SYNC_LIVE_EXPERIENCE_FROM_GATES(...)` SHALL derive at minimum:

  * `DECISION_STAGE` changes from gate order and gate outcome;
  * `CONSEQUENCE_RAIL` changes from next action codes, review posture, blocked action codes, and workflow implications;
  * `DECISION_SUMMARY` from the highest-priority visible issue, bounded reason list, and explicit uncertainty or limitation statement;
  * `ACTION_STRIP` from the one safest next action, any blocked action codes, and ownership or waiting posture;
  * shell-level `activity_state` / `checkpoint_state` updates when a gate opens human review, approval, authority binding, deferred evidence work, or amendment follow-up; and
  * threshold-ghosting metadata for downstream stations so later phases can appear as planned but not yet materialized rather than as absent UI.
* `semantic_motion` SHALL use only semantic tokens, not literal animation commands:

  * `ORBIT` for selection, manifest entry, or context-preserving focus shift;
  * `TRACE` for active progression, real-time streaming, request construction, and evidence path traversal;
  * `SEAL` for immutability, approval, packet hardening, or binding hardening;
  * `RIPPLE` for late data, drift, or downstream consequence propagation;
  * `BRIDGE` for successful reconciliation or confirmed continuity across an authority boundary;
  * `FRACTURE` for hard block, integrity break, or rejection; and
  * `ECHO` for workflow, audit, catch-up, or low-intensity contextual refresh.
* `BUILD_PULSE_SPINE_STATE(...)` SHALL summarize the latest authoritative cause, connection posture, catch-up posture, active phase, pending checkpoint, checkpoint reason, truth origin, freshness age, and active owner or handoff without displacing the user from the current focused surface; it SHALL behave as the shell-level checkpoint dial for long-running or externally waiting states.
* `BUILD_HANDOFF_BATON_STATE(...)` SHALL surface operator role, approval posture, masking posture, authority-binding posture, next owner-required action, and any step-up requirement as a mounted shell object rather than a route switch or generic modal takeover.
* `BUILD_AUTHORITY_TUNNEL_STATE(...)` SHALL preserve distinct fields for `transport_state`, `authority_state`, `truth_origin`, `next_checkpoint_at`, `checkpoint_reason`, `ambiguity_reason`, `last_authority_event_at`, and `retry_posture`; it SHALL NOT collapse authority posture into a generic `submitted` or `loading` label.
* `LOW_NOISE_COGNITIVE_BUDGET(...)` SHALL freeze the production shell budget at four persistent surfaces, one primary issue, one primary action, three visible reasons, two secondary actions, one visible warning, five detail entry points, and one expanded detail module unless explicit compare or audit mode is active.
* `LOW_NOISE_COPY_BUDGET(...)` SHALL freeze the production shell microcopy budget at `manifest_label <= 64`, other context labels `<= 48`, summary headline `<= 96`, visible reason labels `<= 120`, `plain_explanation <= 240`, action labels `<= 40`, blocking or uncertainty copy `<= 160`, and detail-entry labels / reasons `<= 48 / 120` visible characters respectively.
* `DERIVE_ATTENTION_POLICY(...)` SHALL rank user-visible concerns in the following order unless a stricter policy profile is frozen: integrity break or hard block, authority rejection or contradiction, explicit human review or approval requirement, masking or retention limit affecting actionability, authority waiting or late-data waiting, and ordinary completion or success. It SHALL output one `primary_object_ref`, one `actionability_state`, one `primary_action_code` or explicit `NO_SAFE_ACTION`, `no_safe_action_reason_code` when no safe move exists, collapsed `secondary_notice_count`, ordered `detail_entry_points[]`, ordered `ranking_basis[]`, `suggested_detail_surface_code`, and `default_detail_module_code`; it SHALL NOT present parallel competing primaries in the default shell.
* `FILTER_VISIBLE_ACTIONS(...)` SHALL remove non-legal, unavailable, and non-material controls before shell composition. It SHALL return at most one primary action and at most two secondary actions; when the current posture is waiting or `NO_SAFE_ACTION`, it SHALL emit explanatory text and an investigation entry point instead of disabled controls.
* `NORMALIZE_LIMITATION_STATE(...)` SHALL classify visible absence as `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, `NOT_APPLICABLE`, or `NONE` so detail modules never blur policy limits, latency, and irrelevance.
* `BUILD_CONTEXT_BAR_STATE(...)` SHALL compress pulse, lineage, handoff, freshness, truth-origin posture, and the default mode or non-live disclaimer into one persistent strip that remains stable across live updates; it SHALL prefer terse semantic labels over decorative topology in the default profile, SHALL NOT duplicate the same posture warning across multiple persistent surfaces, and SHALL keep context labels within the frozen low-noise copy budget.
* `BUILD_DECISION_SUMMARY_STATE(...)` SHALL answer in visible order: what the system believes, why that posture exists, and what limit or uncertainty still applies. It SHALL emit `headline`, `reason_items[]`, `additional_reason_count`, and a normalized limitation or uncertainty statement; it SHALL show at most one primary issue, at most three supporting reasons before expansion, and a plain-language explanation whenever a legal or authority distinction would otherwise be ambiguous. `headline`, reason labels, uncertainty text, and `plain_explanation` SHALL be trimmed to the frozen low-noise copy budget before publication.
* `BUILD_ACTION_STRIP_STATE(...)` SHALL expose one dominant safe next action, plus subordinate secondary actions only when they do not compete with the dominant action. Secondary actions SHALL be capped by the frozen cognitive budget and omitted entirely when they are not legal or not materially helpful. Primary and secondary action labels, ownership copy, waiting copy, and blocking reasons SHALL be trimmed to the frozen low-noise copy budget. When no safe next action exists, it SHALL render explicit `NO_SAFE_ACTION`, populate `actionability_state = NO_SAFE_ACTION`, preserve `no_safe_action_reason_code`, and point to the least-destructive investigation entry point through `suggested_detail_surface_code`. When a related detail module is already mounted, the strip SHALL preserve `focus_anchor_ref` and `active_detail_surface_code` whenever the focused object still exists.
* `BUILD_DETAIL_DRAWER_STATE(...)` SHALL keep expert modules collapsed by default, expose only the modules relevant to the current posture, and allow at most one expanded module in the default profile unless the user has explicitly entered compare or audit mode. In `experience_profile="LOW_NOISE"`, it SHALL project `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` as on-demand modules rather than peer top-level regions; it SHALL distinguish `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE`, cap visible entry points at five on default load, trim entry labels and reasons to the frozen low-noise copy budget, and preserve `focus_anchor_ref` whenever the anchored object still exists.
* when `SubmissionRecord.lifecycle_state` changes, user-visible authority semantics SHALL map at minimum as:

  * `TRANSMIT_PENDING` = queued or persisted intent exists, but outbound proof has not yet been observed;
  * `TRANSMITTED` = outbound dispatch observed, but no authority confirmation is implied;
  * `PENDING_ACK` = authority accepted the request or dispatch is known, but legal confirmation remains outstanding;
  * `CONFIRMED` = authority-backed legal confirmation;
  * `REJECTED` = authority-backed rejection;
  * `UNKNOWN` = the authority state remains unresolved after the defined reconciliation path; and
  * `OUT_OF_BAND` = external legal state was detected but was not created by the current packet flow.
* `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL output a derived frame for:

  * shell-level `experience_profile`, `attention_state`, `primary_object_ref`, `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, `detail_entry_points[]`, `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref`; and

  * `CONTEXT_BAR`
  * `DECISION_SUMMARY`
  * `ACTION_STRIP`
  * `DETAIL_DRAWER`

  investigation-mode source surfaces such as `PULSE_SPINE`, `MANIFEST_RIBBON`, `HANDOFF_BATON`, `DECISION_STAGE`, `CONSEQUENCE_RAIL`, `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` MAY still be materialized as internal inputs or explicit compare/audit payloads, but they SHALL NOT be emitted as additional peer top-level surfaces in the default `LOW_NOISE` frame.
* `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL also materialize frame-level `attention_policy{{...}}`, `cognitive_budget{{...}}`, and, when available, `focus_anchor_ref` plus `shell_stability_token` so reconnect-safe restoration does not depend on client-side hierarchy reconstruction.
* in `experience_profile="LOW_NOISE"`, the composite shell surfaces SHALL be derived from the richer semantic surfaces as follows: `CONTEXT_BAR` from `PULSE_SPINE`, `MANIFEST_RIBBON`, and `HANDOFF_BATON`; `DECISION_SUMMARY` from `DECISION_STAGE` plus gate and trust rollups; `ACTION_STRIP` from `CONSEQUENCE_RAIL` plus workflow implications; and `DETAIL_DRAWER` from `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL`.
* every surface emitted by `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL carry or deterministically derive:

  * `surface_lifecycle_state`
  * `plain_reason`
  * `available_action_codes[]`
  * `blocked_action_codes[]`
  * `last_material_change_at`
  * `freshness_age`
  * `default_visibility`
  * `attention_tier`
  * `summary_rank`
  * `limited_by` when the visible state is narrowed by policy, masking, retention, or missing upstream proof
* `DECISION_STAGE` SHALL expose threshold-ghosting metadata for future stations; `PULSE_SPINE` and `AUTHORITY_TUNNEL` SHALL expose checkpoint-dial metadata; and `MANIFEST_RIBBON`, `FOCUS_LENS`, and `TWIN_PANEL` SHALL expose delta-braid metadata for compare-across-lineage without route changes.
* `FOCUS_LENS` SHALL support context-preserving deep-read, pinned compare, delta-compare modes, and focus-anchor preservation across live updates without forcing a route change or losing shell-level posture or action context.
* when masking, retention, or permission limits narrow visibility, `CONTEXT_BAR`, `DECISION_SUMMARY`, and `ACTION_STRIP` SHALL remain mounted and SHALL explicitly declare that the view is limited; hidden facts SHALL NOT be represented as negative facts.
* when `connection_state in {RECONNECTING, CATCHING_UP, STALE, DEGRADED}` or a projection remains `MATERIALIZING`, the shell SHALL preserve the last stable `DECISION_SUMMARY` and `ACTION_STRIP` and update freshness or checkpoint metadata inline rather than blanking or reordering the primary layout.
* when multiple blocking or review conditions coexist, the default shell SHALL surface only the highest-ranked issue as the primary summary and route the remainder through collapsed counts and detail entry points.
* when no safe legal action exists, `ACTION_STRIP` SHALL render `NO_SAFE_ACTION`, preserve the blocking reason in plain language, and open or suggest the most relevant detail module rather than filling the shell with disabled controls.
* clients consuming `ExperienceDelta` SHALL map semantic motion to reduced-motion-safe transitions when required; no motion token may carry meaning that is unavailable via text, structure, iconography, or state labels.
* `ExperienceDelta` and `BUILD_LIVE_EXPERIENCE_FRAME(...)` are operational read-side constructs only; they SHALL NOT be cited as the authoritative legal record of what happened.
* `DecisionBundle.decision_status = REVIEW_REQUIRED` is the backward-compatible terminal posture for unresolved external confirmation when no distinct pending status exists in the frozen bundle schema.
* no worker may treat the audit log itself as a queue, lock, or source of truth for work orchestration.

---
## Embodiments / variants (examples)
- **Variant A (analysis-first)**: skip submission and generate only trust + explainability artifacts.
- **Variant B (portfolio autopilot)**: run in batch across client sets; prioritize workflow items by risk + deadlines.
- **Variant C (multi-authority)**: support multiple authorities and jurisdiction-specific packet builders while preserving the same manifest/provenance spine.
- **Variant D (privacy-reduced)**: store only hashed evidence references and keep raw evidence in a customer-controlled vault; provenance still works.

## Implementation notes
- Make stochastic modules reproducible with manifest-seeded randomness.
- Ensure every external request/response is journaled (hash + metadata), not necessarily stored in plaintext.
- Never infer legal submission state; always derive it from authority acknowledgement records.

## Boundary specification
For the exact invention boundary and full system-boundary definition, see
`invention_and_system_boundary.md`.

## Related specifications
- Actor, delegation, and authority semantics: `actor_and_authority_model.md`
- Source classification and canonicalization semantics: `canonical_source_and_evidence_taxonomy.md`
- Manifest freezing, replay, and idempotency semantics: `manifest_and_config_freeze_contract.md`
- Lifecycle and transition semantics: `state_machines.md`
- Exact gate ordering and decision tables: `exact_gate_logic_and_decision_tables.md`
- Compute, parity, graph-quality, and trust formulas: `compute_parity_and_trust_formulas.md`
- Authority request/reconciliation semantics: `authority_interaction_protocol.md`
- Drift baselines and amendment semantics: `amendment_and_drift_semantics.md`
- Provenance graph node/edge/path semantics: `provenance_graph_semantics.md`
- Retention, error, and observability semantics: `retention_error_and_observability_contract.md`
- Error family, remediation, and compensation semantics: `error_model_and_remediation_model.md`
- Observability signal and audit-event semantics: `observability_and_audit_contract.md`
- Worked embodiments and implementation examples: `embodiments_and_examples.md`
