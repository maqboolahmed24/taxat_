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
7. compliance-mode objects may not inherit analysis-mode states;
8. illegal transitions SHALL fail closed.

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
- review-required runs still use `run_completed`; review posture is expressed through gates/workflow and `DecisionBundle.decision_status`, not a separate manifest lifecycle state
- `COMPLETED` therefore covers both clean-complete runs and review-required-complete runs; callers SHALL inspect the `DecisionBundle` and gate chain for outcome posture
- same-request retry against a terminal manifest SHALL reload the persisted `DecisionBundle`; it SHALL NOT allocate a continuation child merely because continuation would otherwise be legal
- replay of a completed manifest SHALL create a child replay manifest; the completed manifest itself is not reopened
- a recovery child for an already-started attempt SHALL NOT be allocated while an active start lease still exists for the same attempt lineage
- `BLOCKED` is terminal for the run instance
- `FAILED` is terminal for the run instance

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

## 6.11 `TrustSummary.lifecycle_state`, `trust_band`, `trust_level`, `automation_level`, and `filing_readiness`

### Lifecycle states

- `SYNTHESIZED`
- `SUPERSEDED`

### Trust bands

- `INSUFFICIENT_DATA`
- `RED`
- `AMBER`
- `GREEN`

### Projected trust levels

- `READY`
- `REVIEW_REQUIRED`
- `BLOCKED`

### Automation levels

- `ALLOWED`
- `LIMITED`
- `BLOCKED`

### Filing readiness

- `NOT_READY`
- `READY_REVIEW`
- `READY_TO_SUBMIT`

### Allowed transitions

- `SYNTHESIZED --newer_inputs_or_overrides--> SUPERSEDED`

### Rules

- trust absence before synthesis is represented by a missing artifact or incomplete stage state, not
  by a persisted `TrustSummary.lifecycle_state = NOT_SYNTHESIZED`
- trust band is machine-facing; trust level is the projected human-facing posture
- trust is derived, not manually edited
- overrides may influence trust synthesis, but they do not mutate the old trust artifact in place

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
- `BUILT --source_or_authority_change--> STALE`
- `STALE --refresh_complete--> BUILT`
- `BUILT --newer_manifest_twin--> SUPERSEDED`

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
- `APPROVED_TO_SUBMIT` requires trust and parity gates satisfied or valid override
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
- `any_non_confirmed_state --external_filing_detected--> OUT_OF_BAND`
- `CONFIRMED --new_submission_supersedes--> SUPERSEDED`

### Rules

- only authority-backed evidence may enter `CONFIRMED`
- `UNKNOWN` is a first-class state, not an error placeholder
- `OUT_OF_BAND` means legal state exists externally but was not created by this packet flow

HMRC's APIs support calculation retrieval and final declaration submission through software, but
authority acknowledgement remains the decisive legal state. [4]

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
- `READY_TO_SUBMIT --submission_started--> SUBMITTED_PENDING`
- `SUBMITTED_PENDING --submission_confirmed--> FILED_CONFIRMED`
- `SUBMITTED_PENDING --submission_unknown--> FILED_UNKNOWN`
- `SUBMITTED_PENDING --submission_rejected--> REJECTED`
- `FILED_CONFIRMED --drift_or_authority_context_opens_amendment--> AMENDMENT_ELIGIBLE`
- `AMENDMENT_ELIGIBLE --amendment_begin--> AMENDMENT_IN_PROGRESS`
- `AMENDMENT_IN_PROGRESS --amendment_confirmed--> AMENDED_CONFIRMED`
- `AMENDED_CONFIRMED --closure_policy_met--> CLOSED`

### Rules

- `FILED_CONFIRMED` is only reachable from confirmed submission evidence
- `FILED_UNKNOWN` is not equivalent to filed
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

### Rules

