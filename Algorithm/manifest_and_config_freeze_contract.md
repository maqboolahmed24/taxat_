# Manifest and Config Freeze Contract

## Manifest and config freeze contract

The engine SHALL treat the `RunManifest` as the single reproducibility envelope for an execution. No
artifact used for compliance, trust synthesis, filing readiness, submission, amendment analysis,
replay, or audit explanation may exist outside exactly one manifest context.

The purpose of the manifest and config freeze contract is to guarantee that a run can later answer all
of the following questions without ambiguity:

1. What scope was being evaluated?
2. Under exactly which rules, thresholds, policies, and provider versions was it evaluated?
3. What code build and schema set produced the result?
4. What evidence set and input boundary were frozen for the run?
5. Was the run a compliance run, analysis run, replay, remediation branch, or amendment branch?
6. Can the result be reproduced, challenged, superseded, or replayed deterministically?

## 5.1 Core principle

A `RunManifest` is not a generic log row. It is the frozen execution contract for the run.

A run becomes compliance-grade only when all of the following are frozen:

- identity and scope
- mode and run kind
- code build
- schema bundle
- config set
- source/input boundary
- override set
- environment and provider-version context
- deterministic seed material

Post-seal gate results, output refs, submission refs, drift refs, and the persisted `DecisionBundle`
hash are append-only outcome projections. They must remain reproducible and auditable, but they are
not part of the frozen execution envelope itself. The authoritative append-only carrier for that
material SHALL be `append_only_outcome_projection{...}`; the legacy top-level outcome fields on
`RunManifest` remain read-side mirrors only.

No downstream module may resolve fresh configuration ad hoc once the manifest is frozen.

## 5.2 Required contract objects

The manifest contract SHALL consist of seven linked structures.

### A. `RunEnvelope`

Defines who, what, where, and why the run exists.

### B. `ConfigFreeze`

Defines the exact config set resolved for the run, the typed config-lineage basis that produced it,
and the frozen-config-only consumption contract.

### C. `InputFreeze`

Defines the source/input boundary frozen for the run.

### D. `HashSet`

Defines reproducibility hashes and identity hashes.

### E. `ContinuationSet`

Defines parent/child, replay, remediation, amendment, and supersession lineage.

### F. `FrozenExecutionBinding`

Defines the sealed worker-facing ref and hash envelope that downstream jobs must consume instead of
re-resolving live config, input, or lineage state after freeze.

### G. `AppendOnlyOutcomeProjection`

Defines the append-only gate tape, historical post-seal basis, and terminal outcome refs that may
grow after seal without rewriting the frozen execution envelope.

## 5.3 `RunManifest` required field groups

The current schema in this pack is a good skeleton, but it needs these full field groups.
Authoritative freeze fields SHALL live inside `config_freeze{...}` and `input_freeze{...}`; top-level duplicates
of nested authoritative fields SHOULD be avoided to prevent silent divergence. Where duplicate lineage
projection fields remain for fast reads, they SHALL be byte-identical mirrors of `continuation_set{...}`
and load/update paths SHALL reject divergence rather than silently normalizing one copy.

### A. Identity and lineage

- `manifest_id`
- `root_manifest_id`
- `parent_manifest_id`
- `continuation_of_manifest_id`
- `replay_of_manifest_id`
- `supersedes_manifest_id`
- `manifest_generation`
- `continuation_basis`
- `continuation_set.config_inheritance_mode`
- `continuation_set.input_inheritance_mode`
- `manifest_schema_version`
- `continuation_basis = NEW_MANIFEST` SHALL mean `root_manifest_id = manifest_id`,
  `manifest_generation = 0`, and null `parent_manifest_id`, `continuation_of_manifest_id`,
  `replay_of_manifest_id`, and `supersedes_manifest_id`
- every child manifest SHALL carry non-null `root_manifest_id`, non-null `parent_manifest_id`,
  `manifest_generation >= 1`, and a non-null `continuation_set.parent_manifest_hash_at_branch`
  that freezes the parent's sealed `hash_set.manifest_hash`
- `continuation_basis = REPLAY_CHILD` SHALL set `parent_manifest_id = replay_of_manifest_id`

### B. Scope

- `tenant_id`
- `client_id`
- `business_partitions[]`
- `income_source_partitions[]`
- `period`
- `requested_scope[]`
- exactly one reporting-scope token (for example `year_end`, `quarterly_update`, or `estimate_only`)
- zero or more action tokens (for example `prepare_submission`, `submit`, `amendment_intent`, `amendment_submit`)
- `prepare_submission` and `submit` MAY coexist in the same manifest
- `estimate_only` SHALL NOT coexist with `prepare_submission`, `submit`, `amendment_intent`, or `amendment_submit`
- `amendment_intent` SHALL NOT coexist with `prepare_submission` or `submit`
- `amendment_submit` SHALL NOT coexist with `prepare_submission` or `submit`
- `amendment_intent` and `amendment_submit` SHALL not coexist in the same manifest; amendment submission must use a manifest whose lineage already reached `READY_TO_AMEND`
- the array SHALL be canonicalized in stable order before hashing, equality checks, or replay/continuation comparisons
- `requested_scope[]` is the raw caller-requested scope retained for audit and caller-intent replay checks.
- authoritative `scope_execution_binding{...}` SHALL freeze the raw-versus-executable scope mapping once and SHALL remain the only worker-facing scope interpretation contract after authorization
- `scope_execution_binding.requested_scope[] = requested_scope[]`
- `scope_execution_binding.executable_scope[] = access_decision.effective_scope[]` when present, else `requested_scope[]`
- `scope_execution_binding.requested_scope_family` and `scope_execution_binding.executable_scope_family` SHALL make the action-family interpretation explicit rather than forcing downstream modules to reconstruct it from token mixes
- `scope_execution_binding.reduction_posture` SHALL be `UNCHANGED` or `REDUCED_BY_AUTHORIZATION`; mutation-capable requested scope SHALL additionally freeze `mutation_atomicity = ATOMIC_REQUIRED` so live-capable writes cannot be silently narrowed into a different executable meaning
- define `access_binding_hash = hash(access_decision.decision | execution_mode | ordered(executable_scope[]) | ordered(executable_partition_scope_refs[]) | ordered(masking_rules[]) | ordered(required_approvals[]) | required_authn_level | policy/delegation/authority binding lineage)`
- persist `access_binding_hash` on the manifest as a first-class frozen identity field; it SHALL NOT
  be recomputed opportunistically from a later projection
