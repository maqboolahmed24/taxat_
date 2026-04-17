# Retention, Error, and Observability Contract

## Retention, error, and observability contract

This file is the authoritative integration contract for the retention/privacy, error/remediation, and
observability/audit subsystems. It does not replace the detailed owner specifications; it binds them
together so that expiry, erasure, blocking posture, remediation, and auditability remain coherent in
one legal/operational model.

Detailed ownership remains:

- `retention_and_privacy.md` for retention tagging inputs, expiry mechanics, legal-hold defaults, and privacy posture
- `error_model_and_remediation_model.md` for `ErrorRecord`, `RemediationTask`, `CompensationRecord`, `AcceptedRiskApproval`, `FailureInvestigation`, retry, remediation, and resolution semantics
- `observability_and_audit_contract.md` for traces, metrics, logs, audit events, correlation keys, and observability-vs-audit separation

Where these domains intersect, this file is authoritative for the coupling rules.

## 15.1 Contract composition and precedence

The engine SHALL treat retention, error handling, and observability as coupled control surfaces rather
than as independent documentation silos.

At minimum:

- no retention or privacy state change with operational impact may exist without a typed downstream error/remediation posture or an explicit statement that no error was opened
- no blocking or review-relevant retention condition may exist without the corresponding gate, audit, and correlation evidence
- no audit or telemetry artifact may describe a retention or privacy action that cannot be traced back to a sealed manifest, authority operation, or explicit erasure workflow context

If the owner specifications appear to disagree, the stricter rule SHALL win and the engine SHALL fail
closed with a typed object rather than choosing implicitly. In particular:

- audit-sufficiency and statutory-retention obligations outrank convenience deletion
- legal-hold constraints outrank routine erasure scheduling
- explicit privacy minimization rules outrank diagnostic logging convenience
- authority-state reconciliation outranks any attempt to erase or silently rewind already-observed legal state

## 15.2 Retention-state to error-state binding

Retention and privacy conditions that materially affect run behavior SHALL be serialized as typed
operational objects, not as passive notes only.

When expiry, erasure, legal hold, masking, or retention limitation affects an authoritative artifact or
required evidence path, the engine SHALL create one or more of:

- an `ErrorRecord` in family `RETENTION_ERROR` or `PRIVACY_ERROR`
- a `RemediationTask` when human, workflow, or scheduled action is required
- a `CompensationRecord` when already-progressed derived state must be preserved, limited, superseded, or reconciled rather than silently removed
- a `FailureInvestigation` when ambiguity, legal-state divergence, or multi-signal investigation must stay open as a typed case
- an `AcceptedRiskApproval` whenever the outcome is a bounded exception rather than direct correction

The minimum cross-domain linkage for such cases SHALL include:

- `manifest_id`
- `root_manifest_id`
- `error_id` when an error exists
- `retention_class`
- `affected_object_refs[]`
- `originating_activity_ref`
- `reason_codes[]`
- `authority_operation_ref` where the limitation affects authority-facing or authority-derived truth
- `workflow_item_id` or remediation task reference where follow-up work is opened

These links SHALL remain directly queryable on the typed companion object that carries the
operational outcome. In particular:

- `ErrorRecord` in family `RETENTION_ERROR` or `PRIVACY_ERROR` SHALL retain
  `artifact_retention_ref`, `retention_class`, and either `workflow_item_id` or a remediation-task
  reference rather than forcing operators to infer follow-up from prose notes
- `RemediationTask`, `CompensationRecord`, and `AcceptedRiskApproval` created from retention/privacy
  control flow SHALL retain `manifest_id`, `root_manifest_id`, and `artifact_retention_ref` so
  downstream readers do not have to reconstruct lineage solely through `error_id`; non-null
  `retention_class` on those artifacts SHALL therefore be illegal unless the exact
  `artifact_retention_ref` is present
- `FailureInvestigation.investigation_class = RETENTION_PRIVACY_EXCEPTION` SHALL retain
  `artifact_retention_ref` and `retention_class` so the exception branch stays bound to the same
  retention object that caused it
