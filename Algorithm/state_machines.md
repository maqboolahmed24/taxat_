# State Machines

## State machines

The engine SHALL define formal state machines for all material artifacts and control objects. A status
string without allowed transitions is not a state machine.

HMRC's current MTD journey is explicitly staged: quarterly updates are submitted every 3 months for
each relevant income source, year-end completion includes a final declaration through software, and
amendments after final declaration are only available once final declaration has been completed and
within the HMRC amendment window. That is why the engine needs formal internal states for obligations,
filing, authority acknowledgement, and amendment eligibility rather than generic "done/not done"
fields. [1]

## 6.1 Global state-machine rules

All state machines SHALL obey these rules:

1. every object has exactly one active lifecycle state at any time;
2. transitions occur only through named events;
3. every transition writes an audit event with `manifest_id` or equivalent lineage;
4. authority-originated transitions outrank tenant-originated assumptions where legal state is involved;
5. supersession creates a new object or new manifest relation, not silent in-place reinterpretation;
6. retention/erasure never deletes the fact that a transition occurred;
7. any preseal gate evaluation that governs manifest sealing SHALL be represented explicitly rather
   than hidden as unnamed procedural state.
7. compliance-mode objects may not inherit analysis-mode states;
8. illegal transitions SHALL fail closed.

### Persisted coverage map

| Object family | Schema | State field | Shared transition contract |
| --- | --- | --- | --- |
| `RunManifest` | `schemas/run_manifest.schema.json` | `lifecycle_state` | `RUN_MANIFEST_LIFECYCLE_V1` |
| `NightlyBatchRun` | `schemas/nightly_batch_run.schema.json` | `lifecycle_state` | `NIGHTLY_BATCH_RUN_LIFECYCLE_V1` |
| `ConfigVersion` | `schemas/config_version.schema.json` | `lifecycle_state` | `CONFIG_VERSION_LIFECYCLE_V1` |
| `ConfigChangeRequest` | `schemas/config_change_request.schema.json` | `lifecycle_state` | `CONFIG_CHANGE_REQUEST_LIFECYCLE_V1` |
| `SourceCollectionRun` | `schemas/source_collection_run.schema.json` | `lifecycle_state` | `SOURCE_COLLECTION_RUN_LIFECYCLE_V1` |
| `Snapshot` | `schemas/snapshot.schema.json` | `lifecycle_state` | `SNAPSHOT_LIFECYCLE_V1` |
| `WorkflowItem` | `schemas/workflow_item.schema.json` | `lifecycle_state` | `WORKFLOW_ITEM_LIFECYCLE_V1` |
| `FilingPacket` | `schemas/filing_packet.schema.json` | `lifecycle_state` | `FILING_PACKET_LIFECYCLE_V1` |
| `SubmissionRecord` | `schemas/submission_record.schema.json` | `lifecycle_state` | `SUBMISSION_RECORD_LIFECYCLE_V1` |
| `FilingCase` | `schemas/filing_case.schema.json` | `lifecycle_state` | `FILING_CASE_LIFECYCLE_V1` |
| `RecoveryCheckpoint` | `schemas/recovery_checkpoint.schema.json` | `checkpoint_state` | `RECOVERY_CHECKPOINT_LIFECYCLE_V1` |
| `SchemaMigrationLedger` | `schemas/schema_migration_ledger.schema.json` | `phase_state` | `SCHEMA_MIGRATION_LEDGER_PHASE_V1` |
| `DeploymentRelease` | `schemas/deployment_release.schema.json` | `rollout_state` | `DEPLOYMENT_RELEASE_ROLLOUT_V1` |
| `ReleaseVerificationManifest` | `schemas/release_verification_manifest.schema.json` | `decision_state` | `RELEASE_VERIFICATION_MANIFEST_DECISION_V1` |

---

## 6.2 `RunManifest.lifecycle_state`

### States

- `ALLOCATED`
- `FROZEN`
- `SEALED`
- `IN_PROGRESS`
- `COMPLETED`
- `BLOCKED`
- `FAILED`
- `SUPERSEDED`
- `REPLAY_ONLY`
- `RETIRED`

### Allowed transitions

- `ALLOCATED --freeze_success--> FROZEN`
- `ALLOCATED --freeze_blocked--> BLOCKED`
- `ALLOCATED --system_fault--> BLOCKED`
- `FROZEN --seal_success--> SEALED`
- `FROZEN --seal_blocked--> BLOCKED`
- `FROZEN --system_fault--> BLOCKED`
- `SEALED --run_started--> IN_PROGRESS`
- `SEALED --system_fault--> BLOCKED`
- `IN_PROGRESS --run_completed--> COMPLETED`
- `IN_PROGRESS --gate_block--> BLOCKED`
- `IN_PROGRESS --system_fault--> FAILED`
- `COMPLETED --superseded_by_new_manifest--> SUPERSEDED`
- `COMPLETED --replay_designation--> REPLAY_ONLY`
- `SUPERSEDED --retention_expiry--> RETIRED`
- `REPLAY_ONLY --retention_expiry--> RETIRED`

### Rules

- no outputs may be attached before `SEALED`
- no filing packet may be built before `SEALED`
- pre-start system faults SHALL finalize as `BLOCKED`, not as silently abandoned manifests
- material invariant failures SHALL bind `invariant_enforcement_contract{ failure_stage_or_null, terminal_manifest_state_or_null, terminal_audit_event_type_or_null }`; pre-start failures, including while `SEALED`, map to `ManifestBlocked`, while post-start failures map to `ManifestFailed`
- `FROZEN --seal_success--> SEALED` SHALL persist one authoritative `preseal_gate_evaluation`
  contract so the immutable pre-seal gate chain, required gate order, and exact execution basis do
  not have to be reconstructed from adjacent gate records after the fact
- review-required runs still use `run_completed`; review posture is expressed through gates/workflow and `DecisionBundle.decision_status`, not a separate manifest lifecycle state
- `COMPLETED` therefore covers both clean-complete runs and review-required-complete runs; callers SHALL inspect the `DecisionBundle` and gate chain for outcome posture
- same-request retry against a terminal manifest SHALL reload the persisted `DecisionBundle`; it SHALL NOT allocate a continuation child merely because continuation would otherwise be legal
- replay of a completed manifest SHALL create a child replay manifest; the completed manifest itself is not reopened
- a recovery child for an already-started attempt SHALL NOT be allocated while an active start lease still exists for the same attempt lineage
- `BLOCKED` is terminal for the run instance
- `FAILED` is terminal for the run instance

---

## 6.2A `NightlyBatchRun.lifecycle_state`

### States

- `ALLOCATED`
- `SELECTING`
- `PLANNED`
- `RUNNING`
- `QUIESCING`
- `COMPLETED`
- `COMPLETED_WITH_FAILURES`
- `BLOCKED`
- `FAILED`
- `ABANDONED`

### Allowed transitions

- `ALLOCATED --selection_started--> SELECTING`
- `ALLOCATED --global_block--> BLOCKED`
- `ALLOCATED --system_fault--> FAILED`
- `SELECTING --selection_completed--> PLANNED`
- `SELECTING --global_block--> BLOCKED`
- `SELECTING --system_fault--> FAILED`
- `PLANNED --batch_started--> RUNNING`
- `PLANNED --global_block--> BLOCKED`
- `PLANNED --system_fault--> FAILED`
- `RUNNING --quiescence_reached--> QUIESCING`
- `RUNNING --global_block--> BLOCKED`
- `RUNNING --system_fault--> FAILED`
- `RUNNING --reclaimed_by_successor--> ABANDONED`
- `QUIESCING --batch_completed_clean--> COMPLETED`
- `QUIESCING --batch_completed_with_failures--> COMPLETED_WITH_FAILURES`
- `QUIESCING --system_fault--> FAILED`
- `QUIESCING --reclaimed_by_successor--> ABANDONED`
- `BLOCKED --reclaimed_by_successor--> ABANDONED`
- `FAILED --reclaimed_by_successor--> ABANDONED`

### Rules

- exactly one active batch for the same `tenant_id` and `nightly_window_key` may exist unless the
  earlier batch has already reached `ABANDONED`;
- `SELECTING` SHALL end only after every candidate in the frozen selection universe has one explicit
  persisted disposition;
- `RUNNING` SHALL permit per-client failure without forcing an immediate batch-level `FAILED` state;
- `RUNNING` SHALL additionally obey a finite progress potential so retries, reconciliation, and
  stale-run recovery cannot legally livelock inside the same nightly window;
- shard-local failure or reclaim SHALL retain explicit blocked-entry and reason-code lineage so
  unrelated selected clients preserve their own explainable nightly posture;
- `QUIESCING` SHALL mean that every selected entry reached a terminal or handoff-safe state and that
  no more autonomous work is legally runnable in the current batch window;
- `COMPLETED_WITH_FAILURES` SHALL require explicit accounting for deferred, escalated, blocked, or
  failed client outcomes;
- `FAILED` is reserved for control-plane failure that prevents trustworthy aggregation, recovery, or
  digest publication; and
- `ABANDONED` SHALL require explicit successor-batch linkage so stale-batch recovery never looks like a
  silent disappearance.

---

## 6.2B `ExperienceCursor.cursor_state` and `WorkspaceCursor.cursor_state`

### States

- `LIVE`
- `REBASED`
- `CLOSED`
- `REVOKED`
- `EXPIRED`

### Allowed transitions

- `LIVE --epoch_advanced--> REBASED`
- `LIVE --history_compacted--> REBASED`
- `LIVE --shell_stability_changed--> REBASED`
- `LIVE --route_context_changed--> REBASED`
- `LIVE --session_revoked--> REVOKED`
- `LIVE --session_binding_changed--> REVOKED`
- `LIVE --access_binding_changed--> REVOKED`
- `LIVE --masking_posture_changed--> REVOKED`
- `LIVE --schema_incompatible--> REVOKED`
- `LIVE --client_closed--> CLOSED`
- `LIVE --ttl_elapsed--> EXPIRED`

### Rules

- manifest and workspace cursors SHALL bind to one exact route key, one mounted subject, one shell
  stability token, one session lineage, one access-binding hash, and one masking-context hash
- `LIVE` is legal only while the paired `stream_recovery_contract.delivery_window_state =
  LIVE_RESUMABLE`
- `LIVE` cursors SHALL NOT acknowledge past `last_published_sequence`
- if `compaction_floor_sequence_or_null` is non-null, a cursor whose `last_ack_sequence` is smaller
  SHALL transition to `REBASED`; it SHALL NOT remain live against history it can no longer lawfully
  resume