- `access_binding_hash` SHALL participate in same-request identity checks, sealed-manifest reuse checks, manifest-level idempotency derivation, and authority-request idempotency derivation.
- Two requests with the same raw `requested_scope[]` but different executable scope or masking policy SHALL NOT share the same execution identity.
- `mode in {COMPLIANCE, ANALYSIS}`
- `mode = ANALYSIS` SHALL NOT coexist with `prepare_submission`, `submit`, `amendment_intent`, or `amendment_submit`; analysis runs may model outcomes, but they SHALL NOT allocate filing or amendment workflow intent
- `run_kind in {INTERACTIVE, NIGHTLY, BACKFILL, REPLAY, REMEDIATION, AMENDMENT, MIGRATION}`
- `nightly_batch_run_ref` SHALL be present when `run_kind = NIGHTLY` and null otherwise
- `nightly_window_key` SHALL be present when `run_kind = NIGHTLY` and null otherwise
- `nightly_window_key` is a frozen identity field used to distinguish same-window duplicate
  suppression from later-window continuation; it SHALL participate in manifest-level idempotency
  and SHALL NOT be inferred from scheduler timing after the fact
- `authority_context_ref`

### C. Actor and authority

- `principal_context_ref`
- `delegation_basis`
- `authority_link_refs[]`
- `approval_refs[]`
- `override_refs[]`

### D. Environment and build

- `environment_ref in {DEV, TEST, UAT, SANDBOX, PRODUCTION}`
- `provider_environment_refs[]`
- `code_build_id`
- `code_commit_sha`
- `container_image_digest`
- `schema_bundle_hash`
- `feature_flag_snapshot_hash`

### E. Config freeze

- authoritative `config_freeze{...}` object, including:
- `config_freeze_id`
- `manifest_id`
- `artifact_type = ConfigFreeze`
- `entries[]`
- `config_freeze_hash`
- `schema_bundle_hash`
- `feature_flag_snapshot_hash`
- `config_surface_hash`
- `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`
- `config_resolution_basis ∈ {DIRECT_REQUEST_RESOLUTION, REPLAY_EXACT_REUSE, RECOVERY_EXACT_REUSE, HISTORICAL_EXPLICIT_REUSE}`
- `source_config_freeze_ref`
- `source_config_freeze_hash`
- `source_config_surface_hash`
- `config_consumption_mode = FROZEN_CONFIG_ONLY`
- `approval_snapshot_ref`
- `materiality_profile_ref`
- `retention_profile_ref`
- `provider_contract_profile_ref`

### F. Input freeze

- `input_freeze_id`
- `manifest_id`
- `artifact_type = InputFreeze`
- `source_plan_ref`
- `collection_boundary_ref`
- `input_policy_ref`
- `source_window_ref`
- `read_cutoff_at`
- `provider_environment_refs[]`
- `provider_api_versions[]`
- `provider_schema_versions[]`
- `connector_profile_ref`
- `connector_build_id`
- `cursor_checkpoint_refs[]`
- `request_audit_refs[]`
- `late_data_policy_bindings[]`
- `source_record_refs[]`
- `evidence_item_refs[]`
- `candidate_fact_refs[]`
- `canonical_fact_refs[]`
- `conflict_refs[]`
- `missing_source_declarations[]`
- `stale_source_declarations[]`
- `normalization_context_ref`
- `normalization_context_hash`
- `artifact_contract_refs[]`
- `artifact_contract_hash`
- `input_set_hash`

### G. Determinism controls

- `deterministic_seed`
- `idempotency_key`
- `replay_class`
- `non_deterministic_module_allowlist[]`

Every manifest-producing branch SHALL also persist `manifest_branch_decision{...}`. That object is
the immutable request-time branch proof: it freezes `branch_action`, exact request identity
(`idempotency_key`, `requested_scope[]`, `access_binding_hash`, `run_kind`, `replay_class_or_null`,
`nightly_window_key_or_null`), prior-manifest reuse evidence, the selected manifest's persisted
continuation basis and lineage mirrors, and any config/input inheritance modes that justified child
allocation.

### H. Frozen execution binding

- authoritative `frozen_execution_binding{...}` object, including:
- `manifest_id`
- `manifest_hash`
- `execution_basis_hash`
- `continuation_basis`
- `root_manifest_id`
- `parent_manifest_id`
- `continuation_of_manifest_id`
- `replay_of_manifest_id`
- `supersedes_manifest_id`
- `manifest_generation`
- `parent_manifest_hash_at_branch`
- `config_inheritance_mode`
- `input_inheritance_mode`
- `config_freeze_ref`
- `config_freeze_hash`
- `config_surface_hash`
- `config_resolution_basis`
- `inherited_config_freeze_ref`
- `fresh_resolution_reason_code`
- `input_freeze_ref`
- `input_set_hash`
- `source_plan_ref`
- `source_window_ref`
- `collection_boundary_ref`
- `normalization_context_ref`
- `inherited_input_freeze_ref`
- `fresh_collection_reason_code`
- ordered `requested_scope[]`
- ordered `executable_scope[]`
- `scope_execution_binding{ binding_scope_class = FROZEN_EXECUTION_BINDING, execution_mode_or_null, requested_scope_family, executable_scope_family, requested_scope[], executable_scope[], executable_partition_scope_refs[], access_decision, reduction_posture, mutation_atomicity, masking_rules[], required_approvals[], required_authn_level, access_binding_hash, reason_codes[] }`
- `access_binding_hash`
- `environment_ref`
- ordered `provider_environment_refs[]`
- `code_build_id`
- `schema_bundle_hash`
- `feature_flag_snapshot_hash`
- `deterministic_seed`
- `authority_context_ref`
- `config_consumption_mode = FROZEN_CONFIG_ONLY`
- `worker_consumption_mode = MANIFEST_BOUND_ONLY`