- FE-45 failure objects in retention/privacy flows SHALL also retain the shared
  `failure_resolution_contract{...}` basis so owner continuity, next action, and closure evidence
  do not fragment across error, remediation, compensation, investigation, and accepted-risk
  artifacts
- the persisted `FailureLifecycleDashboard` read model SHALL consume those typed objects, workflow
  refs, audit refs, and provenance refs directly rather than re-deriving lifecycle truth from logs
  or operator notes

For `RetentionTag` specifically:

- the tag SHALL carry the operative `effective_expiry_at` rather than forcing downstream controls to recompute it from partial basis
- `anchor_timestamp` SHALL remain the earliest retention-control timestamp, so `minimum_expiry_at`, `policy_expiry_at`, `effective_expiry_at`, `erasure_decided_at`, and `legal_hold_changed_at` cannot run backward past the anchor when present
- erasure-eligibility decisions SHALL carry `erasure_decided_at` and non-empty `erasure_reason_codes[]`
- non-`NONE` limitation posture SHALL carry non-empty `limitation_reason_codes[]`
- legal-hold posture SHALL preserve durable `legal_hold_ref` lineage, even after release, so blocking and release decisions remain auditable
- non-null `legal_hold_ref` or `legal_hold_changed_at` SHALL be impossible under `legal_hold_state = NONE`
- `BLOCKED_PROOF_PRESERVATION` and `BLOCKED_AUTHORITY_AMBIGUITY` SHALL carry explicit basis refs rather than passive explanation text

For `ArtifactRetention` specifically:

- `LEGAL_HOLD` and `ERASURE_PENDING` SHALL carry non-empty follow-up workflow refs and a concrete `next_checkpoint_at`
- `LIMITED` and `PSEUDONYMISED` SHALL carry explicit `limitation_behavior` and non-empty `limitation_reason_codes[]`
- `PSEUDONYMISED` and `ERASED` SHALL carry `erasure_request_ref`, `erasure_action_ref`, and `erasure_proof_ref`
- follow-up refs SHALL remain lifecycle-owned in both directions: pending hold or erasure states carry checkpoints/workflow, while limited and terminal erasure states SHALL NOT leak those pending-only control refs
- `effective_expiry_at` SHALL stay greater than or equal to both `minimum_expiry_at` and `policy_expiry_at`, and `last_evaluated_at` / `next_checkpoint_at` SHALL NOT predate `state_changed_at`
- `retention_tag_ref` and `retention_class` SHALL remain aligned with the canonical retention tag so lifecycle posture cannot drift into a local-only control plane

For `ErrorRecord` and `CompensationRecord` specifically:

- `first_seen_at`, `opened_at`, `last_seen_at`, `resolved_at`, `escalated_at`, and `next_retry_at` SHALL remain forward-only when present
- `ACCEPTED_RISK` lineage (`accepted_risk_approval_ref`, `accepted_risk_expires_at`) SHALL appear only on `resolution_state = ACCEPTED_RISK`
- scheduled automatic retry states SHALL carry `next_retry_at`, while `RECONCILE_THEN_RETRY` and `REBUILD_THEN_RETRY` SHALL additionally carry non-empty `retry_precondition_refs[]`
- `blocking_class = NON_BLOCKING` SHALL be incompatible with any `blocking_effects[].impact_level = BLOCKED`
- `CompensationRecord.compensated_at` SHALL NOT predate `created_at`, and verification or supersession refs SHALL remain aligned with `compensation_status`
- `ErrorRecord.remediation_owner_ref` SHALL be present whenever retention/privacy follow-up is not
  system-owned, and open non-terminal failures SHALL retain a lawful next path rather than sitting
  as orphaned typed debt
- `ErrorRecord.error_family in {RETENTION_ERROR, PRIVACY_ERROR}` SHALL carry
  `artifact_retention_ref`, `retention_class`, and either `workflow_item_id` or a remediation-task
  ref so material retention/privacy failures never collapse into free-text follow-up