- event application under a live cursor SHALL remain strictly monotonic and gap-free within one
  epoch, and duplicates SHALL remain idempotent by `(stream_scope_class, subject_ref, frame_epoch,
  sequence)`
- catch-up SHALL complete before live delivery is treated as current
- `REBASED`, `CLOSED`, `REVOKED`, and `EXPIRED` are terminal posture records for that persisted
  cursor; recovery allocates or returns a successor cursor rather than reopening the old one

---

## 6.3 `ConfigVersion.lifecycle_state`

### States

- `DRAFT`
- `CANDIDATE`
- `VERIFIED`
- `APPROVED`
- `DEPRECATED`
- `REVOKED`
- `RETIRED`

### Allowed transitions

- `DRAFT --submit_for_test--> CANDIDATE`
- `CANDIDATE --verification_pass--> VERIFIED`
- `VERIFIED --approval_granted--> APPROVED`
- `APPROVED --replacement_approved--> DEPRECATED`
- `APPROVED --urgent_withdrawal--> REVOKED`
- `DEPRECATED --retired--> RETIRED`
- `REVOKED --retired--> RETIRED`

### Rules

- new compliance runs may freeze only `APPROVED`
- historical replay may reference `DEPRECATED` or `REVOKED` if that was the frozen state at original run time
- `REVOKED` cannot be used for new filing or amendment runs

---

## 6.4 `ConfigChangeRequest.lifecycle_state`

### States

- `OPEN`
- `UNDER_REVIEW`
- `TESTING`
- `APPROVED`
- `REJECTED`
- `IMPLEMENTED`
- `ROLLED_BACK`

### Allowed transitions

- `OPEN --assigned--> UNDER_REVIEW`
- `UNDER_REVIEW --sent_to_test--> TESTING`
- `TESTING --pass--> APPROVED`
- `TESTING --fail--> REJECTED`
- `APPROVED --deployed--> IMPLEMENTED`
- `IMPLEMENTED --rollback--> ROLLED_BACK`

### Rules

- every compliance-relevant config version SHALL reference one CCR lineage
- rollback never mutates the old approved version; it introduces a superseding state

---

## 6.5 `SourceCollectionRun.lifecycle_state`

### States

- `NOT_STARTED`
- `FETCHING`
- `FETCHED`
- `PARTIAL`
- `FAILED`
- `ABANDONED`

### Allowed transitions

- `NOT_STARTED --fetch_begin--> FETCHING`
- `FETCHING --all_sources_returned--> FETCHED`
- `FETCHING --some_sources_returned_with_gaps--> PARTIAL`
- `FETCHING --fatal_provider_failure--> FAILED`
- `PARTIAL --operator_abort--> ABANDONED`

### Rules

- `PARTIAL` may still permit snapshot build
- `FAILED` does not imply system failure; it may lead to a blocked manifest or degraded analysis branch

---

## 6.6 `Snapshot.lifecycle_state`

### States

- `BUILT`
- `VALID`
- `WARNED`
- `INVALID`
- `SUPERSEDED`
- `RETENTION_LIMITED`
- `ERASED`

### Allowed transitions

- `BUILT --validation_pass--> VALID`
- `BUILT --validation_warn--> WARNED`
- `BUILT --validation_fail--> INVALID`
- `VALID --newer_snapshot_for_same_scope--> SUPERSEDED`
- `WARNED --newer_snapshot_for_same_scope--> SUPERSEDED`
- `VALID --retention_loss_detected--> RETENTION_LIMITED`
- `WARNED --retention_loss_detected--> RETENTION_LIMITED`
- `RETENTION_LIMITED --erasure_complete--> ERASED`

### Rules

- snapshot build progress before artifact persistence is represented by stage execution and manifest
  observability, not by a persisted `Snapshot.lifecycle_state`
- `INVALID` snapshots may exist for audit, but may not support compliance compute
- `WARNED` snapshots may support compute depending on gate policy

---

## 6.7 `EvidenceItem.lifecycle_state`

### States

- `CAPTURED`
- `EXTRACTED`
- `LINKED`
- `SUPPORTED`
- `CONTESTED`
- `SUPERSEDED`
- `LIMITED`
- `ERASED`

### Allowed transitions

- `CAPTURED --extraction_complete--> EXTRACTED`
- `EXTRACTED --lineage_bound--> LINKED`
- `LINKED --accepted_as_support--> SUPPORTED`
- `SUPPORTED --challenge_raised--> CONTESTED`
- `SUPPORTED --newer_better_evidence--> SUPERSEDED`
- `SUPPORTED --retention_limitation--> LIMITED`
- `LIMITED --erasure_complete--> ERASED`

### Rules

- documentary evidence may remain `LINKED` or `SUPPORTED` without becoming a canonical fact itself
- `CONTESTED` evidence does not vanish; it remains auditable

---

## 6.8 `CanonicalFact.promotion_state`

### States

- `CANDIDATE`
- `PROVISIONAL`
- `CANONICAL`
- `CONTESTED`
- `SUPERSEDED`
- `RETIRED`

### Allowed transitions

- `CANDIDATE --promotion_threshold_not_met--> PROVISIONAL`
- `CANDIDATE --promotion_threshold_met--> CANONICAL`
- `PROVISIONAL --stronger_support_added--> CANONICAL`
- `CANONICAL --conflict_detected--> CONTESTED`
- `CONTESTED --resolution_to_current_fact--> CANONICAL`
- `CANONICAL --replaced_by_newer_fact--> SUPERSEDED`
- `SUPERSEDED --retention_expiry--> RETIRED`

### Rules

- only `CANONICAL` facts may drive compliance compute
- `PROVISIONAL` facts may drive analysis if policy allows
- inference alone may not create legal submission state

---

## 6.9 `ComputeResult.lifecycle_state`

### States

- `NOT_RUN`
- `RUNNING`
- `COMPUTED`
- `BLOCKED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_RUN --compute_start--> RUNNING`
- `RUNNING --compute_success--> COMPUTED`
- `RUNNING --data_or_policy_block--> BLOCKED`
- `COMPUTED --newer_manifest_compute--> SUPERSEDED`

### Rules

- forecast artifacts SHALL never promote a compliance result in place
- a blocked compute may still produce diagnostic artifacts

---

## 6.10 `ParityResult.lifecycle_state` and `parity_classification`

### Lifecycle states

- `NOT_EVALUATED`
- `EVALUATED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_EVALUATED --parity_complete--> EVALUATED`
- `EVALUATED --newer_parity_run--> SUPERSEDED`

### Required semantic classifications

- `MATCH`
- `MINOR_DIFFERENCE`
- `MATERIAL_DIFFERENCE`
- `BLOCKING_DIFFERENCE`
- `NOT_COMPARABLE`

### Rules

- lifecycle state tells whether parity exists
- classification tells what parity means
- classification must never be overwritten silently; a new parity result supersedes the old one

---

## 6.11 `TrustSummary.lifecycle_state`, `trust_input_state`, `score_band`, `cap_band`, `upstream_gate_cap`, `trust_band`, `trust_level`, `automation_level`, `threshold_stability_state`, and `filing_readiness`

### Lifecycle states

- `SYNTHESIZED`
- `SUPERSEDED`

### Trust-input states

- `ADMISSIBLE_CURRENT`
- `ADMISSIBLE_STALE`
- `INCOMPLETE`
- `CONTRADICTED`

### Trust bands

- `INSUFFICIENT_DATA`
- `RED`
- `AMBER`
- `GREEN`

### Score bands

- `RED`
- `AMBER`
- `GREEN`

### Upstream gate cap

- `AUTO_ELIGIBLE`
- `NOTICE_ONLY`
- `REVIEW_ONLY`
- `BLOCKED`

### Projected trust levels

- `READY`
- `REVIEW_REQUIRED`
- `BLOCKED`

### Automation levels

- `ALLOWED`
- `LIMITED`
- `BLOCKED`

### Threshold stability states

- `STABLE`
- `EDGE_REVIEW`

### Filing readiness

- `NOT_READY`
- `READY_REVIEW`
- `READY_TO_SUBMIT`

### Allowed transitions

- `SYNTHESIZED --newer_inputs_or_overrides--> SUPERSEDED`
- `SYNTHESIZED --late_data_or_authority_change--> SUPERSEDED`
- `SYNTHESIZED --amendment_or_baseline_change--> SUPERSEDED`

### Rules

- trust absence before synthesis is represented by a missing artifact or incomplete stage state, not
  by a persisted `TrustSummary.lifecycle_state = NOT_SYNTHESIZED`
- trust band is machine-facing; trust level is the projected human-facing posture
- `score_band` is the numeric score-only classification; `cap_band` is the non-score legal ceiling;
  `trust_band` is the persisted most-restrictive result of those two bands
- `trust_input_basis_contract` is the typed admissibility/currentness boundary; it freezes whether
  trust inputs were complete, current, contradicted, stale, authority-limited, or human-step-limited
  and publishes the maximum lawful `automation_level` / `filing_readiness` before score/risk caps;
  when baseline selection itself is limiting, it also retains the baseline-selection hash and
  baseline-derived automation ceiling instead of flattening that limit into a generic authority score
- `trust_sensitivity_analysis_contract` is the persisted threshold-introspection boundary; it freezes
  the current score-versus-cap relation, active guard-band triggers, and the canonical six probe
  results so review, replay, and policy tuning do not infer threshold fragility from local math
- trust is derived, not manually edited
- `trust_input_state = ADMISSIBLE_STALE` MAY remain reviewable, but it SHALL cap automation below
  `ALLOWED` and filing readiness below `READY_TO_SUBMIT`
- `trust_input_state in {INCOMPLETE, CONTRADICTED}` SHALL cap trust at `INSUFFICIENT_DATA`
- `threshold_stability_state = EDGE_REVIEW` SHALL cap trust at most `AMBER` and SHALL prevent
  `READY_TO_SUBMIT`
- `threshold_stability_state = EDGE_REVIEW` SHALL also require non-empty
  `trust_sensitivity_analysis_contract.edge_trigger_codes[]`; `STABLE` SHALL clear them
- the persisted trust posture SHALL obey the exact bridge:
  - `automation_level = ALLOWED` iff `filing_readiness = READY_TO_SUBMIT`
  - `automation_level = LIMITED` iff `filing_readiness = READY_REVIEW`
  - `automation_level = BLOCKED` iff `filing_readiness = NOT_READY`
