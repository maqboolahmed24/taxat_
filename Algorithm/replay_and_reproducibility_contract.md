# Replay and Reproducibility Contract

## Purpose

Manifest-frozen replayability SHALL be a first-class architectural contract rather than an emergent
property of implementation discipline. Every material run SHALL therefore preserve a fully frozen
execution basis that can be reconstructed, re-executed, compared, and explained without hidden
mutation.

This contract defines the deterministic replay layer for:

- exact replay of a historically sealed run
- same-attempt recovery after interruption
- historically explicit continuation on a frozen basis
- counterfactual analysis against a known historical basis
- operator and auditor explanation of replay outcomes

## Core principles

### 1. Immutable execution basis

A run claiming exact replayability SHALL freeze all materially relevant determinants of execution,
including at minimum:

- actor, principal, access, and authority-binding context
- executable build, container, schema-bundle, and feature-flag lineage
- frozen config surface
- frozen input surface
- deterministic seed
- persisted historical post-seal basis when authority context or late-data outcomes affect the
  legal or compliance meaning of the run

These determinants SHALL be represented by `hash_set.execution_basis_hash` and by stable artifact
references that remain externally auditable.

### 2. Determinism over recomputation convenience

The engine SHALL prefer reloading the historically frozen artifact basis over recomputing from live
systems. Fresh reads are permitted only when the requested continuation explicitly declares itself as
fresh or counterfactual. Authority recovery and unresolved settlement therefore SHALL reuse
persisted `AuthorityInteractionRecord.reconciliation_control_contract{...}`, copied unresolved
`SubmissionRecord.reconciliation_control_contract_or_null{...}`, and any derived
`AuthorityReconciliationAnalyticsSnapshot` only as historical evidence; exact replay or same-attempt
recovery SHALL NOT reopen budget math from new profile defaults, transient retry logs, or worker
timer memory.

### 3. Temporal integrity

An exact replay SHALL represent what the system knew and decided at the historical decision point,
not what the system knows now. Later authority corrections, superseding policy versions, or new
source arrivals SHALL create a new continuation child instead of mutating or silently improving the
historical replay target.

### 4. Mutation isolation

No replay mode may silently substitute:

- a newer config resolution for an exact replay target
- a newer input collection for an exact replay target
- a fresh authority read for a historically frozen authority basis
- a fresh late-data scan for a historically frozen late-data basis
- a newer formula or policy interpretation without an explicit counterfactual declaration

### 5. Durable comparison and explanation

Replay results SHALL be persisted as a first-class `ReplayAttestation` artifact linked from the
manifest. A replay comparison MUST NOT exist only in transient logs.

## Replay classes

### `STANDARD_REPLAY`

Re-executes the historical run on a byte-equivalent execution basis and expects the same material
outcome. Any material difference SHALL be treated as an unexpected mismatch unless a basis
limitation prevented exact comparison.
Its persisted `ReplayAttestation` SHALL preserve compliance posture:
`execution_mode = COMPLIANCE`, `analysis_only = false`, `non_compliance_config_refs[] = []`, and
`counterfactual_basis = null`.

### `AUDIT_REPLAY`

Equivalent to `STANDARD_REPLAY` but initiated for evidentiary, regulatory, or dispute-resolution
purposes. The comparison contract is the same, but observability, explanation, and retention
expectations are stricter.
Its persisted `ReplayAttestation` SHALL preserve the same compliance posture as
`STANDARD_REPLAY`; audit intent MUST NOT be smuggled in as analysis-only replay.

### `COUNTERFACTUAL_ANALYSIS`

Replays from an identified historical target while explicitly changing one or more permitted basis
dimensions. Differences are expected only when declared. The resulting attestation SHALL identify
which basis dimensions changed and whether comparison remained fully, partially, or only narrowly
comparable.
Its persisted `ReplayAttestation` SHALL preserve analysis posture:
`execution_mode = ANALYSIS`, `analysis_only = true`, and non-null `counterfactual_basis`.
Counterfactual posture SHALL NOT be inferred from outcome drift alone.