Derived artifacts may survive underlying evidence expiry only when the surviving artifact records its
retention limitation and the provenance graph still resolves through an explicit expired/erased
placeholder rather than through a broken edge.

## 15.3 Gate and progression coupling

Retention and privacy posture SHALL participate directly in gate evaluation and downstream progression.
They SHALL NOT be reduced to UI-only warnings.

At minimum:

- evidence availability, directness, retention limitation, and erased-path conditions SHALL feed `RETENTION_EVIDENCE_GATE`
- a filing-critical erased path, missing admissible critical path, or lawful-use retention barrier SHALL become a gate-level blocking posture rather than a score-only degradation
- non-critical retention limitations MAY degrade trust, automation, or review posture, but they SHALL still surface through gate reason codes and auditable gate records
- later gates such as trust, filing, and submission SHALL consume the retention posture already established upstream and SHALL NOT downgrade an earlier retention-driven `HARD_BLOCK`
- a legal hold that prevents erasure SHALL be represented as a typed blocking effect such as `BLOCKS_ERASURE`, not as an operator note only

Any retention/privacy condition that changes a gate result SHALL produce a correlated triad:

- `GateEvaluated`
- `ErrorRecorded` when a typed failure exists
- the corresponding retention/privacy audit event family such as `RetentionLimited`, `LegalHoldApplied`, `ErasureRequested`, or `ErasureCompleted`

## 15.4 Correlation, visibility, and signal separation

Retention/error/observability integration SHALL preserve the split between operational telemetry and
append-only audit evidence while keeping the signals forensically joinable.

Whenever a retention or privacy condition has operational significance, the correlated trace/log/metric
and audit/error surfaces SHALL carry as many of the following as are applicable:

- `tenant_id`
- `client_id`
- `manifest_id`
- `root_manifest_id`
- `trace_id`
- `error_id`
- `retention_class`
- `gate_code`
- `workflow_item_id`
- `authority_operation_id`
- `service_name`
- `environment_ref`

Visibility and minimization rules SHALL also hold across domains:

- `customer_visibility_class` and `operator_visibility_class` on `ErrorRecord` SHALL align with masking and export policy
- sampled telemetry MAY omit high-volume runtime detail, but it SHALL NOT remove mandatory audit history
- audit payloads SHALL avoid unnecessary sensitive content and prefer stable refs, hashes, or masked fields where legal proof does not require raw values
- diagnostic logging SHALL NOT reintroduce personal or authority-secret data that retention/privacy policy would otherwise mask or minimize
- privacy-action query slices SHALL preserve deterministic audit ordering plus any supporting
  trace/log refs as secondary explanation only; logs or traces SHALL NOT become the proof of record
  for erasure, masking, legal-hold, or export decisions

## 15.5 Erasure, legal-hold, and proof-preservation invariants

The engine SHALL preserve proof of what happened even when it deletes or pseudonymizes eligible
content.

Minimum invariants:

- `ErasureRequested`, `LegalHoldApplied`, `LegalHoldReleased`, and `ErasureCompleted` SHALL be auditable event families
- no erasure may proceed while an applicable legal hold remains unresolved
- no erasure may destroy the append-only proof that the erasure request, decision basis, and execution outcome occurred
- no authority-facing history ambiguity may be resolved by deletion; where ambiguity exists, the remediation path is reconciliation, not history erasure
- surviving derived artifacts and provenance structures SHALL point to explicit expired/erased placeholders or limitation notes so reviewers can distinguish lawful absence from data loss or corruption
- no completed pseudonymisation or erasure state without durable request/action/proof linkage
- no pending hold or erasure state without a bounded review checkpoint

If erasure is blocked by legal hold, statutory baseline, unresolved authority state, or missing proof
preconditions, the engine SHALL fail closed with a typed retention/privacy error and, where action is
required, open remediation such as `CHECK_RETENTION_HOLD` rather than completing partial cleanup.

## 15.6 One-sentence summary

This contract ensures that retention and privacy actions, structured failures, remediation work, and
observability/audit signals behave as one coherent control plane, so nothing expires, erases, blocks,
or degrades invisibly.