- drift classification uses the filed baseline manifest, not the latest non-filed run
- `DriftRecord.lifecycle_state` SHALL mirror `DriftRecord.materiality_class` for `NO_CHANGE`, `EXPLANATION_ONLY`, `BENIGN_DRIFT`, `MATERIAL_REVIEW`, and `AMENDMENT_REQUIRED` wherever those values are shown on the same UI or workflow surface
- `REVIEW_REQUIRED` is a workflow escalation state entered after `MATERIAL_REVIEW`; it is not a separate materiality class
- expired historical evidence may limit explanation, but not erase drift history

---

## 6.22 `AmendmentCase.lifecycle_state`

### States

- `NOT_ELIGIBLE`
- `ELIGIBLE`
- `INTENT_REQUIRED`
- `INTENT_SUBMITTED`
- `READY_TO_AMEND`
- `AMEND_SUBMITTED`
- `AMEND_PENDING`
- `AMEND_CONFIRMED`
- `AMEND_REJECTED`
- `WINDOW_CLOSED`

### Allowed transitions

- `NOT_ELIGIBLE --eligibility_check_pass--> ELIGIBLE`
- `ELIGIBLE --intent_required_by_authority_flow--> INTENT_REQUIRED`
- `INTENT_REQUIRED --intent_sent--> INTENT_SUBMITTED`
- `INTENT_SUBMITTED --authority_validations_pass--> READY_TO_AMEND`
- `READY_TO_AMEND --amendment_submission_sent--> AMEND_SUBMITTED`
- `AMEND_SUBMITTED --awaiting_ack--> AMEND_PENDING`
- `AMEND_PENDING --authority_confirms--> AMEND_CONFIRMED`
- `AMEND_PENDING --authority_rejects--> AMEND_REJECTED`
- `ELIGIBLE --amendment_window_expires--> WINDOW_CLOSED`
- `READY_TO_AMEND --amendment_window_expires--> WINDOW_CLOSED`

### Rules

- amendment eligibility requires that final declaration has already been completed through software and the amendment window is still open
- where HMRC requires an intent-to-amend step, the engine must model it explicitly, not skip from "eligible" to "amended"
- a single engine run MAY record both `intent_sent` and `authority_validations_pass`, but both transitions MUST be auditable

HMRC's year-end guide states that amendments after final declaration are allowed only once final
declaration has been completed through software and within the amendment window, and that an
intent-to-amend step with validation checks is required before amendment submission is accepted. [5]

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

---

## 6.24 `ExperienceFrame.attention_state` and `ExperienceFrame.presentation_state`

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
- `LIMITED` decorates the underlying posture; it does not erase whether the system is otherwise calm, waiting, in review, or blocked

---

## 6.25 Operational release/control states

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
- `EXPIRED`

#### Allowed transitions

- `LIVE --frame_epoch_advanced--> REBASED`
- `LIVE --session_closed--> CLOSED`
- `LIVE --ttl_elapsed--> EXPIRED`
- `REBASED --snapshot_reissued--> LIVE`
- `REBASED --ttl_elapsed--> EXPIRED`
- `CLOSED --ttl_elapsed--> EXPIRED`

#### Rules

- a cursor SHALL be bound to session, tenant, principal class, manifest, and frame epoch;
- a `REBASED` cursor SHALL NOT continue consuming deltas from the prior frame epoch;
- `EXPIRED` cursors may not be reactivated in place; a fresh cursor SHALL be issued.

### C. `DeploymentRelease.rollout_state`

#### States

- `PLANNED`
- `CANARY`
- `PROMOTED`
- `ABORTED`
- `ROLLED_BACK`
- `SUPERSEDED`

#### Allowed transitions

- `PLANNED --canary_start--> CANARY`
- `CANARY --promote--> PROMOTED`
- `CANARY --abort--> ABORTED`
- `PROMOTED --rollback--> ROLLED_BACK`
- `PROMOTED --supersede--> SUPERSEDED`
- `ABORTED --supersede--> SUPERSEDED`
- `ROLLED_BACK --supersede--> SUPERSEDED`

#### Rules