Every persisted `ReplayAttestation` and every downstream artifact that republishes replay outcome,
trust posture, twin posture, evidence posture, or workflow/actionability derived from that replay
SHALL also carry one frozen `execution_mode_boundary_contract{ run_kind, replay_class_or_null,
execution_mode, analysis_only, non_compliance_config_refs[], counterfactual_basis,
execution_posture, legal_effect_boundary, disclosure_reason_codes[] }`. Consumers SHALL branch on
that persisted contract rather than inferring live-vs-modeled posture from `execution_mode` alone.
`STANDARD_REPLAY` and `AUDIT_REPLAY` therefore remain `REPLAY_COMPLIANCE` plus
`HISTORICAL_REPLAY_READ_ONLY`, while `COUNTERFACTUAL_ANALYSIS` remains
`REPLAY_COUNTERFACTUAL` plus `COUNTERFACTUAL_REPLAY_READ_ONLY`; neither may be serialized into
filing-capable or authority-capable downstream posture.

## Execution-basis freeze contract

The execution basis SHALL be complete no later than `RunManifest.lifecycle_state = FROZEN`.

### Required frozen basis dimensions

1. **Identity and authority context**
   - `client_id`
   - `period`
   - `authority_scope_ref`
   - `principal_context_ref`
   - `access_binding_hash`
   - `authority_context_ref`
   - `environment_ref`
   - ordered `provider_environment_refs[]`

2. **Executable basis**
   - `code_build_id`
   - `code_commit_sha`
   - `container_image_digest`
   - `schema_bundle_hash`
   - `feature_flag_snapshot_hash`

3. **Frozen config basis**
   - `config_freeze_ref`
   - `config_freeze_hash`
   - `config_surface_hash`
   - every minimum config artifact required by the manifest contract

4. **Frozen input basis**
   - `input_freeze_ref`
   - `input_set_hash`
   - source-plan, source-window, collection-boundary, normalization-context, and authoritative intake
     artifact-set identities

5. **Determinism controls**
   - `deterministic_seed`
   - empty `non_deterministic_module_allowlist[]` for exact replay and exact recovery

6. **Persisted post-seal basis when material**
   - `append_only_outcome_projection.post_seal_basis{...}`
   - authority-context result lineage
   - late-data monitor result lineage

### Canonical execution-basis hash

For audit purposes the engine SHALL treat execution-basis identity as a vector-equality problem,
not as a single opaque digest.

Let the ordered required frozen-basis dimension set be:

`D_basis = [IDENTITY_AUTHORITY, EXECUTABLE, CONFIG, INPUT, DETERMINISM]`

For each `d in D_basis`, define a normalized dimension payload `N_d` as follows:

- `IDENTITY_AUTHORITY`: `client_id`, `period`, `authority_scope_ref`, `principal_context_ref`, `authority_binding_ref`, `authority_link_ref`, `delegation_grant_ref_or_null`, `access_binding_hash`, `policy_snapshot_hash`, `authority_context_ref`, `environment_ref`, and ordered `provider_environment_refs[]`
- `EXECUTABLE`: `code_build_id`, `code_commit_sha`, `container_image_digest`, `schema_bundle_hash`, `feature_flag_snapshot_hash`, and any verified build/runtime attestation refs that constrain executable sameness
- `CONFIG`: `config_freeze_ref`, `config_freeze_hash`, `config_surface_hash`, and the frozen minimum config-artifact identities required by the manifest contract
- `INPUT`: `input_freeze_ref`, `input_set_hash`, and the frozen source-plan, source-window, collection-boundary, normalization-context, and authoritative-intake artifact-set identities
- `DETERMINISM`: `deterministic_seed`, ordered `non_deterministic_module_allowlist[]`, and every runtime-visible determinism control that could perturb the result (including timezone, locale, decimal context, path-prefix mapping, and equivalent settings) either as first-class fields or as verified refs inside the dimension payload

Normalization rules for every `N_d`:

- UTF-8 encoding
- Unicode NFC normalization for strings
- lexicographically ordered object keys
- deterministic ordering for set-like arrays, while semantically ordered arrays preserve their declared order
- exact decimal string rendering with no locale variance and no NaN or infinite values
- money-bearing values rendered as canonical decimal strings with the exact frozen scale from the
  governing `money_profile`, never as JSON numbers, and never with trimmed trailing zeros or
  exponent notation
- any hash over compute, forecast, parity, drift, calculation, or filing payloads that contains
  money SHALL therefore include the frozen `money_profile` fields in the normalized payload
- explicit `null` values for absent optional fields once a dimension schema is fixed
- no incidental whitespace

For each dimension:

```text
dimension_digest_d = SHA256(CANONICAL_JSON({
  profile: "execution-basis-dimension/v2",
  dimension: d,
  payload: N_d
}))
```

Then:

```text
execution_basis_hash = SHA256(CANONICAL_JSON({
  profile: "execution-basis-root/v2",
  dimensions: [
    dimension_digest_IDENTITY_AUTHORITY,
    dimension_digest_EXECUTABLE,
    dimension_digest_CONFIG,
    dimension_digest_INPUT,
    dimension_digest_DETERMINISM
  ]
}))
```

`hash_set.execution_basis_hash` SHALL therefore be the ordered root digest over the full set of
basis-dimension digests, not an ad hoc hash over a partially flattened field list.

Define the basis-identity predicate for expected basis `B*` and actual basis `B`:

`basis_equal(B*, B) = 1 iff dimension_digest_d(B*) = dimension_digest_d(B) for every required d in D_basis`

If any required frozen-basis dimension digest cannot be reconstructed because of retention, missing dependency,
schema-reader incompatibility, build-material unavailability, or integrity failure, the comparison
for that dimension is not false; it is limited or invalid and SHALL be preserved explicitly in the
replay attestation rather than silently collapsed into either equality or mismatch.

Historical post-seal authority or late-data state is not part of this pre-seal frozen-basis hash.
It SHALL instead live in `RunManifest.append_only_outcome_projection.post_seal_basis{...}` and be
compared alongside `deterministic_outcome_hash`, so the engine does not mutate a supposedly frozen
hash after seal just because lawful append-only outcome evidence arrived later.

## Exact replay preconditions

An exact replay or exact recovery SHALL satisfy all of the following before execution begins:

1. `continuation_basis` identifies the correct lineage edge.
2. `continuation_set.config_inheritance_mode` is exact.
3. `continuation_set.input_inheritance_mode` is exact.
4. The source manifest is sealed and historically readable.
5. The frozen `ConfigFreeze` is available, valid, and schema-readable.
6. The frozen `InputFreeze` and all authoritative intake artifacts are available, valid, and
   schema-readable.
7. The persisted `schema_reader_window_contract{...}` for the recorded `schema_bundle_hash` still
   admits the replay reader, or the runtime can load the exact historical bundle directly.
7. Historical `preseal_gate_evaluation{...}` is available, readable, and agrees with the ordered
   historical pre-seal gate records.
8. Historical authority and late-data basis artifacts are available when the original decision used
   them materially.
9. The replay runtime can deserialize the source schema bundle and, when required, decrypt the
   retained artifacts.
10. The requested scope contains no live mutation token.

If any precondition fails, the system SHALL either:

- fail closed with a typed replay-basis error, or
- produce a replay attestation with an explicitly limited comparison posture when policy permits
  limited historical comparison

The system SHALL NOT silently recollect inputs or substitute live state and still label the result
an exact replay.

Exact replay and same-manifest sealed reuse SHALL therefore consume the persisted pre-seal tape
rather than recomputing the pre-seal chain on ambient state. If the historical
`preseal_gate_evaluation{...}` or its ordered gate prefix is missing, incomplete, or mismatched, the
engine SHALL fail closed instead of reconstructing a substitute gate sequence.

Schema-reader compatibility for replay and restore SHALL come from the persisted
`schema_reader_window_contract{...}` bound to the historical bundle and execution records, not from
whatever bundle happens to be live at deploy time. The runtime SHALL therefore fail closed on
schema-reader incompatibility instead of silently deserializing historical truth through a newer
shape with substituted semantics.

`manifest_branch_decision.branch_action` and the selected manifest's persisted
`selected_manifest_continuation_basis` SHALL remain distinct: replay reruns may legally take
`RETURN_EXISTING_BUNDLE` while pointing at a persisted `REPLAY_CHILD`, and that distinction SHALL be
retained in audit evidence rather than collapsed into ordinary continuation semantics.

## Recovery and continuation semantics

Transport reconnect metadata such as `resume_token`, `frame_epoch`, `shell_stability_token`,
`workspace_version`, `view_guard_ref`, grouped `stability_contract`, or route-scoped snapshot refs
SHALL remain read-side recovery artifacts only. They SHALL NOT be treated as `continuation_basis`,
`execution_basis_hash`, or any substitute for replay/continuation lineage when a run is resumed,
recovered, or compared historically.

The same rule applies to calm-shell and portal projections more broadly: persisted `DecisionBundle`,
`ExperienceDelta`, `LowNoiseExperienceFrame`, `ExperienceCursor`, workspace snapshots, and customer
portal read models MAY be reloaded or rebuilt for operator and client delivery, but they SHALL NOT
be consulted as the authoritative source for replay legality, workflow mutation, authority
reconciliation, or post-seal control-plane state. Exact recovery SHALL anchor through durable
receipts, manifests, workflow items, gate records, authority interaction records, and append-only
audit evidence instead.