- `trust_band = GREEN` is legal only when the current trust posture is submission-capable under the
  frozen trust formulas; analysis mode, upstream review/block posture, or risk below the automation
  threshold SHALL cap the band at most `AMBER`
- `TrustSummary.filing_readiness` is a trust-stage upper bound on legal progression; later
  `AMENDMENT_GATE`, `FILING_GATE`, and `SUBMISSION_GATE` may only reduce that posture, never raise it
- `TrustSummary.automation_level` and `TrustSummary.filing_readiness` SHALL also remain less than or
  equal to `trust_input_basis_contract.automation_ceiling` and
  `trust_input_basis_contract.filing_readiness_ceiling`
- `upstream_gate_cap = REVIEW_ONLY` or `BLOCKED` SHALL be persisted directly on `TrustSummary`; downstream
  trust gates, filing cases, nightly selectors, and action surfaces SHALL consume that cap instead of
  re-deriving it from raw upstream gate arrays
- overrides may influence trust synthesis, but they do not mutate the old trust artifact in place
- any later late-data monitor result, authority-state update, authority-correction baseline,
  amendment-baseline change, or override lifecycle change that would alter trust inputs SHALL
  supersede the old trust instead of silently reusing it

---

## 6.12 `EvidenceGraph.lifecycle_state`

### States

- `NOT_BUILT`
- `BUILDING`
- `BUILT`
- `LIMITED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_BUILT --graph_start--> BUILDING`
- `BUILDING --graph_complete--> BUILT`
- `BUILT --retention_limitation--> LIMITED`
- `BUILT --newer_graph--> SUPERSEDED`

### Rules

- graph quality degradation from retention loss moves state to `LIMITED`, not "missing"
- `LIMITED` graphs must still explain their own limitations

---

## 6.13 `TwinView.lifecycle_state`

### States

- `NOT_BUILT`
- `BUILT`
- `STALE`
- `SUPERSEDED`

### Allowed transitions

- `NOT_BUILT --twin_complete--> BUILT`
- `BUILT --source_authority_baseline_or_reconciliation_change--> STALE`
- `STALE --refresh_complete--> BUILT`
- `BUILT --newer_manifest_twin--> SUPERSEDED`
- `STALE --newer_manifest_twin--> SUPERSEDED`

### Rules

- `NOT_BUILT` twins SHALL NOT carry live state-snapshot, timeline, mismatch-summary, readiness,
  reconciliation, interpretation, or parity refs
- `BUILT`, `STALE`, and `SUPERSEDED` twins SHALL retain typed `TwinStateSnapshot`,
  `TwinTimeline`, `TwinMismatchSummary`, `TwinReadinessState`, `TwinReconciliationState`, and
  `TwinInterpretationState` linkage
- a twin SHALL become `STALE` when any mirrored lane becomes stale, a new authority observation lands,
  late data changes the internal lane, the selected legal baseline changes, or reconciliation
  materially changes delta meaning
- cross-source bridges emitted by a built twin SHALL persist as `TwinDeltaArc` records rather than as
  renderer-local comparison lines

---

## 6.13A `TwinStateSnapshot.assembly_state`

### States

- `ASSEMBLED`
- `PARTIAL`
- `LIMITED`
- `STALE`
- `CONTRADICTORY`
- `UNAVAILABLE`
- `SUPERSEDED`

### Allowed transitions

- `UNAVAILABLE --some_components_materialized--> PARTIAL`
- `PARTIAL --all_required_components_bound--> ASSEMBLED`
- `PARTIAL --visibility_or_retention_limit_detected--> LIMITED`
- `ASSEMBLED --visibility_or_retention_limit_detected--> LIMITED`
- `ASSEMBLED --freshness_horizon_exceeded--> STALE`
- `PARTIAL --component_conflict_detected--> CONTRADICTORY`
- `ASSEMBLED --component_conflict_detected--> CONTRADICTORY`
- `STALE --refresh_reassembled--> ASSEMBLED`
- `LIMITED --limitation_resolved--> ASSEMBLED`
- `CONTRADICTORY --conflict_reconciled--> ASSEMBLED`
- `PARTIAL --newer_snapshot_available--> SUPERSEDED`
- `ASSEMBLED --newer_snapshot_available--> SUPERSEDED`
- `LIMITED --newer_snapshot_available--> SUPERSEDED`
- `STALE --newer_snapshot_available--> SUPERSEDED`
- `CONTRADICTORY --newer_snapshot_available--> SUPERSEDED`
- `UNAVAILABLE --newer_snapshot_available--> SUPERSEDED`

### Rules

- an `AUTHORITY` snapshot SHALL reach `ASSEMBLED` only from authority-originated or
  reconciliation-proven components; internal inference alone SHALL NOT complete the lane
- `CONTRADICTORY` means the lane contains mutually inconsistent authoritative components and SHALL
  block any claim of safe equivalence
- contradictory or otherwise non-ready lane subjects SHALL remain countable through
  `non_comparable_subject_count`; they SHALL NOT be merged back into ordinary comparable volume
- `UNAVAILABLE` is different from `NOT_REQUESTED` or `NOT_APPLICABLE`; the latter are interpretation
  states, not assembly failures
- `LIMITED` snapshots remain auditable but SHALL carry explicit limitation codes
- `STALE` snapshots remain readable but SHALL cap mutation-capable actions until rebuilt

---

## 6.13B `TwinReconciliationState.lifecycle_state`

### States

- `NOT_REQUIRED`
- `QUEUED`
- `IN_PROGRESS`
- `WAITING_ON_AUTHORITY`
- `WAITING_ON_OPERATOR`
- `RESOLVED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_REQUIRED --reconciliation_needed--> QUEUED`
- `QUEUED --worker_started--> IN_PROGRESS`
- `IN_PROGRESS --awaiting_authority_window--> WAITING_ON_AUTHORITY`
- `IN_PROGRESS --manual_escalation_required--> WAITING_ON_OPERATOR`
- `WAITING_ON_AUTHORITY --authority_response_received--> IN_PROGRESS`
- `WAITING_ON_OPERATOR --operator_action_recorded--> IN_PROGRESS`
- `IN_PROGRESS --resolution_proved--> RESOLVED`
- `QUEUED --newer_twin_supersedes--> SUPERSEDED`
- `IN_PROGRESS --newer_twin_supersedes--> SUPERSEDED`
- `WAITING_ON_AUTHORITY --newer_twin_supersedes--> SUPERSEDED`
- `WAITING_ON_OPERATOR --newer_twin_supersedes--> SUPERSEDED`

### Rules

- `NOT_REQUIRED` SHALL exist only when no active mismatch requires reconciliation
- reconciliation state SHALL preserve automatic-attempt counters and deadline semantics across
  continuation, replay, restore, or reconnect
- reconciliation state SHALL also preserve bounded budget posture, next-action ownership, and the
  primary workflow ref that owns any manual escalation
- `WAITING_ON_AUTHORITY` past deadline SHALL open owned workflow rather than silently looping
- `RESOLVED` SHALL carry an explicit terminal `resolution_state`; resolution SHALL NOT be inferred
  from absence of open workflow
- no transition path may silently reset automatic resend budget after exhaustion

---

## 6.14 `WorkflowItem.lifecycle_state`

### States

- `OPEN`
- `IN_PROGRESS`
- `WAITING_ON_CLIENT`
- `WAITING_ON_AUTHORITY`
- `BLOCKED`
- `DONE`
- `CANCELLED`
- `STALE`

### Allowed transitions

- `OPEN --picked_up--> IN_PROGRESS`
- `IN_PROGRESS --needs_client_input--> WAITING_ON_CLIENT`
- `IN_PROGRESS --needs_authority_response--> WAITING_ON_AUTHORITY`
- `IN_PROGRESS --blocked_condition--> BLOCKED`
- `WAITING_ON_CLIENT --client_response--> IN_PROGRESS`
- `WAITING_ON_AUTHORITY --authority_response--> IN_PROGRESS`
- `IN_PROGRESS --resolved--> DONE`
- `OPEN --no_longer_relevant--> CANCELLED`
- `OPEN --superseded_by_new_context--> STALE`

### Rules

- dedupe keys SHALL prevent duplicate active items for the same issue
- completed items remain immutable as workflow evidence

---

## 6.15 `Override.lifecycle_state`

### States

- `DRAFT`
- `PENDING_APPROVAL`
- `APPROVED_ACTIVE`
- `APPROVED_FUTURE`
- `REJECTED`
- `EXPIRED`
- `REVOKED`
- `SUPERSEDED`

### Allowed transitions

- `DRAFT --submit--> PENDING_APPROVAL`
- `PENDING_APPROVAL --approved_now--> APPROVED_ACTIVE`
- `PENDING_APPROVAL --approved_future--> APPROVED_FUTURE`
- `PENDING_APPROVAL --rejected--> REJECTED`
- `APPROVED_FUTURE --effective_date_reached--> APPROVED_ACTIVE`
- `APPROVED_ACTIVE --expiry_reached--> EXPIRED`
- `APPROVED_ACTIVE --manual_revoke--> REVOKED`
- `APPROVED_ACTIVE --new_override_replaces--> SUPERSEDED`

### Rules

- only approved active overrides may affect gating
- overrides may change engine posture, never authority acknowledgement

---

## 6.16 `AuthorityLink.lifecycle_state`

### States

- `UNLINKED`
- `LINK_INITIATED`
- `AUTHORISED_ACTIVE`
- `AUTHORISED_LIMITED`
- `TOKEN_INVALID`
- `REVOKED`
- `EXPIRED`

### Allowed transitions

- `UNLINKED --oauth_begin--> LINK_INITIATED`
- `LINK_INITIATED --oauth_success--> AUTHORISED_ACTIVE`
- `AUTHORISED_ACTIVE --scope_reduced--> AUTHORISED_LIMITED`
- `AUTHORISED_ACTIVE --token_invalid--> TOKEN_INVALID`
- `AUTHORISED_ACTIVE --authority_revoke--> REVOKED`
- `AUTHORISED_ACTIVE --expiry--> EXPIRED`
- `TOKEN_INVALID --refresh_success--> AUTHORISED_ACTIVE`

### Rules

- authority-facing operations require `AUTHORISED_ACTIVE` or policy-allowed `AUTHORISED_LIMITED`
- ambiguity in token-to-client binding is treated as invalid

---