This object is the authoritative post-freeze worker contract. Queue handlers, retries, recovery
workers, and transmit workers SHALL consume these manifest-bound identities and SHALL NOT re-resolve
fresh config, fresh input, or replacement lineage from ambient state. `config_resolution_basis`
and `config_consumption_mode = FROZEN_CONFIG_ONLY` SHALL remain explicit in this worker envelope so a
consumer can prove whether it is executing against a fresh manifest-local resolution or an exact
inherited frozen basis. `frozen_execution_binding{...}` SHALL therefore remain a complete,
byte-identical worker-facing lineage mirror of the authoritative manifest branch and freeze state:
workers and recovery code SHALL NOT recover missing `continuation_set{...}` meaning from adjacent
manifests, `ConfigFreeze`, or `InputFreeze` rows when the frozen binding itself is available.

### I. Lifecycle

- `lifecycle_state`
- `created_at`
- `frozen_at`
- `opened_at`
- `sealed_at`
- `completed_at`
- `superseded_at`
- `retired_at`

### J. Append-only outcomes

- frozen `preseal_gate_evaluation{ contract_class, execution_basis_hash, required_gate_codes[],
  evaluated_gate_codes[], ordered_gate_decision_ids[], completion_state, durability_boundary,
  reuse_policy, post_seal_interpretation_policy }`
- `access_decision{}`
- authoritative `append_only_outcome_projection{...}` object, including:
- `projection_generation`
- `projection_hash`
- `post_seal_basis{ basis_state, post_seal_basis_hash, authority_context_ref/hash, late_data_monitor_result_ref/hash, authority_calculation_result_refs[]/hashes[], drift_record_refs[]/hashes[] }`
- `gating_decisions[]`
- `output_refs{ alias -> output_link_entry{ linkage_role_code, artifact_type, artifact_ref, artifact_hash_or_null, produced_by_manifest_id, dependency_identity_refs[] } }`
- `audit_refs[]`
- `decision_bundle_hash`
- `submission_refs[]`
- `drift_refs[]`
- `deterministic_outcome_hash`
- `replay_attestation_ref`
- top-level `gating_decisions[]`, `output_refs{...}`, `audit_refs[]`, `submission_refs[]`, `drift_refs[]`,
  `decision_bundle_hash`, `deterministic_outcome_hash`, and `replay_attestation_ref` SHALL remain
  exact read-model mirrors of `append_only_outcome_projection{...}` and SHALL NOT become a second
  mutable source of truth

`decision_bundle_hash` SHALL reference the persisted `DecisionBundle` returned for the manifest's
current terminal or review outcome. `deterministic_outcome_hash` SHALL capture the normalized
outcome basis used for exact replay comparison. `replay_attestation_ref` SHALL point to the
persisted replay-comparison artifact for replay children once comparison has completed. A replay
child SHALL NOT publish exact, expected, limited, or corrupt replay posture through any
manifest-linked projection until `replay_attestation_ref` points at that durable attestation.
The referenced bundle and attestation SHALL also keep their graph/proof/twin/component linkage
coherent enough for deterministic reload: proof refs SHALL not survive without graph identity, twin
refs SHALL not survive without graph-plus-parity identity, and observable replay rows SHALL not
drop the compared artifact ref. `output_refs{...}` SHALL preserve that linkage explicitly rather
than collapsing back to alias-to-ref strings: proof, twin, and replay entries SHALL keep their own
artifact hash plus the dependency identities needed to reload the compared bundle/graph/parity
spine without reconstructing it from neighboring rows.

`preseal_gate_evaluation{...}` is not part of the append-only outcome packet. It belongs to the
frozen pre-seal envelope and SHALL remain immutable once published, even when later gates append to
`gating_decisions[]` after seal.

For persisted manifests in `ALLOCATED`, `config_freeze`, `input_freeze`, and `hash_set` MAY be absent.
They SHALL become mandatory no later than `FROZEN`, and SHALL be immutable from `SEALED` onward.

## 5.4 `ConfigFreeze` contract

`ConfigFreeze` SHALL be a first-class structure rather than an untyped blob inside `config_refs`.

Each config entry SHALL include:

- `config_type`
- `version_id`
- `content_hash`
- `status_at_freeze`
- `effective_scope`
- `effective_from`
- `effective_to`
- `ccr_id`
- `test_suite_refs[]`
- `provider_api_version`
- `provider_schema_version`
- `environment_allowlist[]`
- `compatibility_class`
- `superseded_by_version_id` if known

Provider-aware freeze invariant:

- if either `provider_api_version` or `provider_schema_version` is present, both SHALL be present
- provider-specific config entries SHALL carry a non-empty `environment_allowlist[]`

Config-surface freeze invariant:

- `ConfigFreeze.schema_bundle_hash` SHALL be a byte-identical mirror of the manifest-level
  `schema_bundle_hash`
- `ConfigFreeze.feature_flag_snapshot_hash` SHALL be a byte-identical mirror of the manifest-level
  `feature_flag_snapshot_hash`, using explicit `null` only when no governed feature-flag surface was
  in effect
- `config_surface_hash = hash(config_freeze_hash | approval_snapshot_ref | materiality_profile_ref |
  amendment_materiality_profile_ref | retention_profile_ref | provider_contract_profile_ref |
  workflow_policy_ref | override_policy_ref | masking_export_policy_ref |
  canonicalization_rules_ref | connector_mapping_rules_ref | parity_threshold_profile_ref |
  trust_threshold_profile_ref | risk_threshold_profile_ref | evidence_confidence_policy_ref |
  computation_rules_ref | schema_bundle_hash | feature_flag_snapshot_hash)`
- `config_surface_hash` SHALL be the reproducibility hash for the whole frozen config surface rather
  than for `entries[]` alone

`ConfigFreeze` SHALL also carry first-class completeness refs for the frozen policy surface:

- `approval_snapshot_ref`
- `materiality_profile_ref`
- `amendment_materiality_profile_ref`
- `retention_profile_ref`
- `provider_contract_profile_ref`
- `workflow_policy_ref`
- `override_policy_ref`
- `masking_export_policy_ref`
- `canonicalization_rules_ref`
- `connector_mapping_rules_ref`
- `parity_threshold_profile_ref`
- `trust_threshold_profile_ref`
- `risk_threshold_profile_ref`
- `evidence_confidence_policy_ref`
- `computation_rules_ref`
- `required_config_types_present[]`
- `config_completeness_state = COMPLETE_REQUIRED_CONFIG_SET`
- `config_resolution_basis`
- `source_config_freeze_ref`
- `source_config_freeze_hash`
- `source_config_surface_hash`
- `config_consumption_mode = FROZEN_CONFIG_ONLY`

Config-lineage invariant:

- `config_resolution_basis = DIRECT_REQUEST_RESOLUTION` SHALL mean the config set was freshly
  resolved for the current manifest and all `source_config_*` lineage fields SHALL be `null`
- `config_resolution_basis ∈ {REPLAY_EXACT_REUSE, RECOVERY_EXACT_REUSE, HISTORICAL_EXPLICIT_REUSE}`
  SHALL mean the current manifest is bound to a previously frozen config surface, all
  `source_config_*` lineage fields SHALL be non-null, and
  `config_freeze_hash = source_config_freeze_hash` plus
  `config_surface_hash = source_config_surface_hash`
- `config_consumption_mode = FROZEN_CONFIG_ONLY` SHALL prohibit downstream config lookup from live
  policy/config services once the manifest is frozen

### Minimum config types to freeze

At minimum the engine SHALL freeze:

- `COMPUTATION_RULES`
- `PARITY_THRESHOLDS`
- `TRUST_THRESHOLDS`
- `RISK_THRESHOLDS`
- `WORKFLOW_POLICY`
- `OVERRIDE_POLICY`
- `RETENTION_POLICY`
- `EVIDENCE_CONFIDENCE_POLICY`
- `CANONICALIZATION_RULES`
- `CONNECTOR_MAPPING_RULES`
- `PROVIDER_CONTRACT_PROFILE`
- `MATERIALITY_PROFILE`
- `AMENDMENT_MATERIALITY_PROFILE`
- `MASKING_EXPORT_POLICY`

`entries[]` SHALL include exactly one entry for each mandatory config type listed below.
`required_config_types_present[]` SHALL equal the de-duplicated ordered set of mandatory
`config_type` values actually present in `entries[]`, in the same canonical order as listed below.

## 5.5 Freeze timing rules

The engine SHALL apply the following timing rules.

### Rule A - Freeze-before-decision rule

`ConfigFreeze` SHALL be resolved before any compliance artifact is persisted.
`ConfigFreeze.config_completeness_state` SHALL already be
`COMPLETE_REQUIRED_CONFIG_SET` at that boundary.

### Rule B - Freeze-before-compute rule

No compute, parity, trust, or filing decision may proceed against floating configuration.

### Rule C - Freeze-before-submission rule

A filing packet may not be built or transmitted until the manifest is sealed with code build,
config freeze, and input freeze.

### Rule D - Freeze-before-replay rule

A replay run SHALL explicitly rebind to the original frozen config set unless the replay purpose is
"counterfactual analysis", in which case a child manifest SHALL be created.

## 5.6 Compliance-mode versus analysis-mode rules

The mode split in this pack is correct, but it needs exact rules.

### Compliance mode

A compliance-mode manifest SHALL freeze only config versions whose `status_at_freeze` is compliant for
the intended run posture.

The exact rule is:

- new compliance runs may use only `APPROVED`
- replay or audit re-execution may reference versions now marked `DEPRECATED` or `REVOKED`, but only
  when `run_kind = REPLAY`
- replay use of `DEPRECATED` or `REVOKED` frozen compliance config is allowed only for replay/audit
  progression and SHALL NOT be used to initiate a new filing-capable or amendment-capable live
  progression
- no new filing or amendment submission may be initiated from a manifest whose frozen config set
  contains a non-live compliance version

### Analysis mode

An analysis-mode manifest MAY freeze:

- `DRAFT`
- `CANDIDATE`
- `VERIFIED`
- `APPROVED`
- `DEPRECATED`

But every derived artifact SHALL carry:

- `analysis_only = true`
- `non_compliance_config_refs[]`
- `counterfactual_basis`
- analysis-mode manifests SHALL not prepare, approve, or transmit filing packets; any filing-capable action token on an analysis manifest must end in a modeled block rather than silent progression

This split matters because HMRC's MTD APIs and journeys continue to evolve over time, and HMRC
explicitly publishes roadmap changes and Sandbox-first rollout for new features. The engine therefore
needs environment-aware and version-aware freezing, not just "latest config at run time." [1]

## 5.7 Parent/child manifest semantics

The engine SHALL support these lineage relationships.

### Root manifest

The first manifest for an operational episode.

### Child manifest

Created when the engine branches from an existing run for one of these reasons:

- analysis branch
- remediation branch
- amendment branch
- replay branch
- drift reassessment branch
- portfolio/nightly branch derived from a prior frozen state

A nightly continuation or recovery child SHALL preserve the originating `nightly_window_key` unless
a formally recorded successor recovery batch intentionally supersedes the abandoned batch context.

### Replay manifest

A special child manifest with:

- identical frozen config refs and frozen input refs unless explicitly counterfactual
- identical deterministic seed
- `continuation_basis = REPLAY_CHILD`
- explicit `replay_of_manifest_id`
- no reopening or resealing of the completed parent manifest; replay execution occurs only in the child manifest

### Child-manifest config and input inheritance rule

Default config inheritance SHALL be:

- same-manifest pre-start reuse -> reuse the same frozen config set (`config_inheritance_mode = null` because no child manifest is created)
- replay child with `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` -> inherit the parent frozen config set exactly (`config_inheritance_mode = REPLAY_EXACT`)
- started-run recovery child -> inherit the parent frozen config set only for recovery of the same
  attempt lineage (`config_inheritance_mode = RECOVERY_EXACT`)
- amendment, remediation, drift-reassessment, analysis, and other continuation children -> resolve a
  fresh config set by default (`config_inheritance_mode = FRESH_CHILD_RESOLUTION`)

Default input inheritance SHALL be:

- same-manifest pre-start reuse -> reuse the same frozen input set (`input_inheritance_mode = null` because no child manifest is created)
- replay child with `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}` -> inherit the parent frozen input set exactly (`input_inheritance_mode = REPLAY_EXACT`)
- started-run recovery child -> inherit the parent frozen input set only for recovery of the same
  attempt lineage (`input_inheritance_mode = RECOVERY_EXACT`)
- amendment, remediation, drift-reassessment, analysis, and other continuation children -> collect a
  fresh input set by default (`input_inheritance_mode = FRESH_CHILD_COLLECTION`) unless the child
  explicitly declares historically frozen input reuse (`input_inheritance_mode = HISTORICAL_EXPLICIT`)

`continuation_basis` SHALL remain typed branch truth for the persisted manifest and SHALL use the
machine-stable lineage vocabulary `{NEW_MANIFEST, REPLAY_CHILD, RECOVERY_CHILD, CONTINUATION_CHILD,
NEW_REQUEST_CHILD}`.

`manifest_branch_decision.branch_action` SHALL remain a separate machine-stable vocabulary
`{NEW_MANIFEST, RETURN_EXISTING_BUNDLE, REUSE_SEALED_MANIFEST, REPLAY_CHILD, RECOVERY_CHILD,
CONTINUATION_CHILD, NEW_REQUEST_CHILD}`. `RunManifest` SHALL persist only the manifest-producing
branch actions, while idempotent bundle return and same-manifest sealed reuse SHALL be captured in
trace and audit evidence rather than mutating historical manifest lineage.

Historical frozen config reuse on a non-replay child is legal only when the child manifest explicitly
records `config_inheritance_mode = HISTORICAL_EXPLICIT`. Historical frozen input reuse on a
non-replay child is legal only when the child manifest explicitly records
`input_inheritance_mode = HISTORICAL_EXPLICIT`.

Every child manifest SHALL also persist:

- `continuation_set.parent_manifest_hash_at_branch`
- `continuation_set.inherited_config_freeze_ref`
- `continuation_set.fresh_resolution_reason_code`
- `continuation_set.inherited_input_freeze_ref`
- `continuation_set.fresh_collection_reason_code`

Rules:

- `parent_manifest_hash_at_branch` SHALL freeze the parent's sealed `manifest_hash` seen by the child
  at branch creation time
- `REPLAY_CHILD` SHALL bind `parent_manifest_id` and `replay_of_manifest_id` to the same source
  manifest because the replay parent is the replay source
- `inherited_config_freeze_ref` SHALL be present for `REPLAY_EXACT`, `RECOVERY_EXACT`, and
  `HISTORICAL_EXPLICIT` config reuse
- `fresh_resolution_reason_code` SHALL be present for `FRESH_CHILD_RESOLUTION`
- `inherited_input_freeze_ref` SHALL be present for `REPLAY_EXACT`, `RECOVERY_EXACT`, and
  `HISTORICAL_EXPLICIT` input reuse
- `fresh_collection_reason_code` SHALL be present for `FRESH_CHILD_COLLECTION`
- `inherited_config_freeze_ref` and `fresh_resolution_reason_code` SHALL be mutually exclusive
- `inherited_input_freeze_ref` and `fresh_collection_reason_code` SHALL be mutually exclusive

The authoritative `ConfigFreeze.config_resolution_basis` SHALL map exactly to
`continuation_set.config_inheritance_mode`:

- `null` on a root manifest -> `DIRECT_REQUEST_RESOLUTION`
- `FRESH_CHILD_RESOLUTION` -> `DIRECT_REQUEST_RESOLUTION`
- `REPLAY_EXACT` -> `REPLAY_EXACT_REUSE`
- `RECOVERY_EXACT` -> `RECOVERY_EXACT_REUSE`
- `HISTORICAL_EXPLICIT` -> `HISTORICAL_EXPLICIT_REUSE`

`continuation_set.inherited_config_freeze_ref` SHALL byte-match
`ConfigFreeze.source_config_freeze_ref` whenever config reuse is not fresh. This separation is
required even when a fresh child resolution would numerically produce the same config hashes.

A child manifest with `config_inheritance_mode = HISTORICAL_EXPLICIT` SHALL NOT initiate a new live
filing-capable or amendment-capable progression if any inherited compliance config entry is non-live
at child start. A child manifest with `input_inheritance_mode = HISTORICAL_EXPLICIT` SHALL declare
its historical input limitations explicitly and SHALL NOT pretend the inherited input set reflects
current external state.

Exact replay and exact recovery invariants:

- the child SHALL bind to the parent's frozen `ConfigFreeze`, `InputFreeze`, historical authority basis,
  and persisted late-data monitor basis as first-class inherited artifacts
- the child SHALL NOT recollect sources, re-read live authority state, re-scan post-cutoff late data,
  or silently substitute superseding policy/config/input artifacts
- if any inherited frozen artifact is missing, corrupt, schema-incompatible, or retention-limited
  beyond the contractually allowed replay posture, exact replay SHALL fail closed or downgrade to an
  explicitly limited comparison outcome rather than silently continuing with fresh inputs

### Single-writer start rule

The `SEALED --run_started--> IN_PROGRESS` transition SHALL be atomic and lease-protected. At most one
live writer may hold the start claim for a manifest at a time.

The authoritative write-side contract for that boundary is `manifest_start_claim{...}` as specified
in `manifest_start_claim_protocol.md`. Queue state, worker memory, and read-side mirrors SHALL NOT
substitute for that durable control record.

A manifest that remains `SEALED` SHALL still be a pre-start envelope:

- `opened_at = null`
- `output_refs = {}`
- `submission_refs[] = []`
- `drift_refs[] = []`
- `decision_bundle_hash = null`
- `deterministic_outcome_hash = null`
- `replay_attestation_ref = null`

A failed start claim SHALL prevent execution and SHALL NOT create a recovery child until the active
lease is released or expires under policy.

### Supersession manifest

A new manifest that replaces the prior operational decision basis without mutating the old one.

## 5.8 Input freeze contract

The input boundary must be frozen separately from config.

`InputFreeze` SHALL define:

- the frozen `SourcePlan` reference
- the frozen `SourcePlan` hash
- the frozen `SourceWindow` reference
- the frozen `SourceWindow` hash
- the frozen `CollectionBoundary` reference
- the frozen `CollectionBoundary` hash
- the frozen per-source `late_data_policy_bindings[]`
- `read_cutoff_at`
- provider environment/API/schema version set used during collection
- connector profile/build refs used to collect source payloads
- per-source cursor/checkpoint/revision refs
- the exact raw source records considered in-scope
- the exact evidence items considered in-scope
- the exact candidate/canonical fact population
- the exact unresolved conflict population
- the conflict frontier summary used by gates (`resolution_frontier`, open/blocking counts, dominant blocking class)
- excluded sources and exclusion rationale
- confirmed no-data declarations for domains proven empty at cutoff
- stale or missing-source declarations
- `source_domain_postures[]` so every frozen domain is typed as collected, confirmed-no-data,
  excluded, missing, or stale instead of disappearing into an implied empty set
- normalization context freeze ref and hash
- artifact contract refs for all authoritative intake-boundary and intake-data artifacts
- `artifact_contract_hash`
- the `input_set_hash`
- `input_consumption_mode = FROZEN_INPUT_ONLY`
- `late_data_adoption_policy = CHILD_REVIEW_OR_EXCLUDE_ONLY`

Each `late_data_policy_binding` SHALL validate against
`schemas/late_data_policy_binding.schema.json` and SHALL include at minimum:

- `binding_id`
- `source_domain`
- `late_data_policy_ref`
- `binding_scope`
- `precedence_rank`
- optional `source_class` / partition-scope refs when the policy is narrower than the whole domain
- optional runtime-scope refs when the policy is narrower than the whole active command scope

`SourcePlan.planned_sources[]` SHALL additionally freeze `completeness_expectation_ref` so the
pre-collection expectation for a required domain cannot drift between planning and boundary freeze.

`CollectionBoundary.source_boundaries[]` SHALL carry at least one request-audit trail reference
(`request_audit_refs[]` or `page_request_audit_refs[]`) so the frozen boundary always retains direct
proof of what connector reads established the cutoff. Each boundary entry SHALL also freeze one
typed `boundary_disposition ∈ {IN_SCOPE_COLLECTED, NO_DATA_CONFIRMED_AT_CUTOFF, EXCLUDED_BY_POLICY,
MISSING_AT_CUTOFF, STALE_AT_CUTOFF}`.

`COLLECTION_LATE_DATA_BINDINGS(...)` SHALL reuse the same `LateDataPolicyBinding` contract when it
projects the ordered binding set for post-seal monitoring and filing-gate evaluation.

`NormalizationContext` SHALL carry non-empty `transformation_version_set[]` and `produced_at` so a
historical replay can reconstruct the exact rule build and transform lineage used during candidate
and canonical formation.

`InputFreeze.artifact_contract_refs[]` SHALL include, at minimum:

- the frozen `SourcePlan` contract ref
- the frozen `SourceWindow` contract ref
- the frozen `CollectionBoundary` contract ref
- the frozen `NormalizationContext` contract ref
- the ordered contract refs for each authoritative intake-data artifact set

`InputFreeze` SHALL also carry the frozen conflict frontier summary consumed by gate evaluation:

- `open_conflict_count`
- `blocking_conflict_count`
- `resolution_frontier`
- `dominant_blocking_class`

`SourceWindow` SHALL additionally freeze `cutoff_enforcement_state = HARD_CLOSED_AT_READ_CUTOFF`
and `post_cutoff_observation_mode = LATE_DATA_ONLY` so the active manifest cannot silently absorb
post-cutoff reads before seal.

### Input freeze rule

Late-arriving source data SHALL never mutate an existing frozen manifest. It SHALL either:

- create a new child manifest, or
- remain out of scope for that run.

For `input_inheritance_mode in {REPLAY_EXACT, RECOVERY_EXACT}`, the engine SHALL reload the
already persisted `InputFreeze` and authoritative intake artifacts instead of recollecting sources.
The same rule applies to the historical late-data and authority basis consumed by the original run:
exact replay MUST use the persisted historical basis and MUST NOT substitute a fresh connector read,
fresh authority response, or fresh post-cutoff scan.

## 5.9 Hash contract

The engine SHALL compute at least these hashes.

### `config_freeze_hash`

Hash of ordered config entries:
`hash(config_type, version_id, content_hash, provider_api_version, provider_schema_version, status_at_freeze)`

### `config_surface_hash`

Hash of the whole governed config surface:
`hash(config_freeze_hash, approval_snapshot_ref, materiality_profile_ref, amendment_materiality_profile_ref,`
`retention_profile_ref, provider_contract_profile_ref, workflow_policy_ref, override_policy_ref,`
`masking_export_policy_ref, canonicalization_rules_ref, connector_mapping_rules_ref,`
`parity_threshold_profile_ref, trust_threshold_profile_ref, risk_threshold_profile_ref,`
`evidence_confidence_policy_ref, computation_rules_ref, schema_bundle_hash, feature_flag_snapshot_hash)`

### `input_set_hash`

Hash of ordered input boundary:
`hash(`
`for each source-boundary entry in canonical source-domain order:`
`  source_domain, provider_environment_ref, provider_api_version, provider_schema_version,`
`  cursor_or_checkpoint_ref, revision_ref, request_audit_refs_hash, completeness_expectation_ref, late_data_policy_ref, boundary_disposition,`
`plus ordered source_record_id, raw_hash, evidence_item_id, candidate_fact_id, canonical_fact_id, conflict_id,`
`exclusion_flags, no_data_confirmed_flags, missing_source_flags, stale_source_flags, source_window_id, read_cutoff_at,`
`source_plan_hash, source_window_hash, collection_boundary_hash, normalization_context_hash, artifact_contract_hash`
`)`

The `input_set_hash` SHALL change if any provider version, cursor/checkpoint, revision marker, read cutoff,
normalization context, or artifact contract hash changes, even when canonicalized values appear numerically identical.

For authoritative intake-data bundles specifically, `SourceRecordSet`, `EvidenceItemSet`,
`CandidateFactSet`, and `CanonicalFactSet` SHALL each carry their own `item_identity_hash`,
`set_hash`, and `produced_at` so replay can distinguish stable membership identity from later
repackaging or derivative supersession.

