# Retention & Privacy

## Retention and privacy

This file defines the owner-level retention and privacy contract for the pack: how artifacts are
tagged, how expiry and erasure affect surviving explainability, how legal hold constrains deletion,
and what privacy-preserving defaults apply to storage, views, exports, and diagnostics.

Cross-domain coupling to error/remediation and observability/audit is defined in
`retention_error_and_observability_contract.md`. This file remains authoritative for the retention tag
shape, expiry/erasure behavior, and privacy-default posture itself.

## Retention tag contract

Every authoritative artifact and every evidence-bearing object SHALL carry a first-class
`RetentionTag`.

The canonical persisted field set is:

- `artifact_type`
- `retention_tag_id`
- `retention_class`
- `anchor_event`
- `anchor_timestamp`
- `minimum_expiry_at`
- `policy_expiry_at`
- `effective_expiry_at`
- `legal_hold_state`
- `legal_hold_ref`
- `legal_hold_changed_at`
- `erasure_eligibility`
- `erasure_decided_at`
- `erasure_reason_codes[]`
- `pseudonymisation_mode`
- `limitation_behavior`
- `limitation_reason_codes[]`
- `retention_basis_ref`
- `proof_preservation_basis_ref`
- `authority_ambiguity_ref`

`retention_class` SHALL distinguish at minimum whether the object is a regulated record, derived
artifact, operational log, analytics projection, or another policy-governed class.

`effective_expiry_at` SHALL carry the operative retention deadline after minimum and policy basis are
resolved. Legal-hold posture SHALL preserve durable hold lineage rather than a bare state enum.
Erasure eligibility SHALL preserve both decision time and reason codes, and blocked proof-preservation
or authority-ambiguity outcomes SHALL carry explicit anchor refs rather than prose-only explanations.
`anchor_timestamp` SHALL remain the earliest retention-control timestamp, so expiry thresholds and
decision timestamps never run backward past the retained anchor. Non-null `legal_hold_ref` or
`legal_hold_changed_at` SHALL be impossible when `legal_hold_state = NONE`, and non-null
`proof_preservation_basis_ref` or `authority_ambiguity_ref` SHALL stay bound to the matching blocked
`erasure_eligibility` posture.

Legacy shorthand such as a single `expires_at`, a boolean `legal_hold`, or a free-form
`erasure_constraints` note SHALL NOT be treated as the canonical retention model for persisted
objects.

## Artifact retention contract

Every governed artifact with first-class retention control SHALL also carry a first-class
`ArtifactRetention` object that records the live lifecycle result of the retention tag and workflow.

The canonical persisted field set is:

- `artifact_type`
- `retention_scope_class`
- `retention_id`
- `tenant_id`
- `artifact_ref`
- `retention_tag_ref`
- `retention_class`
- `lifecycle_state`
- `minimum_expiry_at`
- `policy_expiry_at`
- `effective_expiry_at`
- `state_changed_at`
- `last_evaluated_at`
- `hold_ref`
- `next_checkpoint_at`
- `workflow_item_refs[]`
- `limitation_behavior`
- `limitation_reason_codes[]`
- `erasure_request_ref`
- `erasure_action_ref`
- `erasure_proof_ref`

`ArtifactRetention` SHALL stay bound to the canonical `RetentionTag` rather than restating a weaker
owner-local shorthand. Pending hold or erasure states SHALL carry follow-up references and review
checkpoints, surviving limited or pseudonymised states SHALL carry explicit limitation semantics, and
completed erasure outcomes SHALL carry append-only proof linkage.
Those lifecycle bindings are bidirectional: pending checkpoint/workflow refs SHALL stay limited to
`LEGAL_HOLD` or `ERASURE_PENDING`, limitation refs SHALL stay limited to `LIMITED` or
`PSEUDONYMISED`, and erasure request/action/proof refs SHALL stay limited to erasure-bearing end
states. `effective_expiry_at` SHALL additionally stay greater than or equal to both
`minimum_expiry_at` and `policy_expiry_at`, and evaluation/checkpoint timestamps SHALL not predate
`state_changed_at`.

## Expiry and limitation behavior