## 6.17 `ObligationMirror.lifecycle_state`

This is the engine's normalized internal mirror of authority and internal readiness for an obligation.

### States

- `NOT_YET_OPEN`
- `OPEN`
- `DUE_SOON`
- `READY_TO_FILE`
- `SUBMITTED_PENDING`
- `MET_CONFIRMED`
- `LATE_UNMET`
- `NO_LONGER_RELEVANT`

### Allowed transitions

- `NOT_YET_OPEN --window_open--> OPEN`
- `OPEN --deadline_approaching--> DUE_SOON`
- `OPEN --all_internal_gates_pass--> READY_TO_FILE`
- `READY_TO_FILE --submission_started--> SUBMITTED_PENDING`
- `SUBMITTED_PENDING --authority_confirms--> MET_CONFIRMED`
- `OPEN --deadline_passed_without_met--> LATE_UNMET`
- `DUE_SOON --deadline_passed_without_met--> LATE_UNMET`
- `OPEN --obligation_removed_or_re-scoped--> NO_LONGER_RELEVANT`

### Rules

- legal "met" status follows authority data where available
- the engine may show `READY_TO_FILE` before submission, but not `MET_CONFIRMED`
- `ready_manifest_ref` SHALL be non-null only in `READY_TO_FILE`
- `current_submission_ref` SHALL be non-null only in `SUBMITTED_PENDING`
- `last_confirmed_submission_ref` SHALL be non-null only in `MET_CONFIRMED`

HMRC's Obligations API is the proper source for obligation retrieval, and quarterly updates are per
income source every 3 months. [3]

---

## 6.18 `FilingPacket.lifecycle_state`

### States

- `DRAFT`
- `PREPARED`
- `APPROVED_TO_SUBMIT`
- `SUBMITTED`
- `VOID`
- `SUPERSEDED`

### Allowed transitions

- `DRAFT --packet_build_complete--> PREPARED`
- `PREPARED --approval_complete--> APPROVED_TO_SUBMIT`
- `APPROVED_TO_SUBMIT --submit_begin--> SUBMITTED`
- `PREPARED --packet_invalidated--> VOID`
- `PREPARED --rebuilt_under_new_manifest--> SUPERSEDED`

### Rules

- `PREPARED` may be persisted while approvals, declaration-basis acknowledgement, or review steps are still pending
- persisted `PREPARED` packets SHALL already carry explicit packet-phase `approval_state`,
  `declared_basis_ack_state`, ordered `notice_step_refs[]`, and sealed calculation lineage when the
  selected filing path depends on authority calculation
- `APPROVED_TO_SUBMIT` requires trust and parity gates satisfied or valid override
- `APPROVED_TO_SUBMIT` also requires a bound `filing_gate_ref`, `proof_closure_state = CLOSED`,
  resolved packet-phase approval and declaration-basis acknowledgement posture, and a non-null
  `notice_resolution_ref` whenever the packet carries notice steps
- the `submit_begin` transition SHALL be persisted before, or atomically with, authority transmit
- packet content never mutates in place after `SUBMITTED`

---

## 6.19 `SubmissionRecord.lifecycle_state`

### States

- `INTENT_RECORDED`
- `TRANSMIT_PENDING`
- `TRANSMITTED`
- `PENDING_ACK`
- `CONFIRMED`
- `REJECTED`
- `UNKNOWN`
- `OUT_OF_BAND`
- `SUPERSEDED`

### Allowed transitions

- `INTENT_RECORDED --send_queued--> TRANSMIT_PENDING`
- `TRANSMIT_PENDING --request_sent--> TRANSMITTED`
- `TRANSMITTED --awaiting_authority_confirmation--> PENDING_ACK`
- `TRANSMITTED --authority_immediate_confirm--> CONFIRMED`
- `TRANSMITTED --authority_immediate_reject--> REJECTED`
- `PENDING_ACK --authority_confirms--> CONFIRMED`
- `PENDING_ACK --authority_rejects--> REJECTED`
- `PENDING_ACK --authority_not_resolved--> UNKNOWN`
- `UNKNOWN --late_authority_confirms--> CONFIRMED`
- `UNKNOWN --late_authority_rejects--> REJECTED`
- `UNKNOWN --out_of_band_state_proved--> OUT_OF_BAND`
- `OUT_OF_BAND --current_packet_lineage_later_proved--> CONFIRMED`
- `any_non_confirmed_state --external_filing_detected--> OUT_OF_BAND`
- `CONFIRMED --new_submission_supersedes--> SUPERSEDED`

### Rules

- only authority-backed evidence may enter `CONFIRMED`
- `UNKNOWN` is a first-class state, not an error placeholder
- `INTENT_RECORDED`, `TRANSMIT_PENDING`, `TRANSMITTED`, `PENDING_ACK`, `REJECTED`, `UNKNOWN`, and
  `SUPERSEDED` SHALL retain the bound `packet_ref`, request-lineage fields, and
  `proof_bundle_ref`/`proof_bundle_hash`; only `OUT_OF_BAND` may represent legal settlement without
  packet-origin transmit lineage
- delayed terminal authority evidence may resolve `UNKNOWN` and may correct provisional `OUT_OF_BAND` only through bound authority-grounded correlation for the same exact legal meaning; operator optimism or UI recency alone SHALL never do so
- `OUT_OF_BAND` means legal state exists externally but was not created by this packet flow
- `baseline_type` SHALL be non-null only in `CONFIRMED` or `OUT_OF_BAND`
- `PENDING_ACK` may persist only while the frozen reconciliation budget remains open; once that budget
  is exhausted without decisive authority evidence, the protocol SHALL transition through a named event
  into `UNKNOWN` or a higher-confidence authority-backed state
- `reconciliation_deadline_at` SHALL be non-null only in `PENDING_ACK` or `UNKNOWN`
- `UNKNOWN` SHALL open or retain reconciliation workflow and SHALL NOT trigger a blind resend of the
  same authority meaning unless duplicate-gate and idempotent-recovery rules explicitly permit it
- any non-terminal `SubmissionRecord` in `PENDING_ACK` or `UNKNOWN` SHALL pair with an
  `AuthorityInteractionRecord` whose `reconciliation_budget_state` and `resend_legality_state`
  remain authoritative for whether the next step is a follow-up read, idempotent recovery only,
  escalation, or closed no-resend posture
- `superseded_by_submission_id` SHALL be non-null only in `SUPERSEDED`

HMRC's APIs support calculation retrieval and final declaration submission through software, but
authority acknowledgement remains the decisive legal state. [4]

---

## 6.19A `AuthorityInteractionRecord.lifecycle_state`

### States

- `REQUEST_REGISTERED`
- `DISPATCH_READY`
- `TRANSMIT_IN_FLIGHT`
- `RESPONSE_CAPTURED`
- `RECONCILING`
- `RESOLVED`
- `ABANDONED`

### Allowed transitions

- `REQUEST_REGISTERED --dispatch_materialized--> DISPATCH_READY`
- `DISPATCH_READY --exclusive_gateway_claim_and_send_begin--> TRANSMIT_IN_FLIGHT`
- `DISPATCH_READY --duplicate_bucket_changed_before_send--> ABANDONED`
- `TRANSMIT_IN_FLIGHT --provider_response_captured--> RESPONSE_CAPTURED`
- `TRANSMIT_IN_FLIGHT --timeout_envelope_recorded--> RESPONSE_CAPTURED`
- `RESPONSE_CAPTURED --reconciliation_begin--> RECONCILING`
- `RESPONSE_CAPTURED --response_terminal_without_reconciliation--> RESOLVED`
- `RECONCILING --resolution_reached--> RESOLVED`
- `DISPATCH_READY --binding_invalidated_before_send--> ABANDONED`
- `TRANSMIT_IN_FLIGHT --exchange_superseded_or_quarantined--> ABANDONED`

### Rules

- `AuthorityInteractionRecord` SHALL exist before a live authority request becomes visible to the
  broker or gateway
- the `exclusive_gateway_claim_and_send_begin` transition SHALL be an atomic compare-and-swap single-writer send claim on the persisted exchange identity; concurrent workers SHALL observe claim conflict rather than racing a duplicate send
- immediately before that claim, the gateway SHALL re-check the persisted `duplicate_meaning_key`
  bucket and latest authority-grounded state for the same exact meaning; if stronger or newer truth
  exists, the exchange SHALL move to `ABANDONED` or reconciliation rather than transmitting stale
  bytes
- `send_revalidation_state` SHALL remain `NOT_PERFORMED` in `REQUEST_REGISTERED` and
  `DISPATCH_READY`
- `send_revalidation_state` SHALL be `CLEAR_TO_SEND` in `TRANSMIT_IN_FLIGHT`,
  `RESPONSE_CAPTURED`, `RECONCILING`, and `RESOLVED`
- `send_revalidated_at` SHALL become non-null only when the mandatory send-time revalidation runs
- `send_authorized_token_version_ref` SHALL be non-null only when `send_revalidation_state =
  CLEAR_TO_SEND`; if that ref differs from the sealed `AuthorityBinding.token_version_ref`, then
  `send_revalidation_reason_codes[]` SHALL equal `[TOKEN_ROTATED_WITHIN_LINEAGE]`
- `send_revalidation_reason_codes[]` SHALL remain empty before revalidation, SHALL contain exactly
  one lawful pass reason for a transmitted exchange, and SHALL otherwise preserve explicit fail-closed
  non-send reasons such as `BINDING_LINEAGE_DRIFT`, `DUPLICATE_BUCKET_CHANGED`, or
  `STRONGER_EXTERNAL_TRUTH_PRESENT`
- `dispatch_ref` SHALL identify the durable send handle for the exchange, whether that is an outbox
  message, an inline gateway dispatch record, or an equivalent transport work item
- `active_response_id` MAY be null only in `REQUEST_REGISTERED`, `DISPATCH_READY`, or
  `TRANSMIT_IN_FLIGHT`
- `response_history_ids[]` SHALL remain empty only before response capture or after abandonment
- `active_response_id` SHALL always be a member of `response_history_ids[]` when non-null
- `meaning_resolution_state` SHALL remain `NO_RESPONSE` before capture, MAY become
  `PROVISIONAL_TIMEOUT` when the current active response is only a timeout placeholder, SHALL become
  `RECONCILIATION_REQUIRED` when source observations conflict or when a timeout placeholder is being
  replaced, and SHALL become `RECONCILIATION_RESOLVED` only after explicit reconciliation closes
  the ambiguity
