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
`RunManifest.decision_bundle_hash`, computes and persists `RunManifest.deterministic_outcome_hash`,
synchronizes the bundle's top-level refs into the manifest's append-only outcome projection, records
required errors/remediation, and applies retention / observability to the currently materialized refs.
For replay children, the same helper SHALL also compare the replay result against the target manifest's
frozen historical basis and persist a `ReplayAttestation` before returning.

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
- optional `primary_proof_bundle_ref`
- `twin_id`
- optional `filing_packet_id`
- optional `submission_record_id`
- optional `replay_attestation_ref`

These refs SHALL remain a coherent artifact-identity spine rather than an unordered summary bag. A
non-null `primary_proof_bundle_ref` SHALL therefore imply a non-null `graph_id`, and a non-null
`twin_id` SHALL imply both non-null `graph_id` and non-null `parity_id` so proof and twin reload do
not depend on renderer-local joins.
`manifest.output_refs{...}` SHALL preserve that same spine as structured output-link entries rather
than raw alias-to-ref strings, so proof/twin/replay reload keeps `artifact_hash_or_null` and
`dependency_identity_refs[]` explicit instead of reconstructing them from neighboring artifacts.

For replay-safe UX continuity, `FINALIZE_TERMINAL_OUTCOME(...)` SHALL also synthesize an
outcome-bridge projection on the persisted bundle whenever the caller omits it. At minimum this
bridge SHALL preserve `outcome_class`, `waiting_on`, `checkpoint_state`, `truth_state`,
`plain_reason`, `reason_codes[]`, `next_action_codes[]`, `blocked_action_codes[]`,
`actionability_state`, `primary_action_code`, `no_safe_action_reason_code`,
`suggested_detail_surface_code`, `active_detail_surface_code`, `focus_anchor_ref`, and
`next_checkpoint_at`; when available in `manifest.output_refs{}`, `filing_case_id`,
`amendment_case_id`, and `primary_proof_bundle_ref` SHALL be copied into the bundle so a reloaded
terminal view can restore the correct consequence rail without replaying the entire gate chain.

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

### Procedure: RUN_ENGINE(principal, tenant_id, client_id, period, requested_scope, mode, run_kind, manifest_id=None, override_refs=None, config_channels=None, launch_context=None)

For each numbered phase below, the engine SHALL bracket execution with `RECORD_OBSERVABILITY(...)`
for the corresponding phase span named in `observability_and_audit_contract.md`.

Any unhandled system fault after `ManifestAllocated` SHALL route through `FINALIZE_RUN_FAILURE(...)`.
If `run_started` has not yet occurred, the failure finalizer SHALL mark the manifest `BLOCKED`,
emit reason code `PRESTART_SYSTEM_FAULT`, persist
`invariant_enforcement_contract{ failure_stage_or_null = PRESTART, terminal_manifest_state_or_null = BLOCKED, terminal_audit_event_type_or_null = ManifestBlocked }`,
and delete or quarantine any uncommitted staging artifacts. This pre-start branch includes faults
encountered while the manifest is still `SEALED` but has not yet committed `RunStarted`. If
`run_started` has occurred, the manifest lifecycle MUST transition via `system_fault` to `FAILED`
and persist
`invariant_enforcement_contract{ failure_stage_or_null = POSTSTART, terminal_manifest_state_or_null = FAILED, terminal_audit_event_type_or_null = ManifestFailed }`.

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
   * nightly_batch_run_ref = launch_context.nightly_batch_run_ref if exists(launch_context) else None
   * nightly_window_key = launch_context.nightly_window_key if exists(launch_context) else None
   * if run_kind == NIGHTLY and (not exists(nightly_batch_run_ref) or not exists(nightly_window_key)):
     return ERROR(NIGHTLY_LAUNCH_CONTEXT_REQUIRED)
   * if run_kind != NIGHTLY and (exists(nightly_batch_run_ref) or exists(nightly_window_key)):
     return ERROR(UNEXPECTED_NIGHTLY_LAUNCH_CONTEXT)

   * Architectural note: `runtime_scope[]` is the single executable scope for the rest of the run.
   * Fail closed here instead of relying on crash-style assertions because access output is still
     derived from user/policy input and directly shapes the launch UX and legal action envelope.

Global substitution rule inside `RUN_ENGINE(...)`:

* preserve the raw requested scope on the manifest for audit and idempotency
* use `runtime_scope[]` for every downstream control-flow, collection, compute, workflow, packet, transmit, reconciliation, and terminal decision
* if `access_decision.decision = ALLOW_MASKED`, bind `masking_context` only to downstream render, export, and read-model projection steps
* any user-visible projection, export, or explainability render that applies `masking_context` or retention-driven omission SHALL emit typed omission entries, explicit `limitation_state`, and projection-adjusted confidence; hidden values SHALL NOT be serialized as zero, false, empty string, or `not observed`
* decision-side compute, parity, trust, filing-packet construction, request canonicalization, request hashing, transport, and reconciliation SHALL use retained decision confidence only; read-side explanation strength, confidence badges, and summary certainty SHALL use projection-adjusted confidence only
* `masking_context` SHALL NOT alter authoritative collection, canonical fact promotion, compute, parity, trust, filing-packet construction, request canonicalization, request hashing, transport, or reconciliation
* every user-visible lifecycle transition after manifest allocation SHALL be emitted as an idempotent, monotonic `ExperienceDelta` stream keyed by `manifest_id`
* after manifest allocation, the user-visible experience SHALL remain inside one mounted `CALM_SHELL` keyed by `manifest_id`; route reset, page reload, destructive unmount, or full-screen replacement SHALL NOT be required to observe phase progression, step-up, approval, transmit, reconciliation, late-data propagation, or drift
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
     RECORD_EVENT(ExistingDecisionBundleReturned, prior_manifest.manifest_id)
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
   * config_resolution_basis = config_resolution.config_resolution_basis

   * input_lineage = CONTINUATION_REUSES_FROZEN_INPUT(
     prior_context,
     manifest_strategy
     )

   * input_inheritance_mode = input_lineage.input_inheritance_mode

   * before any compliance artifact is persisted, `cfg_freeze` MUST include every minimum config type enumerated in `manifest_and_config_freeze_contract.md`
   * `cfg_freeze` MUST include `required_config_types_present[]` and all mandatory top-level profile refs
   * `cfg_freeze.config_completeness_state` MUST equal `COMPLETE_REQUIRED_CONFIG_SET`
   * `cfg_freeze.config_consumption_mode` MUST equal `FROZEN_CONFIG_ONLY`
   * `cfg_freeze.config_resolution_basis` MUST record whether the manifest is using fresh request resolution or an exact inherited frozen basis
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
     access_decision=access_decision,
     launch_context=launch_context
     )
     RECORD_EVENT(ManifestAllocated, manifest.manifest_id)

     else if manifest_strategy.action == REUSE_SEALED_MANIFEST:
     reuse_context_validation = VALIDATE_REUSE_SEALED_CONTEXT(prior_manifest)
     if reuse_context_validation.status != VALID:
     return ERROR(reuse_context_validation.reason_code)
     manifest = prior_manifest
     RECORD_EVENT(ManifestContextReused, manifest.manifest_id)

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
     config_inheritance_mode=config_inheritance_mode,
     input_inheritance_mode=input_inheritance_mode,
     launch_context=launch_context
     )
     RECORD_EVENT(ManifestAllocated, manifest.manifest_id)
     RECORD_EVENT(ContinuationChildAllocated, manifest.manifest_id)

   * if not reuse_sealed_context and not exists(cfg_freeze):
     cfg_freeze = FREEZE_CONFIG(
     cfg,
     manifest.manifest_id,
     mode,
     environment_ref(),
     code_build_id(),
     resolved_schema_bundle_hash
     )
   * if exists(cfg_freeze):
     ASSERT(cfg_freeze.config_resolution_basis == config_resolution_basis)
     ASSERT(cfg_freeze.config_consumption_mode == FROZEN_CONFIG_ONLY)

   * if not reuse_sealed_context:
     UPDATE_MANIFEST_PRESEAL_CONTEXT(
     manifest,
     access_decision=access_decision,
     config_freeze=cfg_freeze,
     continuation_set_patch={
       "config_inheritance_mode": config_inheritance_mode,
       "input_inheritance_mode": input_inheritance_mode
     }
     )

   * if exists(config_inheritance_mode):
     RECORD_EVENT(ConfigInheritanceResolved, manifest.manifest_id)

   * if exists(input_inheritance_mode):
     RECORD_EVENT(InputInheritanceResolved, manifest.manifest_id)

   * lineage_projection_validation = VALIDATE_MANIFEST_LINEAGE_PROJECTION(manifest)
   * if lineage_projection_validation.status != VALID:
     return ERROR(lineage_projection_validation.reason_code)

   * Architectural note: duplicated top-level lineage fields are fast-read mirrors of
     `continuation_set{...}`. They SHALL never become a second source of truth or drift silently.

   * manifest MUST capture principal_context_ref, config freeze identity, deterministic seed, manifest-level idempotency key, and lineage refs
   * `continuation_basis = NEW_MANIFEST` MUST bind `root_manifest_id = manifest_id`; child manifests
     MUST bind non-null `root_manifest_id`, non-null `parent_manifest_id`, and
     `continuation_set.parent_manifest_hash_at_branch`, and replay children MUST bind
     `parent_manifest_id = replay_of_manifest_id`
   * when `run_kind = NIGHTLY`, the manifest MUST also capture `nightly_batch_run_ref` and
     `nightly_window_key` as frozen identity fields rather than ambient scheduler-only metadata
   * RECORD_EVENT(AccessScopeBound, manifest.manifest_id)

   * same-manifest reuse is legal only when `manifest_strategy.action = REUSE_SEALED_MANIFEST` and raw requested scope, executable scope, run kind, and access binding are identical
   * same-manifest reuse SHALL NOT rewrite the sealed manifest's frozen envelope, access decision projection, or config freeze identity
   * same-manifest reuse SHALL fail closed if the supposedly reusable sealed manifest already has
     `opened_at`, any output/submission/drift refs, `decision_bundle_hash`,
     `deterministic_outcome_hash`, or `replay_attestation_ref`
   * child-manifest creation MUST persist `continuation_basis`, `config_inheritance_mode`, and
     `input_inheritance_mode` so replay, recovery, amendment, and fresh-child UX paths remain
     distinguishable in lineage and audit views

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

   * `module_updates[]` below are semantic read-model updates only. `SYNC_LIVE_EXPERIENCE(...)`
     SHALL project them into published low-noise `surface_updates[]`; richer observatory modules
     SHALL NOT leak out as peer top-level shell surfaces in the default `LOW_NOISE` profile.

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="ManifestAllocated" if not reuse_sealed_context else "ManifestContextReused",
     module_updates=[
     MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
     manifest,
     shell_state="CALM_SHELL",
     connection_state="CONNECTED",
     catchup_state="CAUGHT_UP",
     activity_state="STREAMING" if not reuse_sealed_context else "IDLE",
     truth_state="PERSISTED_INTERNAL",
     active_phase="ALLOCATED" if not reuse_sealed_context else "PRESEAL_REUSED",
     checkpoint_state="NONE",
     latest_cause_ref="ManifestAllocated" if not reuse_sealed_context else "ManifestContextReused",
     pending_object_refs=[]
     )),
     MODULE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(manifest, lifecycle_state=manifest.lifecycle_state, runtime_scope=runtime_scope)),
     MODULE_UPDATE("HANDOFF_BATON", BUILD_HANDOFF_BATON_STATE(
     principal=principal,
     access_decision=access_decision,
     authority_binding=None,
     approval_state="NOT_REQUIRED",
     handoff_state="ACTIVE_OPERATOR_BOUND" if access_decision.decision == ALLOW else "MASKED_OPERATOR_BOUND"
     )),
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="ALLOCATED", gate_summary=[])),
     MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE([], [], mode, runtime_scope))
     ],
     posture_state="STREAMING" if not reuse_sealed_context else "FROZEN",
     semantic_motion="ORBIT" if not reuse_sealed_context else "ECHO"
     )

