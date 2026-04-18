# Failure Lifecycle Dashboard Specification

`FailureLifecycleDashboard` is the authoritative inspection surface for one governed failure
lineage. It summarizes typed failure objects only and rejects log-only or note-only status
reconstruction.

## Error Family Matrix

| canonical_name | primary_severity | dominant_blocking_class | retry_class | remediation_class |
| --- | --- | --- | --- | --- |
| AUTHN_ERROR | ERROR | BLOCKS_RUN | HUMAN_REVIEW_THEN_RETRY | REQUEST_CLIENT_INPUT |
| AUTHZ_ERROR | CRITICAL | BLOCKS_RUN | HUMAN_REVIEW_THEN_RETRY | REQUEST_APPROVAL |
| MANIFEST_ERROR | ERROR | BLOCKS_RUN | REBUILD_THEN_RETRY | REBUILD_ARTIFACT |
| CONFIG_ERROR | ERROR | BLOCKS_RUN | REBUILD_THEN_RETRY | REQUEST_OPERATOR_REVIEW |
| INPUT_BOUNDARY_ERROR | WARNING | BLOCKS_AUTOMATION | NO_RETRY | REQUEST_CLIENT_INPUT |
| SOURCE_COLLECTION_ERROR | ERROR | BLOCKS_RUN | SAFE_RETRY | AUTO_RETRY |
| CANONICALIZATION_ERROR | ERROR | BLOCKS_RUN | REBUILD_THEN_RETRY | REBUILD_ARTIFACT |
| DATA_QUALITY_ERROR | WARNING | BLOCKS_REVIEW_PROGRESS | HUMAN_REVIEW_THEN_RETRY | REQUEST_OPERATOR_REVIEW |
| PARITY_ERROR | ERROR | BLOCKS_FILING | HUMAN_REVIEW_THEN_RETRY | REQUEST_OPERATOR_REVIEW |
| TRUST_ERROR | ERROR | BLOCKS_FILING | HUMAN_REVIEW_THEN_RETRY | REQUEST_APPROVAL |
| WORKFLOW_ERROR | ERROR | BLOCKS_REVIEW_PROGRESS | SAFE_RETRY | SPAWN_WORKFLOW |
| AUTHORITY_PROTOCOL_ERROR | ERROR | BLOCKS_AUTHORITY_CALL | RECONCILE_THEN_RETRY | AUTO_RECONCILE |
| AUTHORITY_RECONCILIATION_ERROR | ERROR | BLOCKS_FILING | RECONCILE_THEN_RETRY | OPEN_INVESTIGATION |
| AMENDMENT_ERROR | ERROR | BLOCKS_AMENDMENT | HUMAN_REVIEW_THEN_RETRY | SUPERSEDE_AND_REPLAN |
| RETENTION_ERROR | ERROR | BLOCKS_ERASURE | NO_RETRY | REQUEST_OPERATOR_REVIEW |
| PRIVACY_ERROR | CRITICAL | BLOCKS_RUN | MANUAL_INTERVENTION_REQUIRED | OPEN_INVESTIGATION |
| PROVENANCE_ERROR | CRITICAL | BLOCKS_FILING | REBUILD_THEN_RETRY | OPEN_INVESTIGATION |
| IDEMPOTENCY_ERROR | ERROR | BLOCKS_RUN | RECONCILE_THEN_RETRY | SUPERSEDE_AND_REPLAN |
| SYSTEM_FAULT | CRITICAL | BLOCKS_RUN | MANUAL_INTERVENTION_REQUIRED | OPEN_INVESTIGATION |

## Dashboard Projection Rules

| canonical_name | closure_requirements | notes |
| --- | --- | --- |
| FailureLifecycleDashboard | root_error_ref<br>current_error_ref<br>lineage_error_refs_in_order<br>current_state_source<br>current_owner<br>next_legal_action<br>blocking_scope<br>remediation_summary<br>compensation_posture<br>investigation_posture<br>accepted_risk_posture<br>workflow_coordination<br>closure_posture | Persist exactly one authoritative dashboard per governed lineage.<br>The dashboard is a read model, not mutation-side truth. |
| LineageSpine | root_error_ref<br>current_error_ref<br>lineage_error_refs_in_order | First lineage entry equals root_error_ref and last entry equals current_error_ref.<br>Supersession and reopen flows keep the root-to-current chain visible. |
| CurrentStateSource | current_state_source.source_artifact_type<br>current_state_source.source_ref | If remediation, compensation, investigation, risk approval, or workflow is active, the source must point at that typed child object. |
| CurrentOwner | current_owner.owner_type<br>current_owner.owner_ref_or_null | Accepted-risk posture still carries a current accountable owner. |
| NextLegalAction | next_legal_action.action_state<br>next_legal_action.action_code | Terminal dashboards force NO_FURTHER_ACTION.<br>Non-terminal dashboards need a concrete action code or explicit waiting posture. |
| CompensationVisibility | compensation_posture<br>root_error_ref<br>current_error_ref | Compensation posture never replaces the underlying failure chain. |
| AcceptedRiskVisibility | accepted_risk_posture<br>current_owner | Accepted risk is not silent closure; it requires approval lineage, bounded scope, expiry, and owner visibility. |
| ClosureEvidenceContinuity | closure_posture<br>lineage_refs.audit_refs<br>lineage_refs.provenance_refs | Closure evidence, audit refs, and provenance refs stay visible even when compensation or supersession appears. |
| DataSourcePolicy | underlying_error_visibility_policy<br>accepted_risk_owner_policy<br>data_source_policy<br>log_reconstruction_policy | Logs, traces, free text, UI-local joins, and unordered scans are forbidden as lifecycle truth sources. |

## Owner, Closure, and Risk Rules

| canonical_name | owner_requirement | risk_requirement | closure_requirement |
| --- | --- | --- | --- |
| ERROR_RECORD | Dominant remediation owner and object-backed next path unless system-owned automatic retry remains lawful. | Accepted-risk refs only under resolution_state = ACCEPTED_RISK. | Closure basis, evidence, and audit refs stay attached to the error. |
| REMEDIATION_TASK | Explicit owner type and owner ref unless the task is system-owned. | Task completion cannot silently close the source error. | Closure must declare error_resolution_effect and evidence refs. |
| COMPENSATION_RECORD | Explicit owner plus verification and closure basis. | Settlement does not hide the error lineage or accepted-risk posture. | Verification or supersession evidence must remain queryable. |
| FAILURE_INVESTIGATION | Durable forensic owner while ambiguity remains open. | Investigation may lead to accepted risk, but only through a typed approval companion. | Outcome and evidence remain durable even when the lineage resolves elsewhere. |
| ACCEPTED_RISK_APPROVAL | Approval lineage must still expose the current accountable owner. | Bounded scope, authorization basis, and expiry are mandatory. | Only lawful companion for accepted-risk closure. |
| FAILURE_LIFECYCLE_DASHBOARD | Projects the active owner from persisted lifecycle objects only. | Keeps risk, compensation, and investigation branches visible without substituting them for the root lineage. | No log-only reconstruction or note-derived next action. |

## Non-Negotiable Laws

- The root-to-current lineage spine remains visible through retry, remediation, investigation, compensation, supersession, and accepted risk.
- Accepted risk requires explicit approval lineage, bounded scope, expiry, and a current accountable owner.
- Compensation posture never replaces the underlying error chain.
- Closure evidence, audit refs, and provenance refs remain visible after settlement branches appear.
- The dashboard may consume persisted lifecycle objects, workflow state, audit refs, and provenance refs only.