- `reconciliation_method`, `max_auto_reconciliation_attempts`, and
  `reconciliation_cadence_seconds` SHALL be frozen on the interaction so replay, recovery, and
  continuation cannot inherit a newer live profile
- `reconciliation_budget_state = NOT_OPENED` SHALL hold before response capture; `ACTIVE` SHALL mean
  bounded read-only follow-up remains lawful; `EXHAUSTED` SHALL mean automatic follow-up stopped but
  escalation has not yet been durably opened; `ESCALATED` SHALL require both
  `reconciliation_escalated_at` and `reconciliation_workflow_item_ref`; and `CLOSED` SHALL mean no
  further resend is legal under the current interaction lineage
- `next_reconciliation_at` SHALL be non-null only while `reconciliation_budget_state = ACTIVE`
- `resend_legality_state = IDEMPOTENT_RECOVERY_ONLY` SHALL hold only in `TRANSMIT_IN_FLIGHT`;
  `FOLLOW_UP_READ_ONLY` only while the active budget is open; `BLOCKED_BY_RECONCILIATION` or
  `BLOCKED_BY_ESCALATION` once automatic resend is no longer lawful; and `CLOSED_NO_RESEND` once the
  interaction is direct-terminal, reconciliation-resolved, or abandoned
- `RESOLVED` SHALL require either a terminal `AuthorityResponseEnvelope` or a persisted
  reconciliation result linked to the same request lineage
- `resolution_basis` SHALL be non-null only in `RESOLVED`
- `reconciliation_deadline_at` SHALL be null in `RESOLVED` and `ABANDONED`
- `ABANDONED` SHALL preserve the attempted request lineage while keeping `active_response_id = null`
  and `reconciliation_deadline_at = null`; abandonment occurs before the exchange has a captured
  provider response or a pending reconciliation window
- `ABANDONED` SHALL preserve the attempted request lineage and the reason the exchange could not
  continue; abandonment does not erase the need for audit or operator follow-up
- `ABANDONED` MAY retain `send_revalidation_state = BLOCKED` when bytes never left the process, or
  `send_revalidation_state = CLEAR_TO_SEND` when a previously lawful send later had to be
  quarantined or superseded before response capture
- `abandonment_reason_code` SHALL be non-null only in `ABANDONED`

---

## 6.20 `FilingCase.lifecycle_state`

### States

- `NOT_STARTED`
- `PREPARING`
- `READY_REVIEW`
- `READY_TO_SUBMIT`
- `SUBMITTED_PENDING`
- `FILED_CONFIRMED`
- `FILED_UNKNOWN`
- `REJECTED`
- `AMENDMENT_ELIGIBLE`
- `AMENDMENT_IN_PROGRESS`
- `AMENDED_CONFIRMED`
- `CLOSED`

### Allowed transitions

- `NOT_STARTED --first_manifest_created--> PREPARING`
- `PREPARING --trust_ready_for_review--> READY_REVIEW`
- `READY_REVIEW --approval_complete--> READY_TO_SUBMIT`
- `READY_TO_SUBMIT --trust_invalidated--> READY_REVIEW`
- `READY_TO_SUBMIT --submission_started--> SUBMITTED_PENDING`
- `SUBMITTED_PENDING --submission_confirmed--> FILED_CONFIRMED`
- `SUBMITTED_PENDING --submission_unknown--> FILED_UNKNOWN`
- `SUBMITTED_PENDING --submission_rejected--> REJECTED`
- `FILED_UNKNOWN --late_authority_confirmation--> FILED_CONFIRMED`
- `FILED_UNKNOWN --late_authority_rejection--> REJECTED`
- `FILED_CONFIRMED --drift_or_authority_context_opens_amendment--> AMENDMENT_ELIGIBLE`
- `AMENDMENT_ELIGIBLE --amendment_begin--> AMENDMENT_IN_PROGRESS`
- `AMENDMENT_IN_PROGRESS --amendment_confirmed--> AMENDED_CONFIRMED`
- `AMENDED_CONFIRMED --closure_policy_met--> CLOSED`

### Rules

- `FILED_CONFIRMED` is only reachable from confirmed submission evidence
- `FILED_UNKNOWN` is not equivalent to filed and SHALL remain review-only until later authority-grounded evidence resolves it to `FILED_CONFIRMED` or `REJECTED`
- the case SHALL carry the current trust/parity lineage and current trust-currency posture for any filing-capable continuation
- `current_packet_ref` SHALL remain the durable packet-legality anchor for the case; case state
  SHALL not reconstruct packet approval, declaration acknowledgement, or notice settlement from
  portal-facing artifacts
- `READY_TO_SUBMIT` is illegal unless trust is current; any trust invalidation or recalculation requirement SHALL move the case back to `READY_REVIEW`
- when `trust_currency_state = RECALC_REQUIRED`, the case SHALL retain both
  `trust_invalidation_reason_codes[]` and `trust_invalidation_dependency_refs[]` so the decisive
  late-data, authority, override, or supersession change is auditable without replay
- a persisted `LateDataMonitorResult.temporal_consequence_summary` with temporal uncertainty,
  filing-critical baseline touch, or replay-safe retroactive impact SHALL invalidate trust even when
  the raw late-data severity is only notice or exclusion
- a case can remain open after filing if drift or amendment logic is active

---

## 6.21 `DriftRecord.lifecycle_state`

### States

- `NOT_ASSESSED`
- `NO_CHANGE`
- `EXPLANATION_ONLY`
- `BENIGN_DRIFT`
- `MATERIAL_REVIEW`
- `REVIEW_REQUIRED`
- `AMENDMENT_REQUIRED`
- `RESOLVED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_ASSESSED --drift_check_complete_no_change--> NO_CHANGE`
- `NOT_ASSESSED --drift_check_explanation_only--> EXPLANATION_ONLY`
- `NOT_ASSESSED --drift_check_benign--> BENIGN_DRIFT`
- `NOT_ASSESSED --drift_check_material--> MATERIAL_REVIEW`
- `MATERIAL_REVIEW --workflow_spawned--> REVIEW_REQUIRED`
- `REVIEW_REQUIRED --amendment_needed--> AMENDMENT_REQUIRED`
- `EXPLANATION_ONLY --accepted--> RESOLVED`
- `BENIGN_DRIFT --accepted--> RESOLVED`
- `AMENDMENT_REQUIRED --case_opened--> RESOLVED`
- `any_non_superseded_state --newer_exact_scope_drift_written--> SUPERSEDED`

### Rules

- drift classification uses the selected highest-precedence exact-scope baseline envelope
  (`AUTHORITY_CORRECTED > AMENDED > FILED > OUT_OF_BAND > WORKING`), not simply the latest
  non-filed run
- the selected envelope SHALL also freeze `scope_resolution_state` and
  `same_scope_truth_resolution_state` so broader scope fallback or stronger same-scope external truth
  cannot be reinterpreted later as ordinary internal filed continuity
- `DriftRecord.lifecycle_state` SHALL mirror `DriftRecord.materiality_class` for `NO_CHANGE`, `EXPLANATION_ONLY`, `BENIGN_DRIFT`, `MATERIAL_REVIEW`, and `AMENDMENT_REQUIRED` wherever those values are shown on the same UI or workflow surface
- `REVIEW_REQUIRED` is a workflow escalation state entered after `MATERIAL_REVIEW`; it is not a separate materiality class
- only one non-superseded drift record may remain active for one exact scope key at a time
- expired historical evidence may limit explanation, but not erase drift history

---

## 6.22 `AmendmentCase.lifecycle_state`

### States

- `NOT_ELIGIBLE`
- `RECONCILE_REQUIRED`
- `ELIGIBLE`
- `INTENT_REQUIRED`
- `INTENT_SUBMITTED`
- `READY_TO_AMEND`
- `AMEND_SUBMITTED`
- `AMEND_PENDING`
- `AMEND_CONFIRMED`
- `AMEND_REJECTED`
- `WINDOW_CLOSED`
- `SUPERSEDED`

### Allowed transitions

- `NOT_ELIGIBLE --eligibility_check_pass--> ELIGIBLE`
- `NOT_ELIGIBLE --baseline_or_window_unproven--> RECONCILE_REQUIRED`
- `RECONCILE_REQUIRED --reconciliation_complete--> ELIGIBLE`
- `ELIGIBLE --intent_required_by_authority_flow--> INTENT_REQUIRED`
- `INTENT_REQUIRED --intent_sent--> INTENT_SUBMITTED`
- `INTENT_SUBMITTED --authority_validations_pass--> READY_TO_AMEND`
- `INTENT_SUBMITTED --freshness_invalidated--> INTENT_REQUIRED`
- `READY_TO_AMEND --freshness_invalidated--> INTENT_REQUIRED`
- `READY_TO_AMEND --amendment_submission_sent--> AMEND_SUBMITTED`
- `AMEND_SUBMITTED --awaiting_ack--> AMEND_PENDING`
- `AMEND_PENDING --authority_confirms--> AMEND_CONFIRMED`
- `AMEND_PENDING --authority_rejects--> AMEND_REJECTED`
- `ELIGIBLE --amendment_window_expires--> WINDOW_CLOSED`
- `READY_TO_AMEND --amendment_window_expires--> WINDOW_CLOSED`
- `any_non_superseded_state --same_scope_chain_superseded--> SUPERSEDED`
- `AMEND_CONFIRMED --later_same_scope_confirmed--> SUPERSEDED`

### Rules

- amendment eligibility requires that final declaration has already been completed through software and the amendment window is still open
- where HMRC requires an intent-to-amend step, the engine must model it explicitly, not skip from "eligible" to "amended"
- a single engine run MAY record both `intent_sent` and `authority_validations_pass`, but both transitions MUST be auditable
- `READY_TO_AMEND` is contingent on freshness; a widened baseline, retroactive-impact artifact, amendment-window evaluation, or provider-profile change SHALL invalidate stale readiness before submission
- `READY_TO_AMEND` and `STALE` posture SHALL preserve the exact baseline/window/retroactive hashes that justified the decision; stale posture SHALL additionally retain explicit invalidation reason codes
- only one non-superseded amendment chain head may remain active for one exact scope key; historical confirmed or rejected cases SHALL remain queryable after supersession

HMRC's year-end guide states that amendments after final declaration are allowed only once final
declaration has been completed through software and within the amendment window, and that an
intent-to-amend step with validation checks is required before amendment submission is accepted. [5]