Expiry or policy-driven erasure of underlying evidence SHALL not create silent gaps in surviving
artifacts.

When underlying evidence expires or is pseudonymized:

- derived artifacts MAY remain only if their retention class allows survival after upstream expiry
- surviving artifacts MUST record explicit limitation notes rather than implying full evidentiary availability
- provenance paths MUST resolve through explicit expired/erased placeholders or limitation nodes, not through broken or missing links
- expired history MUST NOT be silently treated as zero, absent disagreement, or proof of non-occurrence
- if filing-critical support is no longer admissible, downstream retention/trust gating MUST re-evaluate the artifact rather than allowing stale readiness to persist

This preserves lawful explainability even when direct support is no longer fully present.

## Quantitative survivability and privacy-preserving projection

Qualitative limitation prose is not sufficient for deterministic replay, trust degradation, or
lawful projection. Every retained, limited, masked, pseudonymised, expired, or erased support
object SHALL admit frozen quantitative semantics.

For any governed object `o` that can appear on a decisive evidence path, define:

- `decision_information_ratio(o) in [0,1]`, the fraction of original decision-relevant information that remains lawfully retained after expiry, minimisation, pseudonymisation, or erasure
- `projection_information_ratio(o) in [0,1]`, the fraction of original decision-relevant information visible in the active authorized projection after masking or export policy
- `projection_information_ratio(o) <= decision_information_ratio(o)`; otherwise emit `PRIVACY_PROJECTION_RATIO_INVALID`
- `limitation_explicitness(o) in [0,1]`, the fraction of any lost or limited state covered by typed limitation, omission, or tombstone semantics with non-empty reason codes
- `silent_ambiguity(o) = 1 - limitation_explicitness(o)`
- `survivability(o) = clamp01(decision_information_ratio(o) * limitation_explicitness(o))`
- `projection_fidelity(o) = 0 if decision_information_ratio(o) = 0 else clamp01(projection_information_ratio(o) / decision_information_ratio(o))`

Default survivability thresholds for decisive artifacts and proof-path segments are:

- `τ_submit = 0.80`
- `τ_review = 0.45`
- `τ_audit = 0.15`

Then:

- an artifact may remain controlling filing or authority-facing proof only when `survivability(o) >= τ_submit` and `silent_ambiguity(o) = 0`
- an artifact may remain review-capable but non-automating when `τ_review <= survivability(o) < τ_submit` and `silent_ambiguity(o) = 0`
- an artifact may remain audit or tombstone only when `τ_audit <= survivability(o) < τ_review` and `silent_ambiguity(o) = 0`
- if `survivability(o) < τ_audit` or `silent_ambiguity(o) > 0`, the artifact SHALL NOT remain controlling proof; only erasure-proof lineage, lawful tombstones, and bounded audit metadata may survive

Silent ambiguity around limited data is a structural defect, not a soft warning. A limited or erased
object with no typed limitation or tombstone semantics SHALL open a typed retention or privacy error
and SHALL block filing-capable progression until the ambiguity is repaired or the affected object is
formally excluded as `NOT_APPLICABLE`.

Masking is a projection transform, not evidence destruction. When a projection narrows visible
content, the system SHALL preserve authoritative ref or hash lineage, SHALL emit typed omission or
limitation entries, and SHALL NOT serialize hidden values as zero, false, empty string, or proof of
non-occurrence. Any user-visible confidence or explanation-strength cue SHALL be degraded by
`projection_fidelity(o)` relative to the retained decision-side confidence; masking SHALL never
overstate certainty.

## Erasure and legal-hold workflow

Erasure is a governed workflow, not an unconditional delete operation.

The minimum workflow is:

1. record `ErasureRequested`
2. resolve statutory constraints, retention basis, and legal-hold posture
3. derive `erasure_eligibility` per affected object class
4. delete or pseudonymize only eligible evidence/content
5. preserve lawful surviving derived artifacts with explicit limitation behavior
6. emit `ErasureCompleted` only after the execution outcome and proof artifacts are durable

The engine SHALL fail closed for erasure when:

- an applicable legal hold remains unresolved
- statutory minimum retention has not been satisfied
- proof-preservation preconditions are missing
- authority-facing history ambiguity would be obscured by deletion

