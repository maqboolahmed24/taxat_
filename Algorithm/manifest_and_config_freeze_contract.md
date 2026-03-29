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
not part of the frozen execution envelope itself.

No downstream module may resolve fresh configuration ad hoc once the manifest is frozen.

## 5.2 Required contract objects

The manifest contract SHALL consist of five linked structures.

### A. `RunEnvelope`

Defines who, what, where, and why the run exists.

### B. `ConfigFreeze`

Defines the exact config set resolved for the run.

### C. `InputFreeze`

Defines the source/input boundary frozen for the run.

### D. `HashSet`

Defines reproducibility hashes and identity hashes.

### E. `ContinuationSet`

Defines parent/child, replay, remediation, amendment, and supersession lineage.

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
- `continuation_set.config_inheritance_mode`
- `manifest_schema_version`

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
- `executable_scope[] = access_decision.effective_scope[]` when present, else `requested_scope[]`.
- define `access_binding_hash = hash(access_decision.decision | ordered(executable_scope[]) | ordered(masking_rules[]) | ordered(required_approvals[]) | required_authn_level)`
- `access_binding_hash` SHALL participate in same-request identity checks, sealed-manifest reuse checks, manifest-level idempotency derivation, and authority-request idempotency derivation.
- Two requests with the same raw `requested_scope[]` but different executable scope or masking policy SHALL NOT share the same execution identity.
- `mode in {COMPLIANCE, ANALYSIS}`
- `mode = ANALYSIS` SHALL NOT coexist with `prepare_submission`, `submit`, `amendment_intent`, or `amendment_submit`; analysis runs may model outcomes, but they SHALL NOT allocate filing or amendment workflow intent
- `run_kind in {INTERACTIVE, NIGHTLY, BACKFILL, REPLAY, REMEDIATION, AMENDMENT, MIGRATION}`
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

### H. Lifecycle

- `lifecycle_state`
- `created_at`
- `frozen_at`
- `opened_at`
- `sealed_at`
- `completed_at`
- `superseded_at`
- `retired_at`

### I. Outcomes

- `access_decision{}`
- `gating_decisions[]`
- `output_refs{}`
- `audit_refs[]`
- `decision_bundle_hash`
- `submission_refs[]`
- `drift_refs[]`

`decision_bundle_hash` SHALL reference the persisted `DecisionBundle` returned for the manifest's
current terminal or review outcome.

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

`required_config_types_present[]` SHALL equal the de-duplicated ordered set of mandatory
`config_type` values actually present in `entries[]`.

## 5.5 Freeze timing rules

The engine SHALL apply the following timing rules.

### Rule A - Freeze-before-decision rule

`ConfigFreeze` SHALL be resolved before any compliance artifact is persisted.

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

### Replay manifest

A special child manifest with:

- identical frozen config refs unless explicitly counterfactual
- identical deterministic seed
- explicit `replay_of_manifest_id`
- no reopening or resealing of the completed parent manifest; replay execution occurs only in the child manifest

### Child-manifest config inheritance rule

Default config inheritance SHALL be:

- same-manifest pre-start reuse -> reuse the same frozen config set (`config_inheritance_mode = null` because no child manifest is created)
- replay child -> inherit the parent frozen config set exactly (`config_inheritance_mode = REPLAY_EXACT`)
- started-run recovery child -> inherit the parent frozen config set only for recovery of the same
  attempt lineage (`config_inheritance_mode = RECOVERY_EXACT`)
- amendment, remediation, drift-reassessment, analysis, and other continuation children -> resolve a
  fresh config set by default (`config_inheritance_mode = FRESH_CHILD_RESOLUTION`)

Historical frozen config reuse on a non-replay child is legal only when the child manifest explicitly
records `config_inheritance_mode = HISTORICAL_EXPLICIT`.

A child manifest with `config_inheritance_mode = HISTORICAL_EXPLICIT` SHALL NOT initiate a new live
filing-capable or amendment-capable progression if any inherited compliance config entry is non-live
at child start.

### Single-writer start rule

The `SEALED --run_started--> IN_PROGRESS` transition SHALL be atomic and lease-protected. At most one
live writer may hold the start claim for a manifest at a time.

A failed start claim SHALL prevent execution and SHALL NOT create a recovery child until the active
lease is released or expires under policy.

### Supersession manifest

A new manifest that replaces the prior operational decision basis without mutating the old one.

## 5.8 Input freeze contract

The input boundary must be frozen separately from config.

`InputFreeze` SHALL define:

- the frozen `SourcePlan` reference
- the frozen `SourceWindow` reference
- the frozen `CollectionBoundary` reference
- the frozen per-source `late_data_policy_bindings[]`
- `read_cutoff_at`
- provider environment/API/schema version set used during collection
- connector profile/build refs used to collect source payloads
- per-source cursor/checkpoint/revision refs
- the exact raw source records considered in-scope
- the exact evidence items considered in-scope
- the exact candidate/canonical fact population
- the exact unresolved conflict population
- excluded sources and exclusion rationale
- stale or missing-source declarations
- normalization context freeze ref and hash
- artifact contract refs for all authoritative intake-boundary and intake-data artifacts
- `artifact_contract_hash`
- the `input_set_hash`

Each `late_data_policy_binding` SHALL include at minimum:

- `source_domain`
- `late_data_policy_ref`
- optional source-class / partition-scope refs when the policy is narrower than the whole domain

`InputFreeze.artifact_contract_refs[]` SHALL include, at minimum:

- the frozen `SourcePlan` contract ref
- the frozen `SourceWindow` contract ref
- the frozen `CollectionBoundary` contract ref
- the frozen `NormalizationContext` contract ref
- the ordered contract refs for each authoritative intake-data artifact set

### Input freeze rule

Late-arriving source data SHALL never mutate an existing frozen manifest. It SHALL either:

- create a new child manifest, or
- remain out of scope for that run.

## 5.9 Hash contract

The engine SHALL compute at least these hashes.

### `config_freeze_hash`

Hash of ordered config entries:
`hash(config_type, version_id, content_hash, provider_api_version, provider_schema_version, status_at_freeze)`

### `input_set_hash`

Hash of ordered input boundary:
`hash(`
`for each source-boundary entry in canonical source-domain order:`
`  source_domain, provider_environment_ref, provider_api_version, provider_schema_version,`
`  cursor_or_checkpoint_ref, revision_ref, request_audit_refs_hash, completeness_expectation_ref, late_data_policy_ref,`
`plus ordered source_record_id, raw_hash, evidence_item_id, candidate_fact_id, canonical_fact_id, conflict_id,`
`exclusion_flags, missing_source_flags, stale_source_flags, source_window_id, read_cutoff_at,`
`normalization_context_hash, artifact_contract_hash`
`)`

The `input_set_hash` SHALL change if any provider version, cursor/checkpoint, revision marker, read cutoff,
normalization context, or artifact contract hash changes, even when canonicalized values appear numerically identical.

The `artifact_contract_hash` SHALL change if the frozen `SourcePlan`, `SourceWindow`, `CollectionBoundary`,
`NormalizationContext`, or any authoritative intake-data artifact set changes schema identity, contract identity,
or artifact content hash.

### `manifest_hash`

Hash of the frozen manifest core excluding mutable lifecycle timestamps and post-seal outcome projections
(`gating_decisions[]`, `output_refs`, `audit_refs`, `submission_refs`, `drift_refs`, `decision_bundle_hash`):
`hash(identity, scope, actor refs, build refs, config_freeze_hash, input_set_hash, deterministic_seed)`

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

`idempotency_key = hash(tenant_id | client_id | business_partition_set | period | ordered(requested_scope[]) | access_binding_hash | mode | run_kind | config_freeze_hash | input_set_hash | operation_type | continuation_basis)`

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

## 5.11 Seal contract

A manifest SHALL become `SEALED` only when all of the following are present:

- authenticated actor context or service context
- scope
- build refs
- config freeze
- input freeze
- deterministic seed
- required overrides/approvals
- sealed gate results for all blocking gates up to that point

Once sealed, the following fields SHALL be immutable:

- scope fields
- mode
- build refs
- config freeze
- input freeze
- deterministic seed
- idempotency key
- parent/root/replay lineage refs

Only these may be appended after seal:

- lifecycle timestamps
- ordered `gating_decisions[]` entries for later gates whose inputs arise only after seal
- output refs
- `decision_bundle_hash`
- audit refs
- submission refs
- drift refs
- supersession refs

Post-seal `gating_decisions[]` appends SHALL be append-only.
They SHALL not rewrite or delete earlier gate records, and they SHALL not change the frozen manifest core used for `manifest_hash`.

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

## 5.14 One-sentence summary

The manifest and config freeze contract ensures that every run is bound to one sealed, replayable
execution envelope whose scope, config, build, input boundary, and environment cannot drift silently
during or after the decision.

[1]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/?utm_source=chatgpt.com