For conflicts specifically, the frozen input boundary SHALL incorporate both the full conflict-membership
identity (`ConflictSet.item_identity_hash`) and the unresolved frontier identity
(`ConflictSet.unresolved_conflict_hash`, `resolution_frontier`, and `blocking_conflict_count`) so a
historical replay can distinguish "same conflict bodies, different resolution posture" from "same
frontier, richer historical record."

`Snapshot` SHALL mirror the authoritative set hashes it summarizes (`source_record_set_hash`,
`evidence_item_set_hash`, `candidate_fact_set_hash`, `canonical_fact_set_hash`, and
`conflict_set_hash`) so a persisted summary cannot be rebound to different bundle membership by
reference-only drift.

The `artifact_contract_hash` SHALL change if the frozen `SourcePlan`, `SourceWindow`, `CollectionBoundary`,
`NormalizationContext`, or any authoritative intake-data artifact set changes schema identity, contract identity,
or artifact content hash.

### `execution_basis_hash`

Hash of the complete deterministic execution basis used for any exact replay or same-attempt
recovery.

`execution_basis_hash` SHALL follow the ordered frozen-basis root defined by the replay contract and
the material carried by `frozen_execution_binding{...}`:

```text
dimension_digest_d = SHA256(CANONICAL_JSON({
  profile: "execution-basis-dimension/v2",
  dimension: d,
  payload: normalized_dimension_payload_d
}))

execution_basis_hash = SHA256(CANONICAL_JSON({
  profile: "execution-basis-root/v2",
  dimensions: [
    dimension_digest_IDENTITY_AUTHORITY,
    dimension_digest_EXECUTABLE,
    dimension_digest_CONFIG,
    dimension_digest_INPUT,
    dimension_digest_POST_SEAL,
    dimension_digest_DETERMINISM
  ]
}))
```

A flattened single-pass field concatenation is forbidden because it cannot express dimension-level
identity, variance, or undecidability in an auditor-defensible way.

`execution_basis_hash` SHALL be frozen no later than `FROZEN` and SHALL remain byte-identical across
exact replay children, same-manifest sealed reuse, and same-attempt recovery children that claim to
re-execute the same historical basis. Historical authority or late-data artifacts adopted only after
seal SHALL NOT be smuggled back into this pre-seal hash; they belong in
`append_only_outcome_projection.post_seal_basis{...}` and in `deterministic_outcome_hash`.

### `manifest_hash`

Hash of the frozen manifest core excluding mutable lifecycle timestamps and post-seal outcome projections
(`append_only_outcome_projection{...}`, plus the mirrored top-level `gating_decisions[]`, `output_refs`,
`audit_refs`, `submission_refs`, `drift_refs`, `decision_bundle_hash`, `deterministic_outcome_hash`,
`replay_attestation_ref`):
`hash(identity, scope, access_binding_hash, actor refs, build refs, nightly_window_key when present, config_surface_hash, input_set_hash, deterministic_seed)`

### `deterministic_outcome_hash`

Hash of the normalized material outcome surface used for exact replay comparison.

```text
component_digest_c = SHA256(CANONICAL_JSON({
  profile: "deterministic-outcome-component/v2",
  component: c,
  payload: normalized_component_payload_c
}))

deterministic_outcome_hash = SHA256(CANONICAL_JSON({
  profile: "deterministic-outcome-root/v2",
  components: [
    component_digest_DECISION_BUNDLE,
    component_digest_GATE_SEQUENCE,
    component_digest_SNAPSHOT,
    component_digest_COMPUTE_RESULT,
    component_digest_FORECAST_SET,
    component_digest_RISK_REPORT,
    component_digest_PARITY_RESULT,
    component_digest_TRUST_SUMMARY,
    component_digest_EVIDENCE_GRAPH,
    component_digest_TWIN_VIEW,
    component_digest_FILING_PACKET,
    component_digest_AUTHORITY_RESULT,
    component_digest_LATE_DATA_BASIS,
    component_digest_DRIFT_RECORD
  ]
}))
```

The normalized outcome surface SHALL exclude non-deterministic persistence metadata such as artifact
identifiers, queue ids, workflow ids, emitted timestamps, and transport correlation ids when those
fields do not change legal meaning.

The root digest is a compact witness of ordered component-digest equality; it SHALL NOT replace the
per-component replay comparison inventory required by the replay attestation.

### `decision_bundle_hash`

Hash of the persisted `DecisionBundle` and synchronized top-level outcome refs attached to the sealed
manifest.

The hashing algorithm SHALL be deterministic, canonical-order-preserving, and content-based.

## 5.10 Idempotency key contract

Every materially significant operation SHALL carry an idempotency key.

`RunManifest.idempotency_key` is the manifest-level key for the frozen run envelope. Operation/request artifacts
MAY derive narrower idempotency keys from that manifest context plus operation-specific inputs such as
request body hash, obligation reference, or continuation basis.

`requested_scope[]` remains part of the manifest-level identity because it captures caller intent, but it is
not sufficient by itself to define executable sameness.

The executable identity SHALL also include `access_binding_hash`, which incorporates:

- access decision class
- executable/effective scope
- masking rules
- required approvals
- required authentication level

Recommended canonical form:

`idempotency_key = hash(tenant_id | client_id | business_partition_set | period | ordered(requested_scope[]) | access_binding_hash | mode | run_kind | nightly_window_key when run_kind = NIGHTLY else null | config_freeze_hash | input_set_hash | operation_type | continuation_basis)`

`manifest_branch_decision` SHALL mirror this same identity spine so same-window nightly reuse,
terminal-result return, and child allocation decisions can be audited from one durable branch proof
instead of re-deriving the branch later from loosely related fields.

### Nightly window idempotency rule

For `run_kind = NIGHTLY`, same-window duplicate suppression and later-window continuity SHALL be
separate outcomes:

- duplicate triggers inside the same `nightly_window_key` SHALL reuse the same manifest identity or
  persisted terminal result when no new execution is needed; and
- a later nightly window SHALL NOT be forced onto the older manifest merely because frozen config
  and inputs are unchanged when policy or checkpoint timing requires a fresh nightly execution.

`nightly_batch_run_ref` is lineage context; `nightly_window_key` is the frozen idempotency
separator.