- every live promotion SHALL pass through `CANARY` unless an approved emergency policy explicitly overrides it;
- `ROLLED_BACK` refers to application release posture only and SHALL NOT imply deletion of legal/audit truth;
- once `PROMOTED`, the release record SHALL preserve the exact build, config, and schema bundle provenance used.

### D. `SchemaMigrationLedger.phase_state`

#### States

- `PLANNED`
- `APPLYING`
- `APPLIED`
- `VERIFYING`
- `VERIFIED`
- `HALTED`
- `FAILED`
- `SUPERSEDED`

#### Allowed transitions

- `PLANNED --start_apply--> APPLYING`
- `APPLYING --apply_complete--> APPLIED`
- `APPLIED --start_verify--> VERIFYING`
- `VERIFYING --verify_success--> VERIFIED`
- `APPLYING --halt--> HALTED`
- `VERIFYING --halt--> HALTED`
- `APPLYING --fail--> FAILED`
- `VERIFYING --fail--> FAILED`
- `HALTED --resume--> APPLYING`
- `VERIFIED --supersede--> SUPERSEDED`

#### Rules

- destructive contract phases SHALL NOT begin before the migration is `VERIFIED`;
- `FAILED` or `HALTED` migrations SHALL block incompatible release promotion;
- replay or recovery runs that depend on older shapes SHALL continue using their frozen bundle even after a later migration is `VERIFIED`.

### E. `RecoveryCheckpoint.checkpoint_state`

#### States

- `REQUESTED`
- `CREATED`
- `VERIFIED`
- `EXPIRED`

#### Allowed transitions

- `REQUESTED --snapshot_complete--> CREATED`
- `CREATED --restore_drill_passed--> VERIFIED`
- `CREATED --retention_elapsed--> EXPIRED`
- `VERIFIED --retention_elapsed--> EXPIRED`

#### Rules

- a checkpoint SHALL NOT satisfy production restore evidence until it reaches `VERIFIED`;
- `EXPIRED` checkpoints SHALL remain ledger-visible even if the underlying backup artifact ages out;
- restore drills SHALL record the exact checkpoint used and the verification outcome.

### F. `SecretVersion.rotation_state`

#### States

- `ISSUED`
- `ACTIVE`
- `ROTATING`
- `RETIRED`
- `REVOKED`

#### Allowed transitions

- `ISSUED --activate--> ACTIVE`
- `ACTIVE --begin_rotation--> ROTATING`
- `ROTATING --cutover_complete--> RETIRED`
- `ACTIVE --revoke--> REVOKED`
- `ROTATING --revoke--> REVOKED`

#### Rules

- a secret/key version SHALL have one unambiguous activation window;
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
- save-and-return SHALL preserve current step context and any in-progress upload sessions;
- `COMPLETED` SHALL require every frozen required step to appear in `completed_steps[]`;
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
- `SIGNED` SHALL require the current `approval_pack_hash`, stale-view acceptance, and successful step-up when `requires_step_up = true`;
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
12. no `ClientDocumentRequest.ACCEPTED` unless at least one linked `ClientUploadSession` has reached successful scan and validation;
13. no `ClientOnboardingJourney.COMPLETED` while required steps remain incomplete; and
14. no client portal home view may expose more than one dominant call to action or more than five global navigation destinations.

## 6.30 One-sentence summary

Every state machine in the engine must make one thing true: nothing important can change silently -
not configuration, not evidence, not filing posture, not authority acknowledgement, not client sign-off, and not amendment
eligibility.

[1]: https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax/send-quarterly-updates?utm_source=chatgpt.com
[2]: https://developer.service.hmrc.gov.uk/roadmaps/mtd-itsa-vendors-roadmap/?utm_source=chatgpt.com
[3]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/obligations-api/3.0?utm_source=chatgpt.com
[4]: https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/individual-calculations-api/8.0?utm_source=chatgpt.com
[5]: https://developer.service.hmrc.gov.uk/guides/income-tax-mtd-end-to-end-service-guide/documentation/make-updates-at-tax-year-end.html?utm_source=chatgpt.com