No erasure may destroy the append-only proof that the request, decision basis, and execution outcome
occurred. Where eligible content is removed, the system SHALL preserve an erasure-proof trail and keep
surviving lineage readable through explicit placeholders or limitation notes.

## Privacy and minimization defaults

Privacy defaults SHALL be protective by default rather than permissive by accident.

At minimum:

- authority login credentials SHALL NOT be stored; only the minimum encrypted token/binding material needed for lawful operation may persist
- object payloads containing sensitive client or authority data SHALL use per-tenant keying or equivalent envelope-encryption controls
- storage, projection, and export paths SHALL retain the least data needed for evidence, traceability, and lawful replay
- sensitive views and exports SHALL prefer masking by default and SHALL reveal raw values only when the caller, purpose, and policy allow it
- logs, traces, and audit payloads SHALL prefer stable refs, hashes, masked values, or summaries where raw sensitive content is not legally required
- diagnostic tooling SHALL NOT reintroduce data that privacy or masking policy would otherwise hide

Privacy posture SHALL align with visibility controls used elsewhere in the pack, including customer and
operator visibility distinctions where a retention/privacy condition affects who may see what.

## Retention and privacy event requirements

Retention/privacy owner behavior SHALL be externally observable through explicit event families rather
than inferred from missing data.

At minimum, the following events SHALL exist where applicable:

- `RetentionApplied`
- `RetentionLimited`
- `LegalHoldApplied`
- `LegalHoldReleased`
- `ErasureRequested`
- `ErasureCompleted`
- `SensitiveViewOpened`
- `MaskedExportProduced`

These events SHALL be treated as first-class owner-level requirements for the retention/privacy
domain. Detailed correlation keys, audit payload rules, and typed downstream error/remediation binding
are defined in the integration contract and observability contract.

`RetentionTag`, `ArtifactRetention`, and `ErasureProof` SHALL validate against their dedicated JSON
schemas in `schemas/`: `retention_tag.schema.json`, `artifact_retention.schema.json`, and
`erasure_proof.schema.json`.

## Proof-bundle retention semantics

`ProofBundle` and target-level support assessments are retained explainability artifacts, not merely
viewer caches.

Where underlying direct evidence expires or is erased, the system SHALL preserve enough retained
structure to prove one of the following explicitly:

- the proof remains replayable from retained evidence;
- the proof remains structurally replayable through lawful tombstones and limitation entries; or
- the proof is no longer replayable and filing posture must degrade.

The system SHALL NOT preserve a filing-capable `ProofBundle` whose `bundle_hash` or decisive path refs
can no longer be verified while still presenting it as active controlling proof. A `ProofBundle` MAY
remain the active controlling proof only while every decisive path segment meets the relevant
survivability threshold and no decisive limitation is silent. If a bundle is retained only for
review or audit continuity, its support or admissibility posture SHALL downgrade accordingly and the
limitation SHALL remain explicit in the render path. `ProofBundle`, `EvidenceGraph`, and
`EnquiryPack` SHALL therefore carry the shared
`retention_limited_explainability_contract{...}` boundary so tombstoned, pseudonymised, or erased
decisive support degrades explainability deterministically instead of disappearing.

## Basis-preserving retention for replay

Retention policy SHALL preserve the minimum replay and audit basis for the full lawful review window
of every material run. At minimum, the system SHALL retain or preserve limitation placeholders for:

- `RunManifest`, `ConfigFreeze`, `InputFreeze`, and authoritative intake set hashes
- `hash_set.execution_basis_hash`
- `decision_bundle_hash` and `deterministic_outcome_hash`
- ordered `GateDecisionRecord` lineage
- historical authority-basis and late-data-monitor refs when they materially affected the decision
- `ReplayAttestation` once a replay child has been compared

Where payload minimization or erasure removes underlying content, replay SHALL surface
`RETENTION_LIMITED` or an equivalent limitation code. Retention MUST NOT rewrite basis hashes, swap in
newer content, silently collapse an unavailable historical artifact into "not applicable," or
preserve a silent ambiguity about whether supporting history was hidden, erased, or never present.