### Minimum operations requiring idempotency keys

- begin manifest
- source collection
- snapshot build
- compute
- parity evaluation
- trust synthesis
- filing packet build
- authority request construction
- authority submission / recovery

Compliance-grade determinism rule:

- `non_deterministic_module_allowlist[]` SHALL be empty for `mode = COMPLIANCE`
- `non_deterministic_module_allowlist[]` SHALL be empty for `STANDARD_REPLAY`, `AUDIT_REPLAY`, and
  same-attempt recovery branches that claim exact historical basis reuse
- a non-empty `non_deterministic_module_allowlist[]` is legal only for `mode = ANALYSIS`
- if a replay manifest carries a non-empty `non_deterministic_module_allowlist[]`, then
  `replay_class` SHALL be `COUNTERFACTUAL_ANALYSIS`

## 5.11 Seal contract

### Pre-seal gate evaluation contract

Before `SEALED`, the manifest SHALL publish one authoritative `preseal_gate_evaluation{...}` object.
That contract SHALL bind:

- the exact `hash_set.execution_basis_hash` used for the pre-seal evaluation
- the canonical required gate chain
  `[MANIFEST_GATE, ARTIFACT_CONTRACT_GATE, INPUT_BOUNDARY_GATE, DATA_QUALITY_GATE]`
- the exact ordered `gate_decision_id` prefix emitted for that chain
- one `completion_state` in
  `{PENDING_PREREQUISITES, COMPLETE_READY_TO_SEAL, COMPLETE_BLOCKED_PRESTART}`
- one `durability_boundary` in
  `{NO_PERSISTED_TAPE_YET, PERSIST_PRESTART_TERMINAL_CONTEXT, ATOMIC_GATE_BATCH_AND_SEAL}`
- the rule that same-manifest retry SHALL reuse the persisted pre-seal tape rather than recomputing
  it, and that later post-seal gates SHALL not reinterpret that frozen prefix

A manifest SHALL become `SEALED` only when all of the following are present:

- authenticated actor context or service context
- scope
- build refs
- config freeze
- input freeze
- deterministic seed
- `hash_set.execution_basis_hash`
- `preseal_gate_evaluation.completion_state = COMPLETE_READY_TO_SEAL`
- required overrides/approvals
- sealed gate results for all blocking gates up to that point

Lifecycle timestamp rule:

- `frozen_at` SHALL be present from `FROZEN` onward
- `sealed_at` SHALL be present from `SEALED` onward
- `opened_at` SHALL be present from `IN_PROGRESS` onward
- `completed_at` SHALL be present when `lifecycle_state = COMPLETED`
- `superseded_at` SHALL be present when `lifecycle_state = SUPERSEDED`
- `retired_at` SHALL be present when `lifecycle_state = RETIRED`
- once `frozen_at` is present, `config_freeze`, `input_freeze`, and `hash_set` SHALL already exist,
  even if the manifest later blocks before completion
- lifecycle timestamps SHALL remain monotonic (`created_at <= frozen_at <= sealed_at <= opened_at`,
  with later terminal timestamps only moving forward)

Once sealed, the following fields SHALL be immutable:

- scope fields
- mode
- build refs
- config freeze
- input freeze
- deterministic seed
- idempotency key
- `hash_set.execution_basis_hash`
- parent/root/replay lineage refs

Only these may be appended after seal:

- lifecycle timestamps
- ordered `gating_decisions[]` entries for later gates whose inputs arise only after seal
- output refs
- `decision_bundle_hash`
- `deterministic_outcome_hash`
- `replay_attestation_ref`
- audit refs
- submission refs
- drift refs
- supersession refs

Post-seal `gating_decisions[]` appends SHALL be append-only.
They SHALL not rewrite or delete earlier gate records, and they SHALL not change the frozen manifest core used for `manifest_hash`.
Each embedded gate record SHALL preserve the parent `manifest_id`, remain in ascending
`gate_stage_index` order, and keep the same authorized executable scope that the manifest used for
gate evaluation.
The first four gate records SHALL therefore remain the immutable prefix captured by
`preseal_gate_evaluation{ ordered_gate_decision_ids[], evaluated_gate_codes[] }`, and any later gate
append SHALL start only after that prefix.

`deterministic_outcome_hash` SHALL be computed only from already persisted or transactionally staged
outcome artifacts and SHALL be append-only once written for a given manifest version. A later repair,
reconciliation, or supersession must create a new manifest lineage node rather than rewriting the old
outcome hash in place. When `run_kind = REPLAY`, that hash SHALL NOT be published as replay-visible
truth until `replay_attestation_ref` points at the durable `ReplayAttestation` that explains the
historical-basis provenance behind the comparison.

A later gate SHALL never downgrade an earlier `HARD_BLOCK`.

## 5.12 Provider and environment capture

Because HMRC ships MTD features through Sandbox first and later into Production, and because software
may need to coordinate multiple compatible products, the manifest SHALL capture provider/environment
context explicitly rather than assuming one universal runtime profile. [1]

At minimum:

- `provider_name`
- `provider_environment`
- `api_base_profile`
- `api_version`
- `schema_version`
- `fraud_header_profile_ref` where applicable
- `token_binding_profile_ref`
- `compatible_product_chain_refs[]`

## 5.13 Prohibited operations

The engine SHALL prohibit:

- mutating frozen config refs after seal
- swapping provider API version inside a live manifest
- changing mode from `ANALYSIS` to `COMPLIANCE` in place
- attaching out-of-scope late data to a sealed manifest
- reusing a compliance manifest for counterfactual scenarios
- creating outputs without a manifest
- issuing a filing packet from an unsealed manifest
- replaying with hidden config substitutions
- replaying with hidden input substitutions or fresh source collection on an exact replay child
- performing fresh authority reads or fresh post-cutoff late-data scans on an exact replay or exact recovery child
- rewriting `deterministic_outcome_hash` or `replay_attestation_ref` in place after comparison has been persisted

## 5.14 One-sentence summary

The manifest and config freeze contract ensures that every run is bound to one sealed, replayable
execution envelope whose scope, config, build, input boundary, and environment cannot drift silently
during or after the decision.

[1]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/?utm_source=chatgpt.com