---

## 6.22A `AmendmentBundle.bundle_state`

### States

- `PREPARED`
- `FROZEN`
- `SUBMITTED`
- `CONFIRMED`
- `VOID`
- `SUPERSEDED`

### Allowed transitions

- `PREPARED --bundle_review_complete--> FROZEN`
- `FROZEN --submission_begin--> SUBMITTED`
- `SUBMITTED --authority_confirms--> CONFIRMED`
- `PREPARED --input_change_before_freeze--> VOID`
- `FROZEN --same_scope_inputs_change--> SUPERSEDED`
- `SUBMITTED --newer_same_scope_bundle_replaces_active_chain--> SUPERSEDED`

### Rules

- `AmendmentBundle` SHALL be immutable once `FROZEN`
- supersession creates a new bundle; it does not rewrite the original bundle hash, input hashes, or payload
- `PREPARED` and `FROZEN` bundles SHALL keep `packet_ref = null`; `SUBMITTED` and `CONFIRMED` SHALL retain the transmitted `packet_ref`
- `CONFIRMED` preserves the exact authority-facing package that produced the accepted amendment state

---

## 6.23 `ArtifactRetention.lifecycle_state`

### States

- `ACTIVE`
- `LIMITED`
- `LEGAL_HOLD`
- `ERASURE_PENDING`
- `PSEUDONYMISED`
- `ERASED`

### Allowed transitions

- `ACTIVE --retention_limitation--> LIMITED`
- `ACTIVE --legal_hold_apply--> LEGAL_HOLD`
- `LIMITED --erasure_requested_or_due--> ERASURE_PENDING`
- `LEGAL_HOLD --hold_released--> ACTIVE`
- `ERASURE_PENDING --pseudonymise_first--> PSEUDONYMISED`
- `ERASURE_PENDING --erasure_complete--> ERASED`
- `PSEUDONYMISED --final_delete--> ERASED`

### Rules

- legal hold blocks deletion but not visibility controls
- erasure does not delete audit proof that an object once existed
- limitation state must propagate into graph, twin, trust, and amendment explanations
- `LEGAL_HOLD` and `ERASURE_PENDING` SHALL carry explicit follow-up workflow refs and `next_checkpoint_at`
- `PSEUDONYMISED` and `ERASED` SHALL carry durable request/action/proof linkage, and `PSEUDONYMISED` SHALL also carry explicit limitation semantics
- `ArtifactRetention` SHALL remain bound to its canonical `RetentionTag` and SHALL preserve minimum/policy/effective expiry timestamps rather than collapsing expiry to one shorthand date

---

## 6.24 `LowNoiseExperienceFrame.attention_state` and `LowNoiseExperienceFrame.presentation_state`

### Attention states

- `CALM`
- `NOTICE`
- `REVIEW`
- `BLOCKED`
- `WAITING`
- `LIMITED`

### Presentation states

- `DEFAULT`
- `FOCUSED`
- `COMPARE`
- `AUDIT`

### Allowed transitions

- `CALM --notice_detected--> NOTICE`
- `NOTICE --review_required--> REVIEW`
- `NOTICE --blocking_issue_detected--> BLOCKED`
- `REVIEW --blocking_issue_detected--> BLOCKED`
- `WAITING --authority_resolves_or_worker_finishes--> CALM`
- `CALM --visibility_limit_changes_actionability--> LIMITED`
- `NOTICE --visibility_limit_changes_actionability--> LIMITED`
- `REVIEW --visibility_limit_changes_actionability--> LIMITED`
- `WAITING --visibility_limit_changes_actionability--> LIMITED`
- `LIMITED --limit_cleared--> prior_non_limited_attention_state`
- `DEFAULT --user_opens_detail--> FOCUSED`
- `FOCUSED --user_enters_compare--> COMPARE`
- `FOCUSED --user_enters_audit--> AUDIT`
- `COMPARE --user_exits_compare--> FOCUSED`
- `AUDIT --user_exits_audit--> FOCUSED`
- `FOCUSED --user_closes_detail--> DEFAULT`

### Rules

- the default shell may surface at most one primary issue and at most one primary action at a time
- compare and audit modes may reveal more than one active detail module, but they SHALL NOT invent a new shell route key or replace the current primary posture
- reconnect, catch-up, or materializing refresh SHALL preserve the current `presentation_state` when the `focus_anchor_ref` still resolves
- these posture states belong to the canonical `LowNoiseExperienceFrame` family and SHALL remain aligned with the same `dominant_question`, `settlement_state`, and `recovery_posture` vocabulary used by route-stable browser and native shells
- `LIMITED` decorates the underlying posture; it does not erase whether the system is otherwise calm, waiting, in review, or blocked

## 6.24A `LowNoiseExperienceFrame.recovery_posture`

### Recovery postures

- `NONE`
- `INLINE_RECONNECT`
- `INLINE_REBASE`
- `READ_ONLY_LIMITED`
- `OBJECT_SUPERSEDED`
- `ACCESS_REBIND_REQUIRED`

### Rules

- `recovery_posture` decorates the mounted shell; it SHALL NOT silently remount the same routed
  object into a different shell grammar while the anchored object still resolves
- `settlement_state = RECOVERY_REQUIRED` SHALL imply `recovery_posture != NONE`
- non-`NONE` `recovery_posture` SHALL fail closed for live mutation-capable actions unless the only
  safe remaining move is refresh, reconnect, or rebase
- reconnect, rebase, access rebinding, supersession, and read-only limitation SHALL keep the prior
  dominant question and object context visible while the recovery path is explained inline

---

## 6.25 Operational release/control states

Every mutable backend control object in the FE-46 inventory below that advances in place under worker,
recovery, replay, or operator orchestration SHALL serialize one `state_transition_contract{...}`
that mirrors the authoritative state field, names the applied `transition_event_code`, retains one
`transition_audit_ref`, and fails closed with typed illegal-transition rejection plus no partial
write. The FE-46 shared transition-governance inventory is:
`RunManifest.lifecycle_state`, `NightlyBatchRun.lifecycle_state`, `WorkflowItem.lifecycle_state`,
`FilingPacket.lifecycle_state`, `SubmissionRecord.lifecycle_state`, `FilingCase.lifecycle_state`,
`DeploymentRelease.rollout_state`, `SchemaMigrationLedger.phase_state`,
`RecoveryCheckpoint.checkpoint_state`, and `ReleaseVerificationManifest.decision_state`.

### A. `ApiCommandReceipt.acceptance_state`

#### States

- `ACCEPTED`
- `DUPLICATE_REPLAY`
- `REJECTED_STALE_VIEW`
- `REJECTED_POLICY`
- `REJECTED_INVALID`
- `EXPIRED`

#### Allowed transitions

- `ACCEPTED --expiry_window_elapsed--> EXPIRED`
- `DUPLICATE_REPLAY --expiry_window_elapsed--> EXPIRED`
- `REJECTED_STALE_VIEW --expiry_window_elapsed--> EXPIRED`
- `REJECTED_POLICY --expiry_window_elapsed--> EXPIRED`
- `REJECTED_INVALID --expiry_window_elapsed--> EXPIRED`

#### Rules

- a receipt SHALL be immutable once written except for the terminal `EXPIRED` projection;
- a duplicate-equivalent request SHALL reuse the prior receipt rather than transition `ACCEPTED` into a new state;
- rejected receipts SHALL remain auditable and SHALL NOT be deleted simply because the client retried later.

### B. `ExperienceCursor.cursor_state`

#### States

- `LIVE`
- `REBASED`
- `CLOSED`
- `REVOKED`
- `EXPIRED`

#### Allowed transitions

- `LIVE --frame_epoch_advanced--> REBASED`
- `LIVE --session_closed--> CLOSED`
- `LIVE --session_revoked_or_binding_invalidated--> REVOKED`
- `LIVE --ttl_elapsed--> EXPIRED`
- `REBASED --snapshot_reissued--> LIVE`
- `REBASED --session_closed--> CLOSED`
- `REBASED --session_revoked_or_binding_invalidated--> REVOKED`
- `REBASED --ttl_elapsed--> EXPIRED`
- `CLOSED --session_revoked_or_binding_invalidated--> REVOKED`
- `CLOSED --ttl_elapsed--> EXPIRED`
- `REVOKED --ttl_elapsed--> EXPIRED`

#### Rules

- a cursor SHALL be bound to session, tenant, principal class, manifest, frame epoch, masking-posture
  fingerprint, and the compatible shell/schema contract window;
- a `REBASED` cursor SHALL NOT continue consuming deltas from the prior frame epoch;
- session revocation, tenant switch, masking-posture change, or schema incompatibility SHALL revoke
  outstanding cursors rather than letting them degrade silently into stale-but-usable resume tokens;
- `EXPIRED` or `REVOKED` cursors may not be reactivated in place; a fresh cursor SHALL be issued.

### C. `RouteStabilityContract` publication rules

#### Rules

- `publication_generation` SHALL advance monotonically whenever the route-visible truth, mutation
  safety, or recovery posture changes materially for the mounted route;
- `guard_vector_hash` SHALL change whenever any governing guard component changes, even if the shell
  family and object anchor remain mounted;
- `frame_epoch` MAY remain stable across inline refresh and non-destructive delta publication, but it
  SHALL advance whenever resumable delta continuity is broken or an older stream must rebase;
- `shell_stability_token` SHALL change whenever the mounted shell's dominant question, primary
  action legality, or shell hierarchy meaning changes materially; and
- snapshots, stream events, stale failures, command receipts, and native restoration SHALL all
  reference one coherent grouped route-stability contract for the same current route generation
  rather than recombining marker fields from different generations.

### D. `DeploymentRelease.rollout_state`

#### States

- `PLANNED`
- `CANARY`
- `PROMOTED`
- `FAILED_FORWARD`
- `PINNED`
- `ABORTED`
- `ROLLED_BACK`
- `SUPERSEDED`

#### Allowed transitions

- `PLANNED --canary_start--> CANARY`
- `PLANNED --emergency_promote_with_override--> PROMOTED`
- `CANARY --promote--> PROMOTED`
- `CANARY --abort--> ABORTED`
- `PROMOTED --rollback--> ROLLED_BACK`
- `PROMOTED --rollback_unsafe_fail_forward_required--> FAILED_FORWARD`
- `PROMOTED --emergency_pin--> PINNED`
- `FAILED_FORWARD --emergency_pin--> PINNED`
- `PROMOTED --supersede--> SUPERSEDED`
- `FAILED_FORWARD --supersede--> SUPERSEDED`
- `PINNED --supersede--> SUPERSEDED`
- `ABORTED --supersede--> SUPERSEDED`
- `ROLLED_BACK --supersede--> SUPERSEDED`