4. Load or build the sealed pre-start context using a barriered, partition-aware execution plan

   * Concurrency and modernization rules for all remaining phases:

     * `RUN_ENGINE(...)` SHALL remain the single durable control-plane orchestrator for one manifest, but it SHALL NOT perform heavyweight intake transforms, bulk graph construction, or authority transport inline when those actions can be delegated to idempotent stage workers or governed gateway workers
     * fan-out work SHALL execute as idempotent stage tasks published through a transactional outbox; workers SHALL be stateless and SHALL NOT mutate manifest core, rewrite prior gate records, or bypass manifest seal rules
     * post-seal workers SHALL load and obey `manifest.frozen_execution_binding{...}` plus the current `append_only_outcome_projection{...}` mirrors; they SHALL NOT re-resolve live config, live input, or replacement lineage from ambient services
     * post-seal workers SHALL enforce `frozen_execution_binding.config_consumption_mode = FROZEN_CONFIG_ONLY` and reconstruct executable config only from `config_freeze_ref`, `config_freeze_hash`, `config_surface_hash`, and `config_resolution_basis`
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

   * reuse_frozen_input_context = reuse_sealed_context or input_inheritance_mode in {REPLAY_EXACT, RECOVERY_EXACT, HISTORICAL_EXPLICIT}

   * if `reuse_frozen_input_context`:
     if input_inheritance_mode in {REPLAY_EXACT, RECOVERY_EXACT, HISTORICAL_EXPLICIT}:
       replay_preconditions = VALIDATE_REPLAY_PRECONDITIONS(
         source_manifest=prior_manifest,
         child_manifest=manifest,
         config_inheritance_mode=config_inheritance_mode,
         input_inheritance_mode=input_inheritance_mode
         )
       if replay_preconditions.status != VALID:
         return ERROR(replay_preconditions.reason_code)
       RECORD_EVENT(ReplayPreflightValidated, manifest.manifest_id)
       sealed_context_source_manifest = prior_manifest
     else:
       sealed_context_source_manifest = manifest

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
     ) = LOAD_SEALED_RUN_CONTEXT(sealed_context_source_manifest)

     preseal_gate_records = ordered_preseal_gate_records
     non_access_gate_records = ordered_preseal_gate_records

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="PrestartContextReused" if sealed_context_source_manifest.manifest_id == manifest.manifest_id else "FrozenHistoricalContextInherited",
     module_updates=[
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="PRESEAL_REUSED", gate_summary=preseal_gate_records)),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="REUSED" if sealed_context_source_manifest.manifest_id == manifest.manifest_id else "HISTORICAL_REUSED"))
     ],
     posture_state="FROZEN",
     semantic_motion="ECHO"
     )

     else:
     RECORD_EVENT(SourceCollectionStarted, manifest.manifest_id)

     SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="SourceCollectionStarted",
     module_updates=[
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SOURCE_COLLECTION", gate_summary=[])),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(None, None, status="STREAMING"))
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
     module_updates=[
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="COLLECTED")),
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SOURCE_COLLECTION_COMPLETED", gate_summary=[]))
     ],
     posture_state="STREAMING",
     semantic_motion="TRACE"
     )

     late_data_findings = CLASSIFY_LATE_DATA(collection_boundary, runtime_scope)
     # `CLASSIFY_LATE_DATA(...)` SHALL persist a `LateDataIndicatorSet`, zero or more
     # `LateDataFinding` artifacts, and a `LateDataMonitorResult` before any late-data consequence is applied.
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
     module_updates=[
     MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_LATE_DATA(late_data_findings)),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="LATE_DATA_CLASSIFIED"))
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
     every candidate and canonical fact SHALL carry exact `collection_boundary_ref`,
     `normalization_context_ref`, source/evidence lineage hashes, and one exact partition binding;
     promotion SHALL fail closed if any fact widens partition scope, depends on masked input, or
     reaches `CANONICAL` with blocking conflict posture

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
     module_updates=[
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SNAPSHOT_VALIDATED", gate_summary=[])),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="SNAPSHOT_VALIDATED")),
     MODULE_UPDATE("FOCUS_LENS", BUILD_FOCUS_LENS_STATE(available=false, reason="WAITING_FOR_GRAPH"))
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
     required domains omitted from `source_plan.required_domains[]` SHALL already be reflected in
     `input_freeze.exclusion_refs[]` or `input_freeze.missing_source_declarations[]`; the engine
     SHALL NOT treat an uncollected domain as an implicit clean absence
     `source_window.collection_started_at <= collection_completed_at <= read_cutoff_at` MUST hold
     before `collection_boundary` or `input_freeze` become authoritative
     no `EvidenceItem`, `CandidateFact`, `CanonicalFact`, or `Snapshot` may become authoritative
     unless the frozen schema bundle resolves exactly one contract entry for its artifact type and
     that contract ref is preserved in `input_freeze.artifact_contract_refs[]`

   * if not reuse_sealed_context:
     execution_basis_hash = COMPUTE_EXECUTION_BASIS_HASH(
       manifest,
       cfg_freeze,
       input_freeze,
       principal_context_ref=manifest.principal_context_ref,
       authority_context_ref=manifest.authority_context_ref
       )

     UPDATE_MANIFEST_PRESEAL_CONTEXT(
       manifest,
       hash_set_patch={"execution_basis_hash": execution_basis_hash}
       )

5. Evaluate the ordered pre-seal gate chain, persist pre-start blocked context if needed, and seal only when a new pre-start context was built

   * the manifest SHALL carry a durable `preseal_gate_evaluation{...}` object from `FROZEN`
     onward. It freezes the one `execution_basis_hash` used for pre-seal evaluation, the canonical
     required gate order `[MANIFEST_GATE, ARTIFACT_CONTRACT_GATE, INPUT_BOUNDARY_GATE, DATA_QUALITY_GATE]`,
     the exact ordered pre-seal gate-decision ids, the blocked-versus-ready seal disposition, and
     the rule that later post-seal gates may append but SHALL NOT reinterpret that pre-seal tape

   * if `reuse_sealed_context`:
     if manifest.lifecycle_state != SEALED: return FINALIZE_RUN_FAILURE(manifest, MANIFEST_NOT_SEALED_FOR_REUSE)
     if manifest.preseal_gate_evaluation.completion_state != COMPLETE_READY_TO_SEAL:
       return FINALIZE_RUN_FAILURE(manifest, PRESEAL_GATE_TAPE_NOT_SEAL_READY)
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

     preseal_gate_evaluation = BUILD_PRESEAL_GATE_EVALUATION(
     manifest,
     execution_basis_hash,
     preseal_gate_records,
     completion_state="COMPLETE_BLOCKED_PRESTART" if any(GATE_BLOCKS_PROGRESS(g) for g in preseal_gate_records) else "COMPLETE_READY_TO_SEAL"
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
     preseal_gate_evaluation,
     preseal_gate_records
     )

     ```
     SYNC_LIVE_EXPERIENCE(
       manifest,
       cause_ref="PresealBlocked",
       module_updates=[
        MODULE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(
        manifest,
        lifecycle_state=manifest.lifecycle_state,
        decision_posture="BLOCKED_PRESTART",
        runtime_scope=runtime_scope
        )),
        MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="PRESEAL_BLOCKED", gate_summary=preseal_gate_records)),
        MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_GATES(preseal_gate_records))
       ],
       posture_state="FRACTURED",
       semantic_motion="FRACTURE",
       is_terminal=true
     )

     bundle = DecisionBundle(
       manifest_id=manifest.manifest_id,
       decision_status="BLOCKED",
       snapshot_id=snapshot.snapshot_id,
       primary_proof_bundle_ref=None,
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
     UPDATE_MANIFEST_PRESEAL_CONTEXT(manifest, preseal_gate_evaluation=preseal_gate_evaluation)

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
     module_updates=[
     MODULE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(manifest, lifecycle_state="SEALED", runtime_scope=runtime_scope)),
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="SEALED", gate_summary=preseal_gate_records))
     ],
     posture_state="FROZEN",
     semantic_motion="SEAL"
     )

6. Claim the sealed manifest and publish the post-seal command DAG atomically

   * raw_requested_scope SHALL remain the canonical ordered scope frozen on the manifest for audit

   * runtime_scope SHALL drive all downstream execution branching

   * replay_uses_frozen_post_seal_basis = run_kind == REPLAY and manifest.replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}

   * if replay_uses_frozen_post_seal_basis:
     frozen_post_seal_basis = LOAD_FROZEN_POST_SEAL_BASIS(prior_manifest)
     if frozen_post_seal_basis.status != VALID:
       return ERROR(frozen_post_seal_basis.reason_code)
     else:
       RECORD_EVENT(FrozenPostSealBasisLoaded, manifest.manifest_id)
   * else:
     frozen_post_seal_basis = None

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
     OPTIONAL_STAGE_TASK(
     stage_code="LOAD_AUTHORITY_CONTEXT",
     enabled=frozen_post_seal_basis == None,
     task_key=HASH(manifest.manifest_id, "LOAD_AUTHORITY_CONTEXT", client_id, period, ordered(runtime_scope)),
     order_domain_key=HASH(manifest.manifest_id, "POST_SEAL_COMMANDS", "LOAD_AUTHORITY_CONTEXT"),
     payload_ref=collection_boundary.collection_boundary_id
     ),
     OPTIONAL_STAGE_TASK(
     stage_code="MONITOR_LATE_DATA_AFTER_SEAL",
     enabled=frozen_post_seal_basis == None,
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
   * the claim target MUST still be a pre-start sealed manifest with `opened_at = null`, empty
     output/submission/drift projections, and null `decision_bundle_hash`,
     `deterministic_outcome_hash`, and `replay_attestation_ref`

   * if manifest_start_claim.status == ALREADY_TERMINAL:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return LOAD_EXISTING_DECISION_BUNDLE(manifest)

   * if manifest_start_claim.status == ALREADY_ACTIVE:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return ERROR(ATTEMPT_ALREADY_ACTIVE)

   * if manifest_start_claim.status == RECLAIM_REJECTED_ACTIVE_LEASE:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return ERROR(RECLAIM_BLOCKED_ACTIVE_LEASE)

   * if manifest_start_claim.status == RECOVERY_REQUIRED:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return ERROR(RECOVERY_CHILD_REQUIRED)

   * if manifest_start_claim.status == INVALID_PRESTART_STATE:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return ERROR(MANIFEST_START_CLAIM_INVALID)

   * if manifest_start_claim.status == CLAIM_GRANTED:
     PERSIST_STAGE_DAG_AND_OUTBOX(manifest, command_dag)

   * if manifest_start_claim.status == RECLAIM_GRANTED:
     RELOAD_PERSISTED_STAGE_DAG_AND_OUTBOX(
     manifest_start_claim.stage_dag_ref_or_null,
     manifest_start_claim.outbox_batch_ref_or_null
     )

   * if manifest_start_claim.status not in {CLAIM_GRANTED, RECLAIM_GRANTED}:
     ROLLBACK_ATOMIC_TRANSACTION()
     RECORD_EVENT(RunStartClaimRejected, manifest.manifest_id)
     return ERROR(MANIFEST_START_CLAIM_INVALID)

   * COMMIT_ATOMIC_TRANSACTION()

   * RECORD_EVENT(RunStarted, manifest.manifest_id)

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="RunStarted",
     module_updates=[
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="POST_SEAL_COMMANDS", gate_summary=non_access_gate_records)),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="LIVE"))
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

   * if not exists(graph.target_assessments) or not exists(graph.integrity_summary):
     return FINALIZE_RUN_FAILURE(manifest, GRAPH_INTEGRITY_SUMMARY_MISSING)

   * if exists(graph.integrity_summary) and graph.integrity_summary.rebuild_required == true:
     graph.lifecycle_state MUST be one of {LIMITED, REBUILD_REQUIRED, STALE}

   * if frozen_post_seal_basis != None:
     authority_context = frozen_post_seal_basis.authority_context
     late_data_monitor = frozen_post_seal_basis.late_data_monitor_result
     RECORD_EVENT(HistoricalAuthorityBasisReused, manifest.manifest_id)
     RECORD_EVENT(HistoricalLateDataBasisReused, manifest.manifest_id)
     else:
     authority_context = LOAD_STAGE_RESULT(command_outputs, stage_code="LOAD_AUTHORITY_CONTEXT")
     late_data_monitor = LOAD_STAGE_RESULT(command_outputs, stage_code="MONITOR_LATE_DATA_AFTER_SEAL")

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

   * graph MUST expose stable node/edge ids, critical paths, target assessments, proof-bundle refs, integrity summary, and graph addresses for filing-capable and trust-capable artifacts

   * UPDATE_MANIFEST_OUTPUTS(
     manifest,
     output_refs={
     "snapshot_id": snapshot.snapshot_id,
     "compute_id": compute.compute_id,
     "risk_id": risk.risk_id,
     "graph_id": graph.graph_id,
     "primary_proof_bundle_ref": SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope)
     }
     )

   * if forecast:
     UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"forecast_id": forecast.forecast_id})

   * SYNC_LIVE_EXPERIENCE(
     manifest,
     cause_ref="PostSealCommandsCompleted",
     module_updates=[
     MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="ANALYTICS_READY", gate_summary=non_access_gate_records)),
     MODULE_UPDATE("EVIDENCE_TIDE", BUILD_EVIDENCE_TIDE_STATE(source_window, collection_boundary, status="GRAPH_READY")),
     MODULE_UPDATE("FOCUS_LENS", BUILD_FOCUS_LENS_STATE(available=true, graph_ref=graph.graph_id))
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
     DERIVE_WEIGHTED_PATH_SURVIVABILITY(graph),
     DERIVE_LIMITATION_CLARITY_RATIO(graph),
     DERIVE_CRITICAL_SILENT_LIMITATION_COUNT(graph),
     DERIVE_NONCRITICAL_SILENT_LIMITATION_COUNT(graph),
     graph.quality.inferred_critical_path_ratio,
     graph.quality.proof_bundle_coverage,
     graph.quality.unsupported_critical_target_count,
     graph.quality.contradicted_critical_target_count,
     graph.quality.stale_critical_target_count,
     graph.quality.replay_failure_target_count,
     graph.integrity_summary.open_critical_target_count,
     graph.integrity_summary.missing_proof_bundle_target_count,
     DERIVE_CRITICAL_EXPLANATION_FAILURE_COUNT(graph),
     DERIVE_NONCRITICAL_EXPLANATION_FAILURE_COUNT(graph)
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
       WRITE_ARTIFACT(DriftBaselineEnvelope, baseline)
       RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

       delta_vector = BUILD_DRIFT_DELTA_VECTOR(manifest, baseline, cfg.drift_rules)
       temporal_map = CLASSIFY_TEMPORAL_POSITION(
         manifest,
         baseline,
         delta_vector,
         authority_state,
         collection_boundary,
         late_data_monitor,
         cfg.drift_rules
       )
       retroactive_impact = ANALYZE_RETROACTIVE_IMPACT(
         manifest,
         baseline,
         delta_vector,
         temporal_map,
         authority_state,
         late_data_monitor.finding_refs if exists(late_data_monitor.finding_refs) else [],
         cfg.amendment_rules
       )
       WRITE_ARTIFACT(RetroactiveImpactAnalysis, retroactive_impact)
       RECORD_EVENT(DriftRetroactiveImpactAnalyzed, manifest.manifest_id, retroactive_impact.retroactive_impact_id)

       drift = DETECT_DRIFT(manifest, baseline, delta_vector, temporal_map, retroactive_impact, cfg.drift_rules)
       WRITE_ARTIFACT(DriftRecord, drift)
       if exists(drift.supersedes_drift_id):
         RECORD_EVENT(DriftSuperseded, manifest.manifest_id, drift.drift_id)
       RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)
       RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

       amendment_window = MATERIALIZE_AMENDMENT_WINDOW_CONTEXT(baseline, authority_state, cfg.amendment_rules)
       WRITE_ARTIFACT(AmendmentWindowContext, amendment_window)
       RECORD_EVENT(AmendmentWindowEvaluated, manifest.manifest_id, amendment_window.amendment_window_context_id)

       amendment = EVALUATE_AMENDMENT_ELIGIBILITY(
         drift,
         baseline,
         amendment_window,
         retroactive_impact,
         authority_state,
         cfg.amendment_rules
       )
       amendment.intent_status = INTENT_SUBMITTED
       amendment.calculation_request_ref = amendment_calc.calculation_request_ref
       amendment.calculation_id = amendment_calc.calculation_id
       amendment.calculation_type = amendment_calc.calculation_type
       amendment.calculation_hash = amendment_calc.calculation_hash
       amendment.calculation_basis_ref = amendment_calc.calculation_basis_ref
       amendment.user_confirmation_ref = amendment_calc.user_confirmation_ref
       amendment.validation_outcome = amendment_calc.validation_outcome

       amendment_case = UPSERT_AMENDMENT_CASE(
         manifest,
         baseline,
         drift,
         retroactive_impact,
         amendment_window,
         amendment
       )
       UPDATE_MANIFEST_OUTPUTS(
         manifest,
         drift_refs=[drift.drift_id],
         output_refs={
           "baseline_envelope_id": baseline.baseline_envelope_id,
           "retroactive_impact_id": retroactive_impact.retroactive_impact_id,
           "amendment_window_context_id": amendment_window.amendment_window_context_id,
           "amendment_case_id": amendment_case.amendment_case_id
         }
       )
       RECORD_EVENT(IntentToAmendTriggered, manifest.manifest_id, amendment_case.amendment_case_id)

       SYNC_LIVE_EXPERIENCE(
         manifest,
         cause_ref="IntentToAmendTriggered",
         module_updates=[
           MODULE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="INTENT_TRIGGERED")),
           MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
         ],
         posture_state="CONTAINED",
         semantic_motion="RIPPLE"
       )

       amendment_gate = AMENDMENT_GATE(
         baseline,
         amendment_window.window_state,
         drift.materiality_class,
         drift.difference_classes,
         retroactive_impact,
         amendment_case.freshness_state,
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
           module_updates=[
             MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
         graph_id=graph.graph_id,
         primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
           filing_readiness_context=filing_calculation,
           trust_currency_state=NOT_APPLICABLE_PRETRUST,
           trust_currency_reason_codes=[]
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
           graph_id=graph.graph_id,
           primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
         graph_id=graph.graph_id,
         primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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

* amendment_bundle = None

* baseline = SELECT_DRIFT_BASELINE(
  client_id,
  period,
  authority_state,
  precedence="authority_corrected > amended > filed > out_of_band > working"
  )

* WRITE_ARTIFACT(DriftBaselineEnvelope, baseline)

* RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

* delta_vector = BUILD_DRIFT_DELTA_VECTOR(
  manifest,
  baseline,
  cfg.drift_rules
  )

* temporal_map = CLASSIFY_TEMPORAL_POSITION(
  manifest,
  baseline,
  delta_vector,
  authority_state,
  collection_boundary,
  late_data_monitor,
  cfg.drift_rules
  )

* retroactive_impact = ANALYZE_RETROACTIVE_IMPACT(
  manifest,
  baseline,
  delta_vector,
  temporal_map,
  authority_state,
  late_data_monitor.finding_refs if exists(late_data_monitor.finding_refs) else [],
  cfg.amendment_rules
  )

* WRITE_ARTIFACT(RetroactiveImpactAnalysis, retroactive_impact)

* RECORD_EVENT(DriftRetroactiveImpactAnalyzed, manifest.manifest_id, retroactive_impact.retroactive_impact_id)

* drift = DETECT_DRIFT(
  manifest,
  baseline,
  delta_vector,
  temporal_map,
  retroactive_impact,
  cfg.drift_rules
  )

* WRITE_ARTIFACT(DriftRecord, drift)

* if exists(drift.supersedes_drift_id):
  RECORD_EVENT(DriftSuperseded, manifest.manifest_id, drift.drift_id)

* RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)

* RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

* amendment_window = MATERIALIZE_AMENDMENT_WINDOW_CONTEXT(
  baseline,
  authority_state,
  cfg.amendment_rules
  )

* WRITE_ARTIFACT(AmendmentWindowContext, amendment_window)

* RECORD_EVENT(AmendmentWindowEvaluated, manifest.manifest_id, amendment_window.amendment_window_context_id)

* amendment = EVALUATE_AMENDMENT_ELIGIBILITY(
  drift,
  baseline,
  amendment_window,
  retroactive_impact,
  authority_state,
  cfg.amendment_rules
  )

* amendment_case = UPSERT_AMENDMENT_CASE(
  manifest,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  amendment
  )

* RECORD_EVENT(AmendmentEligibilityEvaluated, manifest.manifest_id, amendment_case.amendment_case_id)

* UPDATE_MANIFEST_OUTPUTS(
  manifest,
  drift_refs=[drift.drift_id],
  output_refs={
    "baseline_envelope_id": baseline.baseline_envelope_id,
    "retroactive_impact_id": retroactive_impact.retroactive_impact_id,
    "amendment_window_context_id": amendment_window.amendment_window_context_id,
    "amendment_case_id": amendment_case.amendment_case_id
  }
  )

* SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="DriftDetected",
  module_updates=[
  MODULE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="ELIGIBILITY_EVALUATED")),
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
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

* trust_input_state = ASSESS_TRUST_INPUT_STATE(
  snapshot,
  compute,
  risk,
  parity,
  graph.quality,
  upstream_gates=non_access_gate_records,
  authority_state=authority_state,
  baseline_submission_state=baseline_submission_state,
  live_authority_progression_requested=live_authority_progression_requested,
  late_data_monitor=late_data_monitor,
  required_human_steps=pre_trust_human_steps,
  overrides=LOAD_OVERRIDES(active_override_refs),
  trust_policy=cfg.trust_policy
  )

* trust = SYNTHESIZE_TRUST(
  snapshot,
  compute,
  risk,
  parity,
  graph.quality,
  trust_input_state=trust_input_state,
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
  calculation_context=filing_calculation,
  trust_currency_state=CURRENT,
  trust_currency_reason_codes=[]
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
  module_updates=[
  MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="TRUST_READY", gate_summary=non_access_gate_records)),
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet=None, filing_case=filing_case, status="NOT_STARTED"))
  ],
  posture_state="CONTAINED" if GATE_REQUIRES_REVIEW(gate_trust) else ("FRACTURED" if GATE_BLOCKS_PROGRESS(gate_trust) else "STREAMING"),
  semantic_motion="TRACE" if gate_trust.decision in {PASS, PASS_WITH_NOTICE} else ("FRACTURE" if GATE_BLOCKS_PROGRESS(gate_trust) else "ECHO")
  )

* trust_terminal_requires_block = GATE_BLOCKS_PROGRESS(gate_trust)

* trust_terminal_requires_review = GATE_REQUIRES_REVIEW(gate_trust)

12. Workflow planning and immediate consequence refresh

* prior_workflow_item_refs = workflow_item_refs if exists(workflow_item_refs) else []

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

* opened_workflow_item_refs = ORDERED_SET_DIFF(workflow_item_refs, prior_workflow_item_refs)

* resolved_workflow_item_refs = ORDERED_SET_DIFF(prior_workflow_item_refs, workflow_item_refs)

* `ORDERED_SET_DIFF(left_refs, right_refs)` SHALL preserve the stable queue order of `left_refs`
  while excluding any ref already present in `right_refs`.

* if opened_workflow_item_refs != []:
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, opened_workflow_item_refs)

* if resolved_workflow_item_refs != []:
  RECORD_EVENT(WorkflowResolved, manifest.manifest_id, resolved_workflow_item_refs)

* workflow_refresh_required = (
  opened_workflow_item_refs != []
  or resolved_workflow_item_refs != []
  or workflow_item_refs != []
  or prior_workflow_item_refs != []
  )

* if workflow_refresh_required:
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref=(
  "WorkflowOpened" if opened_workflow_item_refs != []
  else ("WorkflowResolved" if resolved_workflow_item_refs != [] else "WorkflowRefreshed")
  ),
  module_updates=[
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
  ],
  posture_state=(
  "CONTAINED" if workflow_item_refs != [] or trust_terminal_requires_review
  else ("FRACTURED" if trust_terminal_requires_block else "STREAMING")
  ),
  semantic_motion="ECHO"
  )

13. Publish live read-model projections and conditionally terminalize on trust posture

* projection_gate_refs = EXTRACT_GATE_IDS(non_access_gate_records)

* projection_masking_fingerprint = HASH(masking_context)

* projection_shell_surface_order = [
  "CONTEXT_BAR",
  "DECISION_SUMMARY",
  "ACTION_STRIP",
  "DETAIL_DRAWER"
  ]

* projection_source_surface_order = [
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

* projection_frame_payload = {
  "manifest_id": manifest.manifest_id,
  "snapshot_id": snapshot.snapshot_id,
  "compute_id": compute.compute_id,
  "risk_id": risk.risk_id,
  "parity_id": parity.parity_id,
  "trust_id": trust.trust_id,
  "graph_id": graph.graph_id,
  "filing_case_id": filing_case.filing_case_id if exists(filing_case) else None,
  "amendment_case_id": amendment_case.amendment_case_id if exists(amendment_case) else None,
  "twin_id": twin.twin_id if exists(twin) else None,
  "focus_lens_index_ref": None,
  "gate_refs": projection_gate_refs,
  "workflow_item_refs": workflow_item_refs,
  "runtime_scope": runtime_scope,
  "mode": mode,
  "experience_profile": "LOW_NOISE",
  "projection_masking_context": masking_context,
  "projection_masking_hash": projection_masking_fingerprint,
  "shell_surface_order": projection_shell_surface_order,
  "source_surface_order": projection_source_surface_order
  }

* current_projection_posture_state = (
  "CONTAINED" if trust_terminal_requires_review
  else ("FRACTURED" if trust_terminal_requires_block else "STREAMING")
  )

* current_projection_semantic_motion = (
  "ECHO" if trust_terminal_requires_review
  else ("FRACTURE" if trust_terminal_requires_block else "TRACE")
  )

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
  filing_case.filing_case_id if exists(filing_case) else None,
  amendment_case.amendment_case_id if exists(amendment_case) else None,
  ordered(workflow_item_refs),
  ordered(projection_gate_refs),
  projection_masking_fingerprint,
  ordered(runtime_scope)
  ),
  order_domain_key=HASH(manifest.manifest_id, "LIVE_READ_MODEL_PROJECTIONS", "BUILD_LIVE_EXPERIENCE_FRAME"),
  payload_ref=projection_frame_payload
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
  projection_frame_payload["focus_lens_index_ref"] = focus_lens_index.index_ref if exists(focus_lens_index.index_ref) else None

* if HAS_STAGE_RESULT(projection_outputs, stage_code="BUILD_LIVE_EXPERIENCE_FRAME"):
  experience_frame = LOAD_STAGE_RESULT(projection_outputs, stage_code="BUILD_LIVE_EXPERIENCE_FRAME")
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="ExperienceFrameRefreshed",
  surface_updates=experience_frame.surface_updates,
  posture_state=current_projection_posture_state,
  semantic_motion=current_projection_semantic_motion,
  shell_overrides={
  "experience_profile": experience_frame.experience_profile if exists(experience_frame.experience_profile) else "LOW_NOISE",
  "attention_state": experience_frame.attention_state,
  "primary_object_ref": experience_frame.primary_object_ref,
  "actionability_state": experience_frame.actionability_state,
  "primary_action_code": experience_frame.primary_action_code,
  "no_safe_action_reason_code": experience_frame.no_safe_action_reason_code,
  "secondary_notice_count": experience_frame.secondary_notice_count,
  "detail_entry_points": experience_frame.detail_entry_points,
  "suggested_detail_surface_code": experience_frame.suggested_detail_surface_code,
  "active_detail_surface_code": experience_frame.active_detail_surface_code,
  "focus_anchor_ref": experience_frame.focus_anchor_ref,
  "attention_policy": experience_frame.attention_policy,
  "cognitive_budget": experience_frame.cognitive_budget,
  "shell_stability_token": experience_frame.shell_stability_token
  },
  affected_object_refs=experience_frame.affected_object_refs if exists(experience_frame.affected_object_refs) else [],
  affected_surface_codes=experience_frame.affected_surface_codes if exists(experience_frame.affected_surface_codes) else projection_shell_surface_order
  )

* if exists(twin):
  projection_frame_payload["twin_id"] = twin.twin_id

* if exists(twin) or exists(focus_lens_index):
  refreshed_experience_frame = BUILD_LIVE_EXPERIENCE_FRAME(projection_frame_payload)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="ProjectionSidecarsMaterialized",
  surface_updates=refreshed_experience_frame.surface_updates,
  posture_state=current_projection_posture_state,
  semantic_motion="ECHO",
  shell_overrides={
  "experience_profile": refreshed_experience_frame.experience_profile if exists(refreshed_experience_frame.experience_profile) else "LOW_NOISE",
  "attention_state": refreshed_experience_frame.attention_state,
  "primary_object_ref": refreshed_experience_frame.primary_object_ref,
  "actionability_state": refreshed_experience_frame.actionability_state,
  "primary_action_code": refreshed_experience_frame.primary_action_code,
  "no_safe_action_reason_code": refreshed_experience_frame.no_safe_action_reason_code,
  "secondary_notice_count": refreshed_experience_frame.secondary_notice_count,
  "detail_entry_points": refreshed_experience_frame.detail_entry_points,
  "suggested_detail_surface_code": refreshed_experience_frame.suggested_detail_surface_code,
  "active_detail_surface_code": refreshed_experience_frame.active_detail_surface_code,
  "focus_anchor_ref": refreshed_experience_frame.focus_anchor_ref,
  "attention_policy": refreshed_experience_frame.attention_policy,
  "cognitive_budget": refreshed_experience_frame.cognitive_budget,
  "shell_stability_token": refreshed_experience_frame.shell_stability_token
  },
  affected_object_refs=refreshed_experience_frame.affected_object_refs if exists(refreshed_experience_frame.affected_object_refs) else [],
  affected_surface_codes=refreshed_experience_frame.affected_surface_codes if exists(refreshed_experience_frame.affected_surface_codes) else projection_shell_surface_order
  )

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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  amendment_case = VALIDATE_AMENDMENT_READINESS_FRESHNESS(
  amendment_case,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  authority_state,
  cfg.amendment_rules
  )

  if amendment_case.freshness_state == STALE:
  RECORD_EVENT(AmendmentFreshnessInvalidated, manifest.manifest_id, amendment_case.amendment_case_id)

  amendment_gate = AMENDMENT_GATE(
  baseline,
  amendment_window.window_state,
  drift.materiality_class,
  drift.difference_classes,
  retroactive_impact,
  amendment_case.freshness_state,
  amendment.intent_status if exists(amendment.intent_status) else amendment_case.lifecycle_state,
  authority_state,
  runtime_scope,
  amendment_readiness_context=LOAD_READINESS_CONTEXT(amendment_case) if exists(amendment_case.readiness_context_ref) else None
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
  module_updates=[
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
      primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    RECORD_EVENT(DriftReviewEscalated, manifest.manifest_id, drift.drift_id)
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
      primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
      primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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

  amendment_case = UPSERT_AMENDMENT_CASE(
    manifest,
    baseline,
    drift,
    retroactive_impact,
    amendment_window,
    amendment,
    calculation_context=amendment_calc
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})
  RECORD_EVENT(IntentToAmendTriggered, manifest.manifest_id, amendment_case.amendment_case_id)

  SYNC_LIVE_EXPERIENCE(
    manifest,
    cause_ref="IntentToAmendTriggered",
    module_updates=[
      MODULE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="INTENT_SUBMITTED")),
      MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
    ],
    posture_state="CONTAINED",
    semantic_motion="RIPPLE"
  )

  decisive_amendment_gate = AMENDMENT_GATE(
    baseline,
    amendment_window.window_state,
    drift.materiality_class,
    drift.difference_classes,
    retroactive_impact,
    amendment_case.freshness_state,
    amendment_case.lifecycle_state,
    authority_state,
    runtime_scope,
    amendment_readiness_context=amendment_calc
  )

  WRITE_ARTIFACT(GateDecisionRecord, decisive_amendment_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, decisive_amendment_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [decisive_amendment_gate])
  non_access_gate_records = non_access_gate_records + [decisive_amendment_gate]

  SYNC_LIVE_EXPERIENCE_FROM_GATES(
    manifest,
    [decisive_amendment_gate],
    phase_code="AMENDMENT_GATE_POST_INTENT"
  )

  if amendment_calc.validation_outcome == PASS and decisive_amendment_gate.decision in {PASS, PASS_WITH_NOTICE}:
    amendment_case.lifecycle_state = READY_TO_AMEND
    amendment_case = UPSERT_AMENDMENT_CASE(
      manifest,
      baseline,
      drift,
      retroactive_impact,
      amendment_window,
      amendment_case
    )
    UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})
    RECORD_EVENT(IntentToAmendValidated, manifest.manifest_id, amendment_case.amendment_case_id)

    SYNC_LIVE_EXPERIENCE(
      manifest,
      cause_ref="IntentToAmendValidated",
      module_updates=[
        MODULE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="READY_TO_AMEND"))
      ],
      posture_state="BRIDGED",
      semantic_motion="BRIDGE"
    )

  else:
    if GATE_REQUIRES_REVIEW(decisive_amendment_gate):
      RECORD_EVENT(DriftReviewEscalated, manifest.manifest_id, drift.drift_id)
    bundle = DecisionBundle(
      manifest_id=manifest.manifest_id,
      decision_status=(
        "BLOCKED"
        if GATE_BLOCKS_PROGRESS(decisive_amendment_gate)
           or amendment_calc.validation_outcome in {HARD_BLOCK, OVERRIDABLE_BLOCK}
        else "REVIEW_REQUIRED"
      ),
      snapshot_id=snapshot.snapshot_id,
      compute_id=compute.compute_id,
      risk_id=risk.risk_id,
      parity_id=parity.parity_id,
      trust_id=trust.trust_id,
      graph_id=graph.graph_id,
      primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
      twin_id=twin.twin_id if exists(twin) else None,
      workflow_item_refs=workflow_item_refs
    )
    return FINALIZE_TERMINAL_OUTCOME(
      manifest,
      bundle,
      terminal_reasons=[decisive_amendment_gate],
      gate_records=non_access_gate_records,
      graph=graph,
      drift=drift,
      retention_profile=cfg.retention_profile
    )
  ```

  if wants_amendment_submit:
  # do not terminalize here from amendment posture
  # amendment-derived block/review posture remains upstream input to `FILING_GATE`
  # every `FILING_GATE(...)` invocation SHALL also consume the current graph target assessments,
  # integrity summary, and controlling proof bundle ref so filing readiness cannot ignore unsupported,
  # contradicted, stale, or open proof posture
  pass

15. Authority calculation, filing readiness, packet preparation, and filing gate

* packet = None

* filing_gate = None

* if wants_prepare_submission or wants_submit or wants_amendment_submit:

  trust_currency = CHECK_TRUST_CURRENCY(
  trust,
  snapshot,
  compute,
  risk,
  parity,
  graph.quality,
  authority_state=authority_state,
  late_data_monitor=late_data_monitor,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  overrides=LOAD_OVERRIDES(active_override_refs),
  trust_policy=cfg.trust_policy
  )

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
  filing_readiness_context=None,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
      module_updates=[
        MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
    primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  filing_readiness_context=None,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
      module_updates=[
        MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
    primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  calculation_context=filing_calculation,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
      filing_readiness_context=filing_calculation,
      trust_currency_state=trust_currency.state,
      trust_currency_reason_codes=trust_currency.reason_codes
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
        module_updates=[
          MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
      primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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

  packet.approval_state = approval_state
  packet.declared_basis_ack_state = declared_basis_ack_state
  packet.notice_step_refs = [step.notice_step_id for step in filing_notice_steps]
  packet.notice_resolution_ref = None
  packet.filing_gate_ref = None
  packet.readiness_context_ref = (
  filing_calculation.readiness_context_ref
  if exists(filing_calculation) and exists(filing_calculation.readiness_context_ref)
  else (
  filing_calculation.calculation_readiness_context_id
  if exists(filing_calculation) and exists(filing_calculation.calculation_readiness_context_id)
  else None
  )
  )
  packet.user_confirmation_ref = filing_calculation.user_confirmation_ref if exists(filing_calculation) else None

  WRITE_ARTIFACT(FilingPacket, packet)
  RECORD_EVENT(FilingPacketPrepared, manifest.manifest_id, packet.packet_id)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="FilingPacketPrepared",
  module_updates=[
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case if exists(filing_case) else None, status="PREPARED"))
  ],
  posture_state="FROZEN",
  semantic_motion="SEAL"
  )

  filing_case = UPSERT_FILING_CASE(
  manifest,
  trust,
  parity,
  packet,
  submission=None,
  amendment_posture=amendment_case if exists(amendment_case) else amendment,
  calculation_context=filing_calculation,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
  filing_readiness_context=filing_calculation if exists(filing_calculation) else None,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
  )

  WRITE_ARTIFACT(GateDecisionRecord, filing_gate)
  RECORD_EVENT(GateEvaluated, manifest.manifest_id, filing_gate.gate_code)
  APPEND_MANIFEST_GATES(manifest, [filing_gate])
  non_access_gate_records = non_access_gate_records + [filing_gate]
  packet.filing_gate_ref = filing_gate.gate_decision_id
  WRITE_ARTIFACT(FilingPacket, packet)

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
  module_updates=[
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  packet.notice_resolution_ref = notice_resolution.notice_resolution_id
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
  calculation_context=filing_calculation,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
  module_updates=[
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="APPROVED_TO_SUBMIT"))
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

  if wants_amendment_submit:
  amendment_bundle = CONSTRUCT_AMENDMENT_BUNDLE(
  manifest,
  amendment_case,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  packet,
  cfg.authority_operation_profile
  )
  WRITE_ARTIFACT(AmendmentBundle, amendment_bundle)
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_bundle_id": amendment_bundle.amendment_bundle_id})
  RECORD_EVENT(AmendmentBundlePrepared, manifest.manifest_id, amendment_bundle.amendment_bundle_id)

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
  module_updates=[
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(operation, request, submission=None, reconciliation=None, status="REQUEST_BUILT"))
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
  module_updates=[
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
  amendment_case = UPSERT_AMENDMENT_CASE(
  manifest,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  amendment_case
  )
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
  calculation_context=filing_calculation,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"filing_case_id": filing_case.filing_case_id})
  COMMIT_ATOMIC_TRANSACTION()

  RECORD_EVENT(SubmissionAttempted, manifest.manifest_id, submission.submission_id)

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="SubmissionAttempted",
  module_updates=[
  MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="CALM_SHELL",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="LOCAL_INTENT_ONLY",
  active_phase="AUTHORITY_TRANSMIT",
  checkpoint_state="TRANSMIT_PENDING",
  latest_cause_ref="SubmissionAttempted",
  pending_object_refs=[submission.submission_id, request.request_id]
  )),
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
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
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="SUBMIT_IN_PROGRESS"))
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
  module_updates=[
  MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="CALM_SHELL",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="AUTHORITY_PENDING",
  active_phase="AUTHORITY_RECONCILIATION",
  checkpoint_state="PENDING_ACK",
  latest_cause_ref="SubmissionAwaitingAuthorityConfirmation",
  pending_object_refs=[submission.submission_id]
  )),
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
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
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="SUBMITTED_PENDING")),
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
  module_updates=[
  MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="CALM_SHELL",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="WAITING_ON_AUTHORITY",
  truth_state="LOCAL_INTENT_ONLY",
  active_phase="AUTHORITY_TRANSMIT",
  checkpoint_state="TRANSMIT_PENDING",
  latest_cause_ref="SubmissionTransmitStillPending",
  pending_object_refs=[submission.submission_id, request.request_id]
  )),
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
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
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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
  calculation_context=filing_calculation,
  trust_currency_state=trust_currency.state,
  trust_currency_reason_codes=trust_currency.reason_codes
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
  module_updates=[
  MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="CALM_SHELL",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state="IDLE" if resolved_authority_status == "CONFIRMED" else "WAITING_ON_HUMAN",
  truth_state=resolved_truth_state,
  active_phase="AUTHORITY_RECONCILED",
  checkpoint_state=resolved_authority_status,
  latest_cause_ref="SubmissionReconciled",
  pending_object_refs=[] if resolved_authority_status == "CONFIRMED" else workflow_item_refs
  )),
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
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
  MODULE_UPDATE("PACKET_FORGE", BUILD_PACKET_FORGE_STATE(packet, filing_case, status="RECONCILED"))
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
  amendment_case = UPSERT_AMENDMENT_CASE(
  manifest,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  amendment_case
  )
  UPDATE_MANIFEST_OUTPUTS(manifest, output_refs={"amendment_case_id": amendment_case.amendment_case_id})