### Same-attempt recovery

A `RECOVERY_CHILD` SHALL reuse the exact frozen config and input basis of the interrupted attempt.
It SHALL preserve `execution_basis_hash` and SHALL NOT recast recovery as a fresh child.

### Historically explicit continuation

A non-replay child MAY reuse historical config or input only when the child declares
`HISTORICAL_EXPLICIT` on the relevant inheritance mode. Such a child SHALL carry limitation metadata
and SHALL NOT imply present-tense freshness.

### Counterfactual replay

A counterfactual replay SHALL declare which basis dimensions changed:

- config only
- input only
- policy or formula only
- authority interpretation only
- mixed basis

The resulting `ReplayAttestation` SHALL classify the difference as expected or limited. It SHALL
never imply exact-match semantics when the basis changed.

## Idempotent rerun guarantees

The architecture SHALL guarantee idempotent rerun behavior for identical replay intents.

- an exact same-request terminal rerun SHALL return the existing persisted `DecisionBundle`
- an exact same-request replay rerun SHALL return the existing replay child and its
  `ReplayAttestation` rather than allocating a duplicate child
- same-manifest pre-start retries SHALL reuse the already sealed context rather than recollecting
  mutable inputs
- same-attempt recovery SHALL preserve lineage and basis identity instead of branching into a fresh
  continuation semantics path

Idempotency SHALL be keyed from the frozen execution basis, requested replay class, replay target,
and authorized runtime scope. Equivalent requests SHALL therefore converge on the same persisted
outcome surface.

## Historical post-seal basis

When the original run's legal or compliance meaning depended on post-seal state, the engine SHALL
persist a replay-safe historical post-seal basis inside
`RunManifest.append_only_outcome_projection.post_seal_basis{...}` containing:

- authority-context result lineage
- late-data monitor result lineage
- hashes of any authority-calculation result or post-seal drift record used materially

Exact replay SHALL reload this historical basis rather than executing fresh post-seal collection.

## Deterministic outcome contract

Every manifest with a persisted `DecisionBundle` SHALL also persist
`RunManifest.deterministic_outcome_hash`.

For audit purposes the deterministic outcome SHALL be compared at component level first and only
then summarized as a root digest.

Let the ordered outcome-component set be:

`D_outcome = [DECISION_BUNDLE, GATE_SEQUENCE, SNAPSHOT, COMPUTE_RESULT, FORECAST_SET, RISK_REPORT, PARITY_RESULT, TRUST_SUMMARY, EVIDENCE_GRAPH, TWIN_VIEW, FILING_PACKET, AUTHORITY_RESULT, LATE_DATA_BASIS, DRIFT_RECORD]`

For each `c in D_outcome`, define a normalized payload `M_c` that contains the material content of
that component and excludes persistence-only identifiers, queue ids, transport ids, and timestamps
whose change does not alter legal or compliance meaning. Optional components that are not material
for the manifest SHALL still occupy their ordered slot as an explicit `null` payload so component
arity itself cannot drift.

For each component:

```text
component_digest_c = SHA256(CANONICAL_JSON({
  profile: "deterministic-outcome-component/v2",
  component: c,
  payload: M_c
}))
```

Then:

```text
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

A root-hash equality claim SHALL be treated as a compact witness of ordered component-digest
identity under the frozen canonicalization profile, not as the only persisted proof. The replay
attestation SHALL therefore retain per-component comparison results in addition to the root hashes.

## Replay comparison contract

Replay comparison SHALL evaluate basis identity and deterministic outcome equivalence through
explicit per-dimension and per-component comparison results persisted on the attestation. A single
root-hash equality check is necessary but not sufficient for auditor-grade explanation.

### Comparison modes

- `EXACT_HASH_MATCH`
- `COUNTERFACTUAL_DECLARED`
- `LIMITED_HISTORICAL_COMPARISON`
- `BASIS_INCOMPLETE`
- `BASIS_CORRUPT`

### Basis validation states

- `VALID`
- `RETENTION_LIMITED`
- `MISSING_DEPENDENCY`
- `CORRUPT`
- `SCHEMA_INCOMPATIBLE`
- `BUILD_UNAVAILABLE`

### Basis-identity verdicts

- `IDENTICAL`
- `DIFFERENT`
- `UNDECIDABLE`
- `CORRUPT`

### Deterministic-equivalence verdicts

- `IDENTICAL`
- `DIFFERENT`
- `UNDECIDABLE`
- `CORRUPT`

### Outcome classes

- `EXACT_MATCH`
- `EXPECTED_EQUIVALENCE`
- `EXPECTED_DIFFERENCE`
- `LIMITED_COMPARABLE`
- `BASIS_INCOMPLETE`
- `BASIS_CORRUPT`
- `UNEXPECTED_MISMATCH`

### Variance taxonomy

Each persisted basis-dimension result or outcome-component result SHALL classify variance as one of:

- `NONE`
- `DECLARED_COUNTERFACTUAL`
- `UNDECLARED_BASIS_VARIANCE`
- `NON_MATERIAL_OUTCOME_VARIANCE`
- `MATERIAL_OUTCOME_VARIANCE`
- `BLOCKING_OUTCOME_VARIANCE`
- `LIMITATION_ONLY`
- `INTEGRITY_FAILURE`

### Limitation-aware comparison formulas

Let `R_basis` be the ordered set of persisted basis-dimension results. Each result `i in R_basis`
SHALL carry strictly positive `comparison_weight_i` and
`comparison_state_i in {MATCH, MISMATCH, DECLARED_CHANGE, UNOBSERVABLE, CORRUPT}`.

Define indicator functions:

- `obs_i = 1` if `comparison_state_i in {MATCH, MISMATCH, DECLARED_CHANGE}`, else `0`
- `eq_i = 1` if `comparison_state_i = MATCH`, else `0`
- `decl_i = 1` if `comparison_state_i = DECLARED_CHANGE`, else `0`
- `bad_i = 1` if `comparison_state_i = CORRUPT`, else `0`

Then:

`basis_weight_total = Σ(comparison_weight_i)` across `i in R_basis`

`basis_observed_weight = Σ(comparison_weight_i * obs_i)` across `i in R_basis`

`basis_coverage = 0 if basis_weight_total = 0 else basis_observed_weight / basis_weight_total`

`basis_match_ratio = 0 if basis_observed_weight = 0 else Σ(comparison_weight_i * eq_i) / basis_observed_weight`

`basis_declared_variance_mass = 0 if basis_weight_total = 0 else Σ(comparison_weight_i * decl_i) / basis_weight_total`

`basis_undeclared_variance_mass = 0 if basis_weight_total = 0 else Σ(comparison_weight_i * 1[comparison_state_i = MISMATCH]) / basis_weight_total`

Set `basis_identity_verdict` as follows:

- `CORRUPT` if any `bad_i = 1`
- `IDENTICAL` if `basis_coverage = 1` and `basis_declared_variance_mass = 0` and `basis_undeclared_variance_mass = 0`
- `DIFFERENT` if no `bad_i = 1` and `basis_declared_variance_mass + basis_undeclared_variance_mass > 0`
- `UNDECIDABLE` otherwise

Let `R_outcome` be the ordered set of persisted outcome-component results. Each result `j in R_outcome`
SHALL carry strictly positive `comparison_weight_j`,
`comparison_state_j in {MATCH, MISMATCH, DECLARED_CHANGE, UNOBSERVABLE, CORRUPT}`, and
`materiality_j in {NON_MATERIAL, MATERIAL, BLOCKING}`.

Define:

- `obs_j = 1` if `comparison_state_j in {MATCH, MISMATCH, DECLARED_CHANGE}`, else `0`
- `eq_j = 1` if `comparison_state_j = MATCH`, else `0`
- `decl_j = 1` if `comparison_state_j = DECLARED_CHANGE`, else `0`
- `bad_j = 1` if `comparison_state_j = CORRUPT`, else `0`
- `mat_j = 1` if `materiality_j in {MATERIAL, BLOCKING}`, else `0`

Then:

`outcome_weight_total = Σ(comparison_weight_j)` across `j in R_outcome`

`outcome_observed_weight = Σ(comparison_weight_j * obs_j)` across `j in R_outcome`

`material_outcome_weight_total = Σ(comparison_weight_j * mat_j)` across `j in R_outcome`

`material_outcome_observed_weight = Σ(comparison_weight_j * obs_j * mat_j)` across `j in R_outcome`

`outcome_coverage = 0 if outcome_weight_total = 0 else outcome_observed_weight / outcome_weight_total`

`outcome_match_ratio = 0 if outcome_observed_weight = 0 else Σ(comparison_weight_j * eq_j) / outcome_observed_weight`

`material_outcome_coverage = 0 if material_outcome_weight_total = 0 else material_outcome_observed_weight / material_outcome_weight_total`

`material_outcome_match_ratio = 0 if material_outcome_observed_weight = 0 else Σ(comparison_weight_j * eq_j * mat_j) / material_outcome_observed_weight`

`declared_material_variance_mass = 0 if material_outcome_weight_total = 0 else Σ(comparison_weight_j * decl_j * mat_j) / material_outcome_weight_total`

`undeclared_material_variance_mass = 0 if material_outcome_weight_total = 0 else Σ(comparison_weight_j * 1[comparison_state_j = MISMATCH] * mat_j) / material_outcome_weight_total`

Set `deterministic_equivalence_verdict` as follows:

- `CORRUPT` if any `bad_j = 1`
- `IDENTICAL` if `material_outcome_coverage = 1` and `declared_material_variance_mass = 0` and `undeclared_material_variance_mass = 0` and `expected_deterministic_outcome_hash = actual_deterministic_outcome_hash`
- `DIFFERENT` if no `bad_j = 1` and `declared_material_variance_mass + undeclared_material_variance_mass > 0`
- `UNDECIDABLE` otherwise

### Classification rules

Define the exact-replay claim predicate:

`exact_replay_claimable = 1` iff all of the following are true:

- `replay_class in {STANDARD_REPLAY, AUDIT_REPLAY}`
- `basis_validation_state = VALID`
- `basis_identity_verdict = IDENTICAL`
- `deterministic_equivalence_verdict = IDENTICAL`
- `basis_coverage = 1`
- `material_outcome_coverage = 1`
- `expected_execution_basis_hash = actual_execution_basis_hash`
- `expected_deterministic_outcome_hash = actual_deterministic_outcome_hash`

Then the replay SHALL classify as follows:

1. `comparison_mode = BASIS_CORRUPT` and `outcome_class = BASIS_CORRUPT` if `basis_validation_state = CORRUPT` or either verdict is `CORRUPT`.
2. `comparison_mode = EXACT_HASH_MATCH` and `outcome_class = EXACT_MATCH` if `exact_replay_claimable = 1`.
3. `comparison_mode = COUNTERFACTUAL_DECLARED` and `outcome_class = EXPECTED_EQUIVALENCE` if `replay_class = COUNTERFACTUAL_ANALYSIS`, `basis_identity_verdict = DIFFERENT`, `basis_undeclared_variance_mass = 0`, and `deterministic_equivalence_verdict = IDENTICAL`.
4. `comparison_mode = COUNTERFACTUAL_DECLARED` and `outcome_class = EXPECTED_DIFFERENCE` if `replay_class = COUNTERFACTUAL_ANALYSIS`, `basis_identity_verdict = DIFFERENT`, `basis_undeclared_variance_mass = 0`, `undeclared_material_variance_mass = 0`, and `deterministic_equivalence_verdict = DIFFERENT`.
5. `comparison_mode = LIMITED_HISTORICAL_COMPARISON` and `outcome_class = LIMITED_COMPARABLE` if no verdict is `CORRUPT`, at least one observed comparison exists, at least one material outcome component remains observable, and either `basis_coverage < 1` or `material_outcome_coverage < 1`.
6. `comparison_mode = BASIS_INCOMPLETE` and `outcome_class = BASIS_INCOMPLETE` if no verdict is `CORRUPT` and the retained basis is too incomplete to support even a limited material comparison; in particular, a replay with zero observable material outcome components SHALL NOT claim `LIMITED_COMPARABLE`.
7. Otherwise the outcome SHALL be `UNEXPECTED_MISMATCH`.

A counterfactual replay with undeclared observed basis variance or undeclared material outcome
variance SHALL therefore be `UNEXPECTED_MISMATCH`, not `EXPECTED_DIFFERENCE`.
When such a replay still carries a declared counterfactual basis, it MAY retain
`comparison_mode = COUNTERFACTUAL_DECLARED`, but the outcome claim itself SHALL remain
unexpected rather than expected.

## Replay attestation artifact

Every replay child that reaches a persisted decision outcome SHALL also persist a
`ReplayAttestation` containing at minimum:

- replay child manifest id
- replay target manifest id
- replay class
- comparison mode
- basis validation state
- basis-identity verdict
- deterministic-equivalence verdict
- outcome class
- `basis_integrity_contract{ config_basis_source_class, input_basis_source_class,
  preseal_gate_source_class, authority_basis_source_class, late_data_basis_source_class,
  live_connector_read_class, live_authority_read_class, late_data_rescan_class,
  substituted_basis_dimensions[], declared_counterfactual_dimensions[],
  undeclared_basis_drift_dimensions[], non_persisted_outcome_component_classes[] }`
- expected and actual `execution_basis_hash`
- expected and actual `deterministic_outcome_hash`
- ordered `basis_dimension_results[]`
- ordered `outcome_component_results[]`
- `basis_coverage`
- `basis_match_ratio`
- `outcome_coverage`
- `outcome_match_ratio`
- `material_outcome_coverage`
- `material_outcome_match_ratio`
- difference reason codes
- limitation codes
- mismatch inventory
- signature-verification state
- verification-material refs
- attestation-confidence score and band
- plain-language explanation
- comparison timestamp
- artifact contract metadata

The attestation SHALL also preserve the common execution-context field group coherently with the
replay class:

- `STANDARD_REPLAY` and `AUDIT_REPLAY` SHALL retain compliance posture and SHALL NOT carry
  `counterfactual_basis`
- `COUNTERFACTUAL_ANALYSIS` SHALL retain analysis posture and a non-null `counterfactual_basis`
- `EXPECTED_EQUIVALENCE` and `EXPECTED_DIFFERENCE` SHALL retain non-empty
  `difference_reason_codes[]`
- `LIMITED_COMPARABLE` and `BASIS_INCOMPLETE` SHALL retain non-empty `limitation_codes[]`

No replay child may publish an exact, expected, limited, or corrupt replay claim to operators,
auditors, or downstream APIs unless the corresponding `ReplayAttestation` has been durably
persisted and linked from the manifest. A replay child therefore SHALL NOT publish
`RunManifest.deterministic_outcome_hash` as replay-visible truth unless
`RunManifest.replay_attestation_ref` already points at that durable attestation.

### Attestation confidence and verifier binding

A replay attestation SHALL be wrapped in a verifiable signature envelope or equivalent authenticated
record whenever deployment policy requires auditor-grade evidence. Unsigned attestations MAY exist
for internal operation, but they SHALL be scored as less defensible.

Let:

- `sig_factor = 1.00` if `signature_verification_state = VERIFIED`
- `sig_factor = 0.85` if `signature_verification_state = NOT_SIGNED`
- `sig_factor = 0.50` if `signature_verification_state = VERIFICATION_MATERIAL_MISSING`
- `sig_factor = 0.00` if `signature_verification_state = SIGNATURE_INVALID`

Define:

`coverage_factor = min(basis_coverage, material_outcome_coverage)`

`undeclared_variance_factor = 1 - max(basis_undeclared_variance_mass, undeclared_material_variance_mass)`

`attestation_confidence_raw = 100 * sig_factor * coverage_factor * undeclared_variance_factor`

`attestation_confidence_score = 0 if basis_validation_state = CORRUPT else round_score(attestation_confidence_raw)`

Banding:

- `VERY_HIGH` if `attestation_confidence_score >= 95`
- `HIGH` if `80 <= attestation_confidence_score < 95`
- `MODERATE` if `60 <= attestation_confidence_score < 80`
- `LOW` if `30 <= attestation_confidence_score < 60`
- `INSUFFICIENT` otherwise

These confidence values quantify attestation defensibility and replay-claim support under the frozen
comparison envelope. They are not probabilities of legal correctness.

The attestation SHALL be immutable after persistence. Any correction to the comparison logic SHALL
produce a new manifest lineage node or a superseding attestation artifact linked explicitly to the
original.

## Corruption and incomplete basis handling

### Missing basis component

If a required frozen artifact cannot be found, the engine SHALL emit a typed missing-basis error or
persist a limited replay attestation according to policy. It SHALL NOT source a fresh replacement.

### Corrupt artifact or hash mismatch

If a retained artifact fails integrity validation or its content hash does not match the frozen
manifest reference, the replay SHALL enter `BASIS_CORRUPT` posture.

### Schema-reader incompatibility

If the current runtime cannot deserialize the historical artifact under the recorded schema bundle,
replay SHALL enter `SCHEMA_INCOMPATIBLE` posture until a compatible reader is supplied.

### Retention-limited comparison

If privacy transformation or retention minimization preserved only hashes and placeholders, the
replay MAY proceed only as `LIMITED_HISTORICAL_COMPARISON` and SHALL state the limitation.

## Amendment, drift, and late-data semantics

Exact replay of a historically amended or drift-affected manifest SHALL bind to the original:

- baseline selection
- baseline frozen hash
- amendment-window evaluation
- amendment-window evaluation hash
- authority-state basis
- late-data monitor basis
- materiality profile
- retroactive-impact analysis hash
- amendment-bundle identity hash when a bundle was prepared or submitted

Later corrections, superseding policies, or newly discovered data SHALL create a new continuation
child rather than mutating the original replay target or its attestation.

## Retention requirements

The minimum replay-safe retention basis for every material run SHALL preserve:

- the manifest envelope
- `ConfigFreeze`
- `InputFreeze`
- authoritative intake artifact hashes and placeholders
- ordered gate-decision lineage
- `execution_basis_hash`
- `deterministic_outcome_hash`
- historical post-seal basis hashes and placeholders when material
- `ReplayAttestation`

## Operator and auditor explanation contract

Replay explanation SHALL be available in both operator and auditor forms.

### Operator form

A concise explanation SHALL state:

- whether replay was exact, expectedly different, limited, or invalid
- whether the execution basis matched
- whether the material outcome matched
- what prevented exact comparison, if anything

### Auditor form

A detailed explanation SHALL additionally expose:

- the relevant manifest lineage edge
- the expected and actual basis hashes
- the expected and actual deterministic outcome hashes
- the mismatch inventory with materiality classification
- typed reason and limitation codes
- the retained artifact refs consulted during comparison

Whenever a replay comparison row or mismatch entry refers to a persisted outcome artifact such as a
decision bundle, evidence graph, twin view, filing packet, authority result, late-data basis, or
drift record, the attestation SHALL retain a non-null `component_ref` for that artifact whenever
the comparison is observable or corrupt. Hash equality alone is insufficient forensic linkage.

## Implementation shape

### Manifest construction

```text
cfg_freeze = resolve_or_inherit_config(...)
input_freeze = collect_or_inherit_input(...)
execution_basis_hash = compute_execution_basis_hash(cfg_freeze, input_freeze, manifest_context)
update_manifest_preseal_context(hash_set.execution_basis_hash = execution_basis_hash)
seal_manifest(...)
```

### Replay orchestration

```text
validate_replay_preconditions(source_manifest, child_manifest)
sealed_context = load_sealed_run_context(source_manifest)
post_seal_basis = load_frozen_post_seal_basis(source_manifest)
execute_replay_against_historical_basis(...)
```

### Historical comparison

```text
expected_basis = source_manifest.hash_set.execution_basis_hash
actual_basis = replay_manifest.hash_set.execution_basis_hash
expected_outcome = source_manifest.deterministic_outcome_hash
actual_outcome = compute_deterministic_outcome_hash(replay_outputs)
comparison = compare_replay_outcomes(...)
attestation = persist_replay_attestation(comparison)
```

### Integrity checks

Every load of a historical artifact SHALL verify:

- artifact presence
- recorded artifact type
- schema-bundle compatibility
- stored content hash
- decryption or key availability when required

### Deterministic golden-fixture boundary

The blocking deterministic and state-machine suite SHALL persist a first-class
`DeterministicGoldenPack` rather than relying on broad test-pass summaries alone. That artifact
SHALL freeze:

- candidate identity, schema bundle, and config bundle binding
- byte-stable module payload hashes plus explicit ordered null-slot coverage
- exact-decimal field expectations serialized as canonical decimal strings
- named state-machine tuples with previous state, current state, and transition event
- replay fixtures with expected `execution_basis_hash` and `deterministic_outcome_hash`
- deterministic retry/reconciliation cadence fixtures with `jitter_policy = NONE`

Release evidence MAY reference a deterministic suite result directly when the gate is red, but any
green deterministic gate SHALL retain the reviewed `DeterministicGoldenPack` ref so release
promotion, replay review, and later refactors all bind to one frozen fixture boundary.

## Non-negotiable prohibitions

The system SHALL reject the following as contract violations:

- exact replay with fresh source collection
- exact replay with fresh authority reads
- exact replay with fresh late-data scans
- exact replay with substituted config, formulas, or policies
- exact replay without `execution_basis_hash`
- persisted replay outcome without `deterministic_outcome_hash`
- replay comparison with no durable `ReplayAttestation`