#### Rules

- every live promotion SHALL pass through `CANARY` unless an approved emergency policy explicitly
  records approver, blast radius, reason, and override expiry on the release record;
- `ROLLED_BACK` refers to application release posture only and SHALL NOT imply deletion of legal/audit truth;
- `FAILED_FORWARD` means the release remains the serving baseline only under a compensating-release
  runbook because rollback is unsafe for the current datastore/schema/external-state posture;
- `DeploymentRelease` SHALL retain explicit `rollback_boundary_state`; closed
  `schema_reader_window_contract.window_state` posture forces `rollback_boundary_state =
  FAIL_FORWARD_ONLY`, while canary abort posture keeps `rollback_boundary_state = ROLLBACK_ALLOWED`;
- `FAILED_FORWARD` is lawful only with explicit `compensating_release_id_or_null` and
  `fail_forward_owner_ref_or_null`; fail-forward is not an unnamed emergency side path;
- `PINNED` freezes the serving baseline or desktop-update channel at a known release while the incident
  is active; pinning changes rollout posture, not legal/compliance truth;
- once a release enters `PROMOTED`, `FAILED_FORWARD`, or `PINNED`, the release record SHALL preserve
  the exact build, config, and schema bundle provenance used.

### E. `SchemaMigrationLedger.phase_state`

#### States

- `PLANNED`
- `APPLYING`
- `APPLIED`
- `VERIFYING`
- `VERIFIED`
- `CONTRACTING`
- `CONTRACTED`
- `HALTED`
- `FAILED`
- `SUPERSEDED`

#### Allowed transitions

- `PLANNED --start_apply--> APPLYING`
- `APPLYING --apply_complete--> APPLIED`
- `APPLIED --start_verify--> VERIFYING`
- `VERIFYING --verify_success--> VERIFIED`
- `VERIFIED --start_contract--> CONTRACTING`
- `CONTRACTING --contract_complete--> CONTRACTED`
- `APPLYING --halt--> HALTED`
- `VERIFYING --halt--> HALTED`
- `CONTRACTING --halt--> HALTED`
- `APPLYING --fail--> FAILED`
- `VERIFYING --fail--> FAILED`
- `CONTRACTING --fail--> FAILED`
- `HALTED --resume_apply--> APPLYING`
- `HALTED --resume_verify--> VERIFYING`
- `HALTED --resume_contract--> CONTRACTING`
- `VERIFIED --supersede--> SUPERSEDED`
- `CONTRACTED --supersede--> SUPERSEDED`

#### Rules

- schema and datastore change SHALL follow the explicit shape `expand -> migrate/backfill -> verify ->
  contract`; migrations with no destructive contract phase may end at `VERIFIED`;
- `SchemaMigrationLedger` SHALL retain `target_schema_bundle_hash`,
  `schema_reader_window_contract{...}`, and `backfill_execution_contract{...}` as the authoritative
  expand/migrate/contract posture rather than inferring those states from timestamps alone;
- destructive contract phases SHALL NOT begin before the migration is `VERIFIED`, the compatibility
  window is closed, and no replay, recovery, or in-flight manifest still depends on the older shape;
- `CONTRACTING`, `CONTRACTED`, and any closed-window posture SHALL require
  `schema_reader_window_contract.window_state = CONTRACT_ELIGIBLE_WINDOW_CLOSED`, and any
  migration whose `backfill_execution_contract.execution_requirement = IDEMPOTENT_BACKFILL_REQUIRED`
  SHALL keep `backfill_execution_contract.execution_state = COMPLETE` before verification can finish
  or contract can begin;
- `FAILED` or `HALTED` migrations SHALL block incompatible release promotion;
- `HALTED` SHALL record the halted subphase and resume only into that same legal subphase rather than
  defaulting blindly back to apply work;
- once `CONTRACTING` begins, rollback is legal only while compatibility guarantees still hold;
  otherwise the sanctioned path is fail-forward with preserved migration truth;
- replay or recovery runs that depend on older shapes SHALL continue using their frozen bundle even after a later migration is `VERIFIED`.

### F. `RecoveryCheckpoint.checkpoint_state`

#### States

- `REQUESTED`
- `CREATED`
- `VERIFIED`
- `QUARANTINED`
- `EXPIRED`

#### Allowed transitions

- `REQUESTED --snapshot_complete--> CREATED`
- `CREATED --restore_drill_passed--> VERIFIED`
- `CREATED --restore_drill_failed--> QUARANTINED`
- `VERIFIED --privacy_reconciliation_failed--> QUARANTINED`
- `QUARANTINED --remediation_and_redrill_passed--> VERIFIED`
- `CREATED --retention_elapsed--> EXPIRED`
- `VERIFIED --retention_elapsed--> EXPIRED`
- `QUARANTINED --retention_elapsed--> EXPIRED`

#### Rules

- a checkpoint SHALL NOT satisfy production restore evidence until it reaches `VERIFIED`;
- `RecoveryCheckpoint` SHALL retain one `recovery_governance_contract{...}`, one
  `checkpoint_inventory_ref`, one bound `privacy_reconciliation_contract{...}`, one typed
  `reopen_readiness_state`, and explicit audit, queue-rebuild, authority-rebuild, and
  authority-binding-revalidation booleans so restore posture is machine-bound;
- `CREATED` may retain partial restore evidence only while `reopen_readiness_state` names the exact
  blocking gate, including compensating re-erasure, limitation reconciliation, legal-hold review,
  proof-preservation review, and authority-ambiguity review; it SHALL NOT silently imply that reopen
  is safe;
- `VERIFIED` requires bound restore evidence, privacy reconciliation, audit continuity, durable queue
  rebuild verification, authority rebuild, authority binding revalidation, and verified replay-safe
  plus enquiry-safe limitation posture before reopen is lawful;
- `QUARANTINED` checkpoints SHALL remain inventory-visible, SHALL block restore-evidence claims, and
  SHALL preserve the failing drill or privacy-reconciliation outcome rather than collapsing into mere
  staleness;
- `EXPIRED` checkpoints SHALL remain ledger-visible even if the underlying backup artifact ages out;
- restore drills SHALL record the exact checkpoint used, the verification outcome, and the bound
  restore privacy-reconciliation contract.

### G. `ReleaseVerificationManifest.decision_state`

#### States

- `PENDING`
- `BLOCKED`
- `APPROVED`
- `SUPERSEDED`

#### Allowed transitions

- `PENDING --blocking_evidence_detected--> BLOCKED`
- `BLOCKED --blocking_evidence_reopened--> PENDING`
- `PENDING --approval_granted--> APPROVED`
- `BLOCKED --approval_granted--> APPROVED`
- `BLOCKED --supersede--> SUPERSEDED`
- `APPROVED --supersede--> SUPERSEDED`

#### Rules

- a verification manifest SHALL bind one candidate identity, one evidence basis, and one named
  decision event rather than inferring approval or reopening from gate arrays alone;
- any green `deterministic_and_state_machine` gate in that evidence basis SHALL retain one reviewed
  `DeterministicGoldenPack` ref so approval never depends on transient test logs or unordered test
  output;
- `blocking_evidence_reopened` is the only lawful way for an already blocked manifest to return to
  `PENDING`, and it SHALL remain tied to the same candidate-bound evidence lineage;
- `APPROVED` or `SUPERSEDED` manifests SHALL NOT reopen in place; later promotion or review work
  SHALL allocate a successor manifest and link supersession explicitly;
- decision consumers SHALL use the manifest's persisted state machine and supporting evidence refs,
  not local gate-order heuristics, to decide whether rollout may proceed.

### H. `SecretVersion.rotation_state`

#### States

- `ISSUED`
- `ATTESTED`
- `ACTIVE`
- `ROTATING`
- `RETIRED`
- `REVOKED`

#### Allowed transitions

- `ISSUED --attestation_passed--> ATTESTED`
- `ISSUED --revoke--> REVOKED`
- `ATTESTED --activate--> ACTIVE`
- `ATTESTED --revoke--> REVOKED`
- `ACTIVE --begin_rotation--> ROTATING`
- `ROTATING --cutover_complete--> RETIRED`
- `ROTATING --cutover_aborted--> ACTIVE`
- `ACTIVE --revoke--> REVOKED`
- `ROTATING --revoke--> REVOKED`

#### Rules

- a secret/key version SHALL have one unambiguous activation window;
- no version SHALL become `ACTIVE` without successful attestation bound to the correct store, lineage,
  and policy profile; failed or missing attestation SHALL fail closed;
- `cutover_aborted` SHALL restore one unambiguous active version for new writes and invalidate any
  partial rotation state that would otherwise leave version binding ambiguous;
- `REVOKED` versions SHALL fail closed for future use and SHALL trigger incident/audit handling when applicable;
- rotation SHALL preserve the ability to read historical encrypted artifacts for the required retention window.

## 6.26 `ClientOnboardingJourney.lifecycle_state`

### States

- `INVITED`
- `PROFILE_PENDING`
- `IDENTITY_PENDING`
- `AUTHORITY_LINK_PENDING`
- `DOCUMENTS_PENDING`
- `READY_FOR_REVIEW`
- `COMPLETED`
- `EXPIRED`
- `ABANDONED`

### Allowed transitions

- `INVITED --invite_opened--> PROFILE_PENDING`
- `PROFILE_PENDING --profile_submitted--> IDENTITY_PENDING`
- `IDENTITY_PENDING --identity_verified_no_authority_link_required--> DOCUMENTS_PENDING`
- `IDENTITY_PENDING --identity_verified--> AUTHORITY_LINK_PENDING`
- `AUTHORITY_LINK_PENDING --authority_link_created--> DOCUMENTS_PENDING`
- `AUTHORITY_LINK_PENDING --authority_link_not_required--> DOCUMENTS_PENDING`
- `DOCUMENTS_PENDING --required_documents_submitted--> READY_FOR_REVIEW`
- `READY_FOR_REVIEW --review_accepted--> COMPLETED`
- `INVITED --invite_expired--> EXPIRED`
- `PROFILE_PENDING --journey_abandoned--> ABANDONED`
- `IDENTITY_PENDING --journey_abandoned--> ABANDONED`
- `AUTHORITY_LINK_PENDING --journey_abandoned--> ABANDONED`
- `DOCUMENTS_PENDING --journey_abandoned--> ABANDONED`