17. Post-authority drift monitoring

* if exists(submission) and exists(reconciliation):
  baseline = SELECT_DRIFT_BASELINE(
  client_id,
  period,
  authority_state,
  precedence="authority_corrected > amended > filed > out_of_band > working"
  )
  WRITE_ARTIFACT(DriftBaselineEnvelope, baseline)
  RECORD_EVENT(BaselineSelected, manifest.manifest_id, baseline.baseline_ref if exists(baseline.baseline_ref) else manifest.manifest_id)

  delta_vector = BUILD_DRIFT_DELTA_VECTOR(
  manifest,
  baseline,
  cfg.drift_rules
  )

  temporal_map = CLASSIFY_TEMPORAL_POSITION(
  manifest,
  baseline,
  delta_vector,
  authority_state,
  collection_boundary,
  late_data_monitor,
  cfg.drift_rules
  )

  retroactive_impact = ANALYZE_RETROACTIVE_IMPACT(
  manifest,
  baseline,
  delta_vector,
  temporal_map,
  authority_state,
  late_data_monitor.finding_refs if exists(late_data_monitor.finding_refs) else [],
  cfg.amendment_rules
  )
  WRITE_ARTIFACT(RetroactiveImpactAnalysis, retroactive_impact)
  RECORD_EVENT(DriftRetroactiveImpactAnalyzed, manifest.manifest_id, retroactive_impact.retroactive_impact_id)

  drift = DETECT_DRIFT(manifest, baseline, delta_vector, temporal_map, retroactive_impact, cfg.drift_rules)
  WRITE_ARTIFACT(DriftRecord, drift)
  if exists(drift.supersedes_drift_id):
  RECORD_EVENT(DriftSuperseded, manifest.manifest_id, drift.drift_id)
  RECORD_EVENT(DriftDetected, manifest.manifest_id, drift.drift_id)
  RECORD_EVENT(DriftClassified, manifest.manifest_id, drift.drift_id)

  amendment_window = MATERIALIZE_AMENDMENT_WINDOW_CONTEXT(
  baseline,
  authority_state,
  cfg.amendment_rules
  )
  WRITE_ARTIFACT(AmendmentWindowContext, amendment_window)
  RECORD_EVENT(AmendmentWindowEvaluated, manifest.manifest_id, amendment_window.amendment_window_context_id)

  amendment = EVALUATE_AMENDMENT_ELIGIBILITY(drift, baseline, amendment_window, retroactive_impact, authority_state, cfg.amendment_rules)
  amendment_case = UPSERT_AMENDMENT_CASE(
  manifest,
  baseline,
  drift,
  retroactive_impact,
  amendment_window,
  amendment_case if exists(amendment_case) else amendment
  )
  if reconciliation.outcome == RECONCILED_CONFIRMED and amendment_case.lifecycle_state == SUPERSEDED:
  RECORD_EVENT(AuthorityAcceptedStateInternallySuperseded, manifest.manifest_id, amendment_case.amendment_case_id)
  RECORD_EVENT(AmendmentEligibilityEvaluated, manifest.manifest_id, amendment_case.amendment_case_id)

  UPDATE_MANIFEST_OUTPUTS(
  manifest,
  drift_refs=[drift.drift_id],
  output_refs={
  "baseline_envelope_id": baseline.baseline_envelope_id,
  "retroactive_impact_id": retroactive_impact.retroactive_impact_id,
  "amendment_window_context_id": amendment_window.amendment_window_context_id,
  "amendment_case_id": amendment_case.amendment_case_id
  }
  )

  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="PostAuthorityDriftEvaluated",
  module_updates=[
  MODULE_UPDATE("DRIFT_FIELD", BUILD_DRIFT_FIELD_STATE(drift, amendment_case, status="POST_AUTHORITY_EVALUATED")),
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE_FROM_AMENDMENT(amendment_case))
  ],
  posture_state="CONTAINED" if drift.materiality_class in {MATERIAL_REVIEW, AMENDMENT_REQUIRED} or amendment.eligible or retroactive_impact.replay_requirement != NONE else "STREAMING",
  semantic_motion="RIPPLE"
  )

  if drift.materiality_class in {MATERIAL_REVIEW, AMENDMENT_REQUIRED} or amendment.eligible or retroactive_impact.replay_requirement != NONE:
  drift_workflow_ref = EMIT_WORKFLOW_ITEM("ReviewDrift/Amendment", refs=drift.provenance)
  workflow_item_refs = workflow_item_refs + [drift_workflow_ref]
  RECORD_EVENT(WorkflowOpened, manifest.manifest_id, drift_workflow_ref)
  if retroactive_impact.replay_requirement != NONE or drift.source_contradiction_state != NONE:
  RECORD_EVENT(DriftReviewEscalated, manifest.manifest_id, drift.drift_id)
  SYNC_LIVE_EXPERIENCE(
  manifest,
  cause_ref="WorkflowOpened",
  module_updates=[
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(workflow_item_refs, non_access_gate_records, mode, runtime_scope))
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

* terminal_workflow_item_refs = NORMALIZE_TERMINAL_WORKFLOW_REFS(
  workflow_item_refs,
  final_decision_status,
  reconciliation.outcome if exists(reconciliation) else None
  )

* `NORMALIZE_TERMINAL_WORKFLOW_REFS(...)` SHALL preserve only still-open workflow items relevant
  after terminal persistence, closing or excluding transient transmit/reconciliation trackers once
  authority posture is durably resolved while retaining active drift, approval, late-data, and
  remediation work when it remains open.

* authority_tunnel_terminal_status = (
  submission.lifecycle_state if exists(submission)
  else ("REQUEST_BUILT" if exists(request) else "NOT_STARTED")
  )

* terminal_checkpoint_state = (
  "PENDING_ACK" if authority_tunnel_terminal_status == "TRANSMITTED"
  else ("TRANSMIT_PENDING" if authority_tunnel_terminal_status == "REQUEST_BUILT"
  else ("NONE" if authority_tunnel_terminal_status == "NOT_STARTED" else authority_tunnel_terminal_status))
  )

* `terminal_checkpoint_state` SHALL be the only value copied into persisted replay artifacts or
  shell-level `checkpoint_state`. `authority_tunnel_terminal_status` may retain finer-grained
  transport detail such as `REQUEST_BUILT` or `TRANSMITTED` for the Authority Tunnel itself, but
  those transport-only states SHALL NOT leak into the canonical shell/checkpoint vocabulary.

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
  module_updates=[
  MODULE_UPDATE("PULSE_SPINE", BUILD_PULSE_SPINE_STATE(
  manifest,
  shell_state="CALM_SHELL",
  connection_state="CONNECTED",
  catchup_state="CAUGHT_UP",
  activity_state=terminal_activity_state,
  truth_state=terminal_truth_state,
  active_phase="TERMINAL",
  checkpoint_state=terminal_checkpoint_state,
  latest_cause_ref="TerminalFinalization",
  pending_object_refs=[] if final_decision_status == "COMPLETED" else terminal_workflow_item_refs
  )),
  MODULE_UPDATE("MANIFEST_RIBBON", BUILD_MANIFEST_RIBBON_STATE(
  manifest,
  lifecycle_state=("COMPLETED" if final_decision_status in {"COMPLETED", "REVIEW_REQUIRED"} else "BLOCKED"),
  decision_posture=final_decision_status,
  runtime_scope=runtime_scope
  )),
  MODULE_UPDATE("DECISION_STAGE", BUILD_DECISION_STAGE_STATE(manifest, phase_code="TERMINAL", gate_summary=non_access_gate_records)),
  MODULE_UPDATE("CONSEQUENCE_RAIL", BUILD_CONSEQUENCE_RAIL_STATE(terminal_workflow_item_refs, non_access_gate_records, mode, runtime_scope)),
  MODULE_UPDATE("AUTHORITY_TUNNEL", BUILD_AUTHORITY_TUNNEL_STATE(
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
  workflow_item_refs=terminal_workflow_item_refs,
  snapshot_id=snapshot.snapshot_id,
  compute_id=compute.compute_id,
  forecast_id=forecast.forecast_id if forecast else None,
  risk_id=risk.risk_id,
  parity_id=parity.parity_id,
  trust_id=trust.trust_id,
  graph_id=graph.graph_id,
  primary_proof_bundle_ref=SELECT_PRIMARY_PROOF_BUNDLE_REF(graph, runtime_scope),
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
* workers consuming `AUTHORITY_TRANSMIT` SHALL re-run mandatory send-time binding and duplicate-truth
  revalidation immediately before bytes leave the process, and SHALL persist
  `send_revalidation_state`, `send_revalidated_at`, `send_authorized_token_version_ref`, and
  `send_revalidation_reason_codes[]` on the linked `AuthorityInteractionRecord` before they
  transition that exchange to `TRANSMIT_IN_FLIGHT` or a blocked non-send terminal path.
* read-side projection workers such as `BUILD_TWIN_VIEW`, `BUILD_FOCUS_LENS_INDEX`, and `BUILD_LIVE_EXPERIENCE_FRAME` SHALL NOT mutate command-side truth, SHALL NOT require the manifest-start lease, and SHALL be allowed to complete after `DecisionBundle` persistence.
* `PLAN_SOURCE_COLLECTION(...)`, `BUILD_FILING_PACKET(...)`, and `CANONICALIZE_AUTHORITY_REQUEST(...)` SHALL reject or ignore any attempt to apply `masking_context`; execution semantics MUST use canonical unmasked compliance facts and frozen access binding, while masking remains limited to human/view/export projections.
* `INIT_EXPERIENCE_STREAM(...)` SHALL allocate a reconnect-safe subscription key, stable `shell_route_key = manifest_id`, and monotonic `experience_sequence` ordering across live delivery, catch-up delivery, and snapshot reload; it SHALL also persist `frame_epoch`, `last_published_sequence`, `surface_version_map`, `last_materialized_frame_ref`, a deterministic resume token `RESUME_TOKEN(manifest_id, frame_epoch, experience_sequence)`, stream-level `experience_profile`, `attention_policy_version`, the default detail-module policy, `shell_stability_token`, the last shell-level `actionability_state`, the last `active_detail_surface_code`, and the last resolvable `focus_anchor_ref`. `frame_epoch` SHALL change only when clients must rebase from a new derived frame baseline; it SHALL NOT imply a route reset, page reload, or destructive shell remount.
* `AUTHORITY_NEXT_CHECKPOINT_AT(cfg, submission, phase)` SHALL deterministically derive the next visible checkpoint from provider profile, last authority event, retry policy, and reconciliation cadence.
* `WAIT_FOR_TRANSMIT_OR_RECONCILIATION(...)` SHALL return one of:

  * `RESOLVED_RECONCILIATION` when a deterministic authority outcome is available inside the inline budget;
  * `TRANSMITTED_AWAITING_ACK` when outbound dispatch or accepted-pending authority receipt is proven but legal confirmation is still outstanding; or
  * `TRANSMIT_PENDING_UNVERIFIED` when the engine has queued transmit intent but has not yet observed outbound proof inside the inline budget.
* `BUILD_SURFACE_PATCH_SET(previous_frame, module_updates, shell_overrides)` SHALL:

  * diff each requested module update against the latest materialized frame for the same manifest;
  * when `experience_profile="LOW_NOISE"`, synthesize composite shell surfaces `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` from the richer semantic module set before final diff emission while retaining the source modules as detail-module inputs or explicit investigation-mode surfaces;
  * when `experience_profile="LOW_NOISE"`, publish only `CONTEXT_BAR`, `DECISION_SUMMARY`, `ACTION_STRIP`, and `DETAIL_DRAWER` as peer entries in `surface_updates[]`; richer observatory surfaces SHALL remain drawer inputs and SHALL NOT be emitted as additional sibling regions in the default shell;
  * compute `cognitive_budget = LOW_NOISE_COGNITIVE_BUDGET(...)`, `copy_budget = LOW_NOISE_COPY_BUDGET(...)`, `attention_policy = DERIVE_ATTENTION_POLICY(...)`, `visible_action_set = FILTER_VISIBLE_ACTIONS(...)`, and normalized limitation states before any composite shell payload is emitted;
  * compute and freeze `primary_rank_score`, `runner_up_rank_score`, `dominance_margin`, `primary_action_score`, `runner_up_action_score`, and `action_dominance_margin` before publication so renderer-local heuristics cannot change salience ordering;
  * publish one `dominance_contract` for every mounted shell snapshot so dominant-question ownership, dominant-action ownership, support-surface subordination, queue subordination, responsive collapse, and detached-support behavior stay server-authored;
  * trim context labels, summary copy, action labels, and detail-entry copy through `TRIM_LOW_NOISE_COPY(...)` before schema serialization so the shell remains one-scan readable under verbose authority, drift, or audit inputs;
  * emit explicit shell-level `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref` whenever the dominant action, recommended investigation path, or mounted detail context changes, so reconnect and terminal reload never depend on client-side inference;
  * enforce the default visible-attention budget so that the published shell contains at most one primary issue, one primary action, and one expanded detail module unless explicit compare or audit mode is active;
  * compute `scan_load(F)` for every low-noise frame and refuse publication of any widening patch that would exceed `visibility_budget_units`; lower-ranked warnings, actions, or detail entries SHALL collapse before the shell widens;
  * for non-material refresh, compute `continuity_cost(R) = 5*1[dominant_question changes] + 4*1[primary_action_code changes] + 3*1[focus_anchor_ref is lost] + 2*rank_swap_count(R) + 2*prominent_motion_count(R)` and coalesce refreshes that exceed the frozen continuity budget;
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

  * accept exactly one of `module_updates[]` or already-materialized published `surface_updates[]`; callers SHALL NOT send both in the same emission path;

  * execute in the following order:

    1. `previous_frame = LOAD_OR_BUILD_LATEST_EXPERIENCE_FRAME(manifest.manifest_id)`
    2. derive shell-level `connection_state`, `activity_state`, `truth_state`, `checkpoint_state`, `truth_origin`, and `posture_state` from persisted command-side truth, inbox-normalized authority artifacts, workflow state, and the current causal transition
    3. if `module_updates[]` were supplied, `patch_set = BUILD_SURFACE_PATCH_SET(previous_frame, module_updates, shell_overrides)`
    4. else `patch_set = NORMALIZE_PUBLISHED_SURFACE_UPDATES(previous_frame, surface_updates, shell_overrides)`
    5. assign `semantic_motion` from semantic transition type, delta priority, and delivery class
    6. increment `experience_sequence` and publish one idempotent `ExperienceDelta`
    7. persist the new materialized frame or frame-diff index needed for reconnect-safe catch-up

  * publish idempotent `ExperienceDelta` patches rather than full-screen replacements;

  * keep one mounted `CALM_SHELL` keyed by `manifest_id`; page reload, route reset, blocking full-screen loader, or destructive surface remount SHALL NOT be required for phase progression, authority waiting, reconciliation, approval, late-data propagation, projection readiness, or drift surfacing;

  * responsive, split-view, and embedded clients SHALL preserve that same mounted shell identity and semantic surface order; `DETAIL_DRAWER` MAY redock, but resize, orientation change, keyboard raise, or container collapse SHALL NOT fork the user into an alternate route family, modal takeover, or full-screen replacement;

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
* `LOW_NOISE_COGNITIVE_BUDGET(...)` SHALL freeze the production shell budget at four persistent surfaces, one primary issue, one primary action, three visible reasons, two secondary actions, one visible warning, five detail entry points, one expanded detail module, `visibility_budget_units = 12`, `prominent_motion_limit = 1`, `issue_dominance_min_margin = 12`, `action_dominance_min_margin = 15`, `primary_rank_hysteresis = 8`, `non_material_rank_swap_limit = 1`, `non_material_continuity_cost_limit = 6`, `refresh_coalescing_window_ms = 1500`, and `refresh_burst_visible_change_limit = 2` unless explicit compare or audit mode is active.
* `LOW_NOISE_COPY_BUDGET(...)` SHALL freeze the production shell microcopy budget at `manifest_label <= 64`, other context labels `<= 48`, summary headline `<= 96`, visible reason labels `<= 120`, `plain_explanation <= 240`, action labels `<= 40`, blocking or uncertainty copy `<= 160`, and detail-entry labels / reasons `<= 48 / 120` visible characters respectively.
* `DERIVE_ATTENTION_POLICY(...)` SHALL rank user-visible concerns by the frozen `issue_score(...)` formula and deterministic tie-break order rather than by renderer-local folklore. It SHALL output one `primary_object_ref`, one `actionability_state`, one `primary_action_code` or explicit `NO_SAFE_ACTION`, `no_safe_action_reason_code` when no safe move exists, collapsed `secondary_notice_count`, ordered `detail_entry_points[]`, ordered `ranking_basis[]`, `suggested_detail_surface_code`, `default_detail_module_code`, `primary_rank_score`, `runner_up_rank_score`, and `dominance_margin`; it SHALL NOT present parallel competing primaries in the default shell.
* `FILTER_VISIBLE_ACTIONS(...)` SHALL remove non-legal, unavailable, and non-material controls before shell composition. It SHALL return at most one primary action and at most two secondary actions; when the current posture is waiting or `NO_SAFE_ACTION`, it SHALL emit explanatory text and an investigation entry point instead of disabled controls. It SHALL also intersect candidate actions with the current legal-progression rank derived from the trust posture, decisive gate chain, and terminal bundle: when `decision_status != COMPLETED`, `waiting_on != NONE`, or the decisive rank is below submit-capable progression, the primary action SHALL be non-mutating investigation, refresh, reconcile, or ownership-handoff only. Filing, submit, amendment-submit, approval, or override-grant actions SHALL remain absent from `next_action_codes[]` and MAY appear only in `blocked_action_codes[]`. The decisive gate rank and override-governed posture SHALL be read from persisted `GateDecisionRecord.gate_semantics_contract{ progression_rank, override_dependency_state }`, not recomputed from the raw gate decision enum. Any mutation-capable primary SHALL additionally satisfy the frozen `action_score(...)` minimum and dominance-margin gate before it may occupy the primary slot.
* `NORMALIZE_LIMITATION_STATE(...)` SHALL classify visible absence as `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, `NOT_APPLICABLE`, or `NONE` so detail modules never blur policy limits, latency, and irrelevance. It SHALL also emit machine reason codes distinguishing at minimum masking, retention, permission, partial-evidence-loss, and projection minimisation; `LIMITED` without at least one such reason code is invalid.
* `BUILD_CONTEXT_BAR_STATE(...)` SHALL compress pulse, lineage, handoff, freshness, truth-origin posture, and the default mode or non-live disclaimer into one persistent strip that remains stable across live updates; it SHALL prefer terse semantic labels over decorative topology in the default profile, SHALL NOT duplicate the same posture warning across multiple persistent surfaces, and SHALL keep context labels within the frozen low-noise copy budget.
* `BUILD_DECISION_SUMMARY_STATE(...)` SHALL answer in visible order: what the system believes, why that posture exists, and what limit or uncertainty still applies. It SHALL emit `headline`, `reason_items[]`, `additional_reason_count`, and a normalized limitation or uncertainty statement; it SHALL show at most one primary issue, at most three supporting reasons before expansion, and a plain-language explanation whenever a legal or authority distinction would otherwise be ambiguous. When masking, expiry, pseudonymisation, or erasure lowers visible explanation confidence below retained decision confidence, the summary SHALL disclose that distinction explicitly instead of reusing the higher internal confidence as user-facing certainty. `headline`, reason labels, uncertainty text, and `plain_explanation` SHALL be trimmed to the frozen low-noise copy budget before publication.
* `BUILD_ACTION_STRIP_STATE(...)` SHALL expose one dominant safe next action, plus subordinate secondary actions only when they do not compete with the dominant action. Secondary actions SHALL be capped by the frozen cognitive budget and omitted entirely when they are not legal or not materially helpful. Primary and secondary action labels, ownership copy, waiting copy, and blocking reasons SHALL be trimmed to the frozen low-noise copy budget. When no safe next action exists, it SHALL render explicit `NO_SAFE_ACTION`, populate `actionability_state = NO_SAFE_ACTION`, preserve `no_safe_action_reason_code`, and point to the least-destructive investigation entry point through `suggested_detail_surface_code`. When a related detail module is already mounted, the strip SHALL preserve `focus_anchor_ref` and `active_detail_surface_code` whenever the focused object still exists. It SHALL also serialize frozen action-dominance metrics so reconnect-safe clients never infer action salience locally.
* `BUILD_SHELL_DOMINANCE_CONTRACT(...)` SHALL bind the published dominant question surface, dominant action surface, dominant action state, subordinate support-surface posture, queue-subordination policy, explicit compare/audit mode, responsive collapse policy, and detached-support policy for calm shell, collaboration, portal, governance, and native scene projections.
* `BUILD_DETAIL_DRAWER_STATE(...)` SHALL keep expert modules collapsed by default, expose only the modules relevant to the current posture, and allow at most one expanded module in the default profile unless the user has explicitly entered compare or audit mode. In `experience_profile="LOW_NOISE"`, it SHALL project `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` as on-demand modules rather than peer top-level regions; it SHALL distinguish `NOT_REQUESTED`, `NOT_YET_MATERIALIZED`, `LIMITED`, and `NOT_APPLICABLE`, cap visible entry points at five on default load, trim entry labels and reasons to the frozen low-noise copy budget, inherit the same issue-ordering and hysteresis policy used by `DERIVE_ATTENTION_POLICY(...)`, and preserve `focus_anchor_ref` whenever the anchored object still exists. It SHALL also freeze the user-facing module labels `Evidence Prism`, `Packet Forge`, `Authority Handshake Tunnel`, `Drift Ripple Field`, `Audit Echo Panel`, and `Twin Lens`, publish one plain-language interpretation summary for every mounted entry, limit explicit compare mode to `DRIFT_FIELD` or `TWIN_PANEL`, and limit explicit audit mode to `FOCUS_LENS` as the machine binding for `Audit Echo Panel`.
* when `SubmissionRecord.lifecycle_state` changes, user-visible authority semantics SHALL map at minimum as:

  * `TRANSMIT_PENDING` = queued or persisted intent exists, but outbound proof has not yet been observed;
  * `TRANSMITTED` = outbound dispatch observed, but no authority confirmation is implied;
  * `PENDING_ACK` = authority accepted the request or dispatch is known, but legal confirmation remains outstanding;
  * `CONFIRMED` = authority-backed legal confirmation;
  * `REJECTED` = authority-backed rejection;
  * `UNKNOWN` = the authority state remains unresolved after the defined reconciliation path; and
  * `OUT_OF_BAND` = external legal state was detected but was not created by the active packet flow.
* `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL output a derived frame for:

  * shell-level `experience_profile`, `attention_state`, `primary_object_ref`, `actionability_state`, `primary_action_code`, `no_safe_action_reason_code`, `detail_entry_points[]`, `suggested_detail_surface_code`, `active_detail_surface_code`, and `focus_anchor_ref`; and

  * `CONTEXT_BAR`
  * `DECISION_SUMMARY`
  * `ACTION_STRIP`
  * `DETAIL_DRAWER`

  investigation-mode source surfaces such as `PULSE_SPINE`, `MANIFEST_RIBBON`, `HANDOFF_BATON`, `DECISION_STAGE`, `CONSEQUENCE_RAIL`, `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL` MAY still be materialized as internal inputs or explicit compare/audit payloads, but they SHALL NOT be emitted as additional peer top-level surfaces in the default `LOW_NOISE` frame.
* callers of `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL pass `shell_surface_order[]` separately from any
  `source_surface_order[]`; source-surface ordering MAY guide composition inputs, but it SHALL NOT
  widen the peer top-level shell beyond the four low-noise surfaces.
* `BUILD_LIVE_EXPERIENCE_FRAME(...)` SHALL also materialize frame-level `attention_policy{{...}}`, `cognitive_budget{{...}}`, and, when available, `focus_anchor_ref` plus `shell_stability_token` so reconnect-safe restoration does not depend on client-side hierarchy reconstruction.
* in `experience_profile="LOW_NOISE"`, the composite shell surfaces SHALL be derived from the richer semantic surfaces as follows: `CONTEXT_BAR` from `PULSE_SPINE`, `MANIFEST_RIBBON`, and `HANDOFF_BATON`; `DECISION_SUMMARY` from `DECISION_STAGE` plus gate and trust rollups; `ACTION_STRIP` from `CONSEQUENCE_RAIL` plus workflow implications; and `DETAIL_DRAWER` from `EVIDENCE_TIDE`, `PACKET_FORGE`, `AUTHORITY_TUNNEL`, `DRIFT_FIELD`, `FOCUS_LENS`, and `TWIN_PANEL`.
* if a sidecar projection such as `BUILD_TWIN_VIEW(...)` or `BUILD_FOCUS_LENS_INDEX(...)` completes
  after an earlier low-noise frame was already published, the engine SHALL trigger a composite-frame
  refresh so `DETAIL_DRAWER`, `focus_anchor_ref`, actionability, and other shell-level fields stay in
  sync; publishing only the source-module delta is insufficient for the default shell.
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

## Nightly portfolio autopilot control plane

* `RUN_NIGHTLY_AUTOPILOT(tenant_id, nightly_window_key, trigger_class)` SHALL allocate or recover
  one `NightlyBatchRun` under `SCHEDULER_SERVICE`, freeze the release/policy envelope for the tenant
  window, and fail closed before selection if that envelope cannot be proven.
  When `trigger_class = RECOVERY_RECLAIM_WINDOW`, the successor SHALL additionally freeze
  `reclaimed_predecessor_batch_run_ref` on itself and persist `successor_batch_run_ref` on the
  abandoned predecessor before any resumed selection or dispatch work begins.
* `RUN_NIGHTLY_AUTOPILOT(...)` SHALL call `SELECT_NIGHTLY_PORTFOLIO(...)` to produce a complete
  ordered set of candidate dispositions
  `{EXECUTE_NEW_MANIFEST, EXECUTE_CONTINUATION_CHILD, REUSE_EXISTING_TERMINAL_RESULT, DEFER_ACTIVE_ATTEMPT, DEFER_RETRY_WINDOW, ESCALATE_ONLY, SKIP_INELIGIBLE}`
  together with frozen `priority_score`, explainable priority-tuple projections, fairness-group
  keys, batch backlog pressure, and reason codes.
  Reuse entries SHALL retain the reused prior-manifest lineage without allocating a new manifest,
  continuation entries SHALL retain the prior-manifest lineage that forced continuation, deferred
  entries SHALL retain the next checkpoint that blocks execution, and escalation entries SHALL
  retain the published workflow refs used for operator handoff.
* only `selection_disposition in {EXECUTE_NEW_MANIFEST, EXECUTE_CONTINUATION_CHILD}` MAY allocate a
  new `run_kind = NIGHTLY` manifest; every such manifest SHALL receive
  `launch_context{nightly_batch_run_ref, nightly_window_key}` and SHALL therefore bind same-window
  duplicate suppression into ordinary manifest identity rather than into scheduler memory alone.
* the scheduler SHALL evaluate reuse of a valid terminal `DecisionBundle` before allocating a new
  nightly manifest; a later nightly window SHALL NOT collapse into an older manifest merely because
  frozen config and inputs are unchanged when new execution is otherwise required.
* `PLAN_NIGHTLY_SHARDS(...)` SHALL derive a stable shard plan plus concurrency ceilings for
  manifests, authority transmit, and per-client serialization from the frozen selection set; the
  same selection set and concurrency profile SHALL produce the same shard plan.
  Within each shard, admitted work SHALL be consumed through deterministic fairness groups plus
  deficit scheduling rather than naive global FIFO or pure score order.
* `EXECUTE_NIGHTLY_CLIENT_ATTEMPT(...)` SHALL re-read durable truth for the candidate immediately
  before execution, SHALL refuse to run when a fresh active manifest lease already exists for the
  same client-period scope, and SHALL use ordinary continuation/recovery semantics for late-data,
  drift, amendment, or stale-run recovery rather than mutating prior truth in place.
* nightly automation SHALL treat `TrustSummary.automation_level = ALLOWED` as necessary but not
  sufficient; unattended progression SHALL additionally require that the frozen nightly policy
  matrix allows the target stage family and that no current step-up, approval, override,
  authority-ambiguity, or human-review boundary remains unresolved.
* the autopilot SHALL NOT autonomously satisfy `REQUIRE_STEP_UP`, `REQUIRE_APPROVAL`, override
  approval, exceptional authority, or ambiguous external truth. Those outcomes SHALL become
  deterministic queue-visible handoff or escalation artifacts, not best-effort continuation.
* every autonomous retry inside a nightly batch SHALL obey the ordinary `ErrorRecord.retry_class`,
  `retry_budget_class`, `next_retry_at`, positive-expected-gain gate, and
  idempotency-precondition rules; no crash recovery, queue rebuild, or stale-shard reclaim MAY
  blindly resend a live external mutation before persisted-attempt recovery is performed.
* a nightly batch SHALL be allowed to reach quiescence with partial client failure.
  `NightlyBatchRun.lifecycle_state = COMPLETED_WITH_FAILURES` SHALL mean that every selected entry
  reached a terminal or handoff-safe state and that the operator digest can be published without
  guessing about any remaining autonomous action.
  `selected_count` SHALL therefore equal persisted `selection_entries[]`, `execution_count` SHALL
  count only entries that actually invoked `RUN_ENGINE(...)`, `escalated_count` SHALL cover
  `{REVIEW_REQUIRED, REQUEST_CLIENT_INFO, BLOCKED_INTERNAL}`, and `failed_count` SHALL cover
  `{FAILED_RETRYABLE, FAILED_NON_RETRYABLE}` rather than queue-derived approximations.
  Same-window autonomous execution SHALL additionally obey a finite progress potential so legal
  retries and reconciliation loops cannot livelock the batch.
* once quiescent, the autopilot SHALL publish operator-facing next actions through ordinary workflow
  and notification artifacts and SHALL emit one `OperatorMorningDigest` derived only from persisted
  batch, manifest, decision, workflow, authority, late-data, drift, and error truth.
  `queue_summaries[].item_refs[]` and highlighted digest `work_item_ref`s SHALL always point back
  to persisted `published_workflow_item_refs[]` rather than to transient queue reads or logs.
* for the complete scheduler, selection, recovery, digest, and queue-publication rules, see
  `nightly_autopilot_contract.md`.

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
- Nightly scheduler, portfolio orchestration, and operator digest semantics: `nightly_autopilot_contract.md`
- Lifecycle and transition semantics: `state_machines.md`
- Exact gate ordering and decision tables: `exact_gate_logic_and_decision_tables.md`
- Compute, parity, graph-quality, and trust formulas: `compute_parity_and_trust_formulas.md`
- Authority request/reconciliation semantics: `authority_interaction_protocol.md`
- Drift baselines and amendment semantics: `amendment_and_drift_semantics.md`
- Filing-proof closure, proof bundles, and replay-safe explanation semantics: `defensible_filing_graph_contract.md`
- Provenance graph node/edge/path semantics: `provenance_graph_semantics.md`
- Retention, error, and observability semantics: `retention_error_and_observability_contract.md`
- Error family, remediation, and compensation semantics: `error_model_and_remediation_model.md`
- Observability signal and audit-event semantics: `observability_and_audit_contract.md`
- Worked embodiments and implementation examples: `embodiments_and_examples.md`