### Rules

- only one required onboarding step may be primary at a time;
- every non-terminal state SHALL carry the lifecycle-consistent `current_step_code`, and terminal
  states SHALL clear it explicitly;
- save-and-return SHALL preserve current step context and any in-progress upload sessions;
- rebased saved drafts SHALL persist whether they are live-resumable, require explicit
  reconfirmation, or are stale-review-only carry-forward context;
- `COMPLETED` SHALL require every frozen required step to appear in `completed_steps[]`;
- `COMPLETED` SHALL also require a persisted completion summary / receipt reference;
- `EXPIRED` and `ABANDONED` SHALL require explicit terminal timestamps, and `ABANDONED` SHALL
  additionally require an explicit abandonment reason code;
- a later policy change that adds new mandatory steps SHALL create a new journey or reopen review explicitly rather than silently mutating a completed journey.

---

## 6.27 `ClientDocumentRequest.lifecycle_state`

### States

- `OPEN`
- `UPLOAD_IN_PROGRESS`
- `SUBMITTED`
- `UNDER_REVIEW`
- `ACCEPTED`
- `REJECTED`
- `WITHDRAWN`
- `EXPIRED`

### Allowed transitions

- `OPEN --upload_started--> UPLOAD_IN_PROGRESS`
- `UPLOAD_IN_PROGRESS --upload_abandoned--> OPEN`
- `UPLOAD_IN_PROGRESS --upload_submitted--> SUBMITTED`
- `SUBMITTED --review_started--> UNDER_REVIEW`
- `UNDER_REVIEW --accepted--> ACCEPTED`
- `UNDER_REVIEW --rejected_request_revision--> REJECTED`
- `REJECTED --replacement_upload_started--> UPLOAD_IN_PROGRESS`
- `OPEN --request_withdrawn--> WITHDRAWN`
- `OPEN --due_window_expired--> EXPIRED`
- `REJECTED --due_window_expired--> EXPIRED`

### Rules

- every accepted client upload SHALL be traceable through a governed `ClientUploadSession`;
- every `ClientUploadSession` SHALL preserve request-version binding, resumability posture, attachment posture, and next-action posture separately from raw transfer, scan, and validation state;
- `latest_upload_ref` SHALL remain chronological history only; `current_request_upload_ref_or_null`
  SHALL be the sole request-current pointer and SHALL reference only an upload whose
  `request_binding_state in {ORIGINAL_CURRENT, RECONFIRMED_CURRENT}`;
- `UPLOAD_IN_PROGRESS --upload_submitted--> SUBMITTED` SHALL require the current upload session to
  have `bytes_transferred = byte_count`, `integrity_state = VERIFIED`,
  `request_binding_state in {ORIGINAL_CURRENT, RECONFIRMED_CURRENT}`, `upload_confidence_score >= 70`,
  and `recovery_posture not in {HARD_RESET_REQUIRED, SUPPORT_REQUIRED}`;
- if the request rebases while an upload session is active, the request SHALL remain in
  `UPLOAD_IN_PROGRESS` or return to `OPEN` with explicit recovery posture until that upload is
  either reconfirmed for the live request version or relegated to stale history;
- an in-flight rebased upload SHALL keep the same governed session and storage lineage with
  `attachment_state = STAGED`; only an accepted stale upload may advance to
  `attachment_state = REBIND_REQUIRED` and `next_action_code = RECONFIRM_REQUEST`;
- no `ClientUploadSession` may become attached while its request binding is stale or superseded;
- resume or reconnect SHALL resume the same governed upload session when resumability remains lawful;
  duplicate session allocation for the same frozen request identity is forbidden;
- failed, quarantined, and replacement-required upload sessions SHALL preserve a typed reason and typed recovery path;
- rejection SHALL preserve the earlier uploaded evidence and reviewer outcome as audit-visible history;
- once a request is `ACCEPTED`, further uploads SHALL require explicit reopen or a new request rather than silently mutating the accepted set.

---

## 6.28 `ClientApprovalPack.lifecycle_state`

### States

- `DRAFT`
- `READY_FOR_CLIENT`
- `VIEWED`
- `ACKNOWLEDGED`
- `STEP_UP_REQUIRED`
- `SIGNED`
- `COUNTERSIGNED`
- `EXPIRED`
- `SUPERSEDED`
- `CANCELLED`

### Allowed transitions

- `DRAFT --publish_to_client--> READY_FOR_CLIENT`
- `READY_FOR_CLIENT --client_opened--> VIEWED`
- `VIEWED --client_acknowledged--> ACKNOWLEDGED`
- `ACKNOWLEDGED --step_up_challenge_required--> STEP_UP_REQUIRED`
- `STEP_UP_REQUIRED --step_up_verified--> ACKNOWLEDGED`
- `ACKNOWLEDGED --client_signed--> SIGNED`
- `SIGNED --tenant_countersigned_or_release--> COUNTERSIGNED`
- `READY_FOR_CLIENT --superseded--> SUPERSEDED`
- `VIEWED --superseded--> SUPERSEDED`
- `ACKNOWLEDGED --superseded--> SUPERSEDED`
- `READY_FOR_CLIENT --pack_expired--> EXPIRED`
- `VIEWED --pack_expired--> EXPIRED`
- `ACKNOWLEDGED --pack_expired--> EXPIRED`
- `READY_FOR_CLIENT --cancelled--> CANCELLED`

### Rules

- any material content change SHALL create a new approval pack and move the older pack to `SUPERSEDED`;
- `ACKNOWLEDGED` SHALL require non-null `change_digest_acknowledged_at`,
  `declaration_acknowledged_at`, and the current `view_guard_ref`;
- `SIGNED` SHALL require the current `approval_pack_hash`, stale-view acceptance,
  `stale_protection_state = CURRENT`, `approval_readiness_score >= 85`, and successful unexpired
  step-up when `requires_step_up = true`;
- signed packs are immutable evidence and SHALL NOT be reopened in place.

## 6.29 Cross-state invariants

The engine SHALL enforce these cross-state invariants:

1. no `SubmissionRecord.CONFIRMED` without authority-backed evidence;
2. no `FilingCase.FILED_CONFIRMED` unless a linked `SubmissionRecord` is `CONFIRMED`;
3. no `READY_TO_SUBMIT` without current `TrustSummary` and `ParityResult`;
4. no compliance submission from an `ANALYSIS` manifest;
5. no amendment case can enter `READY_TO_AMEND` if the amendment window is closed;
6. no `CANONICAL` fact may be driven only by erased evidence;
7. no `APPROVED_ACTIVE` override may outlive its expiry;
8. no artifact may bypass `SUPERSEDED`; replacement never mutates the previous artifact into the new meaning;
9. no low-noise shell frame may expose more than one primary issue or more than one primary action outside explicit compare or audit mode;
10. no reconnect or catch-up transition may discard `focus_anchor_ref` when the anchored object still exists in the latest materialized frame;
11. no `ClientApprovalPack.SIGNED` without the current `approval_pack_hash` and required step-up proof when `requires_step_up = true`;
12. no `ClientDocumentRequest.ACCEPTED` unless at least one linked `ClientUploadSession` has reached successful scan and validation, is bound to the current or reconfirmed request version, and has an explicit confirmed attachment;
13. no `ClientOnboardingJourney.COMPLETED` while required steps remain incomplete; and
14. no client portal home view may expose more than one dominant call to action or more than five global navigation destinations;
15. no `FilingCase` may enter `READY_TO_SUBMIT`, `SUBMITTED_PENDING`, `FILED_CONFIRMED`, `FILED_UNKNOWN`, or `AMENDED_CONFIRMED` without a controlling proof bundle whose closure state is `CLOSED`;
16. no `SubmissionRecord` may leave intent-only posture without a bound proof bundle hash; and
17. no `EvidenceGraph` in `REBUILD_REQUIRED` may be treated as filing-ready truth;
18. no `ClientUploadSession.ATTACHED` unless `integrity_state = VERIFIED`,
    `bytes_transferred = byte_count`, `upload_confidence_score >= 85`,
    `request_binding_state in {ORIGINAL_CURRENT, RECONFIRMED_CURRENT}`, and
    `recovery_posture = NONE`;
19. no `ClientApprovalPack.SIGNED` without `approval_readiness_score >= 85`,
    `stale_protection_state = CURRENT`, `change_digest_acknowledged_at`,
    `declaration_acknowledged_at`, and required unexpired step-up proof when
    `requires_step_up = true`; and
20. no reversible client portal flow may expose an irreversible dominant CTA while
    `ClientPortalWorkspace.reliability_summary.completion_probability < 0.40`; the dominant action
    SHALL instead be save, recover, or seek help.

## 6.30 `EvidenceGraph.lifecycle_state` and `ProofBundle.lifecycle_state`

### EvidenceGraph states

- `NOT_BUILT`
- `BUILDING`
- `BUILT`
- `LIMITED`
- `STALE`
- `REBUILD_REQUIRED`
- `SUPERSEDED`

### EvidenceGraph transition rules

- decisive late data, amendment, authority correction, or supersession touching a current filing-critical target SHALL move the graph to `STALE` or `REBUILD_REQUIRED`;
- a graph may return to `BUILT` only after target assessments, proof bundles, and integrity summary are recalculated;
- `REBUILD_REQUIRED` SHALL block straight-through filing progression.

### ProofBundle states

- `GENERATED`
- `LIMITED`
- `STALE`
- `SUPERSEDED`

### ProofBundle transition rules

- a decisive contradiction that remains unresolved SHALL move the bundle to `LIMITED` or `STALE` according to policy;
- any superseding graph version SHALL move the older controlling bundle to `SUPERSEDED`;
- a stale or superseded bundle SHALL remain queryable for historical replay but SHALL NOT remain controlling filing proof;
- stale proof and target posture SHALL retain `staleness_dependency_refs[]` so replay uses the
  original late-data lineage instead of re-running live late-data scans.

## 6.31 One-sentence summary

Every state machine in the engine must make one thing true: nothing important can change silently -
not configuration, not evidence, not filing posture, not authority acknowledgement, not client sign-off, and not amendment
eligibility.

[1]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates?utm_source=chatgpt.com
[2]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/?utm_source=chatgpt.com
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0?utm_source=chatgpt.com
[5]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html?utm_source=chatgpt.com
