"""DO NOT EDIT: generated downstream from packages/contracts-core."""
from __future__ import annotations

from typing import Literal, NotRequired, Required, TypedDict

from .primitives import ExactDecimalString, ISO8601DateTimeString, JSONValue

class AuditEvent(TypedDict, total=False):
    audit_event_id: Required[str]
    event_type: Required[Literal["PrincipalAuthenticated", "StepUpRequired", "StepUpSatisfied", "AuthorityLinked", "AuthorityRelinked", "AuthorityBindingMismatchDetected", "AccessScopeBound", "ExistingDecisionBundleReturned", "ManifestContextReused", "ContinuationChildAllocated", "ConfigInheritanceResolved", "ManifestAllocated", "ManifestFrozen", "ManifestSealed", "RunStarted", "RunStartClaimRejected", "ManifestFailed", "ManifestBlocked", "ManifestCompleted", "ManifestSuperseded", "NightlyBatchAllocated", "NightlyPortfolioSelected", "NightlyClientExecutionDispatched", "NightlyClientExecutionDeferred", "NightlyClientExecutionSkipped", "NightlyClientExecutionEscalated", "NightlyBatchShardClaimed", "NightlyBatchShardReclaimed", "NightlyBatchQuiesced", "NightlyBatchCompleted", "NightlyBatchAbandoned", "OperatorMorningDigestPublished", "SourceCollectionStarted", "SourceCollectionCompleted", "SnapshotBuilt", "SnapshotValidated", "FactPromoted", "ConflictRecorded", "GateEvaluated", "ComputeCompleted", "ParityEvaluated", "TrustSynthesized", "GraphBuilt", "TwinBuilt", "WorkflowOpened", "WorkflowResolved", "OverrideRequested", "OverrideApproved", "OverrideRejected", "OverrideExpired", "FilingPacketPrepared", "SubmissionAttempted", "AuthorityOperationPlanned", "AuthorityRequestBuilt", "AuthorityRequestSent", "AuthorityResponseReceived", "AuthorityStatusNormalized", "AuthorityReconciliationAttempted", "AuthorityReconciliationResolved", "SubmissionReconciled", "SubmissionConfirmed", "SubmissionRejected", "SubmissionUnknown", "OutOfBandStateObserved", "BaselineSelected", "AmendmentWindowEvaluated", "DriftDetected", "DriftClassified", "DriftRetroactiveImpactAnalyzed", "DriftSuperseded", "AmendmentEligibilityEvaluated", "AmendmentFreshnessInvalidated", "IntentToAmendTriggered", "IntentToAmendValidated", "AmendmentBundlePrepared", "AmendmentSubmitted", "AmendmentConfirmed", "AuthorityCorrectionObserved", "AuthorityAcceptedStateInternallySuperseded", "DriftReviewEscalated", "RetentionApplied", "RetentionLimited", "LegalHoldApplied", "LegalHoldReleased", "ErasureRequested", "ErasureCompleted", "SensitiveViewOpened", "MaskedExportProduced", "BuildAttested", "ReleaseCanaryStarted", "ReleasePromoted", "ReleaseRolledBack", "SchemaMigrationPlanned", "SchemaMigrationApplied", "SchemaMigrationVerified", "SecretRotated", "BackupCreated", "RestoreDrillExecuted", "DisasterRecoveryFailedOver", "DisasterRecoveryFailedBack", "ErrorRecorded", "RemediationOpened", "RemediationCompleted", "CompensationApplied", "CompensationVerified", "ReplayPreflightValidated", "ReplayBasisCorruptionDetected", "FrozenPostSealBasisLoaded", "HistoricalAuthorityBasisReused", "HistoricalLateDataBasisReused", "ReplayOutcomeCompared", "ReplayAttested"]]
    event_time: Required[ISO8601DateTimeString]
    recorded_at: Required[ISO8601DateTimeString]
    audit_stream_ref: Required[str]
    stream_sequence: Required[int]
    tenant_id: Required[str]
    client_id: Required[str | None]
    manifest_id: Required[str | None]
    actor_ref: Required[str | None]
    service_ref: Required[str | None]
    object_refs: Required[list[str]]
    reason_codes: Required[list[str]]
    event_payload_hash: Required[str]
    prev_event_hash: Required[str | None]
    visibility_class: Required[str]
    retention_class: Required[str]
    signature_ref: Required[str | None]
    correlation_context: Required[TelemetryResource]
    retention_limited_explainability_contract: Required[RetentionLimitedExplainabilityContract]
    retained_context: Required[dict[str, JSONValue]]

AuditEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/audit_event.schema.json",
    "source_hash": "06e7edebf67e57edd998238bd42b5200ba334178157d272501ccc23b5feb51c2",
}

class CompensationRecord(TypedDict, total=False):
    compensation_id: Required[str]
    error_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    failure_resolution_contract: Required[FailureResolutionContract]
    owner_type: Required[Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "TENANT_ADMIN", "SECURITY_OPERATOR"]]
    owner_ref: Required[str | None]
    compensation_mode: Required[Literal["NONE", "MARK_AS_VOID", "MARK_AS_SUPERSEDED", "REVERT_DERIVED_ONLY", "OPEN_RECONCILIATION", "PRESERVE_AND_LIMIT", "REQUIRE_MANUAL_SETTLEMENT"]]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other", None]]
    artifact_retention_ref: Required[str | None]
    workflow_item_id: Required[str | None]
    target_object_refs: Required[list[str]]
    compensation_status: Required[Literal["PLANNED", "IN_PROGRESS", "APPLIED", "VERIFIED", "FAILED", "CANCELLED", "SUPERSEDED"]]
    compensation_steps_ref: Required[str]
    compensated_at: Required[ISO8601DateTimeString]
    verification_ref: Required[str | None]
    resolution_basis_ref: Required[str | None]
    closure_evidence_refs: Required[list[str]]
    created_at: Required[ISO8601DateTimeString]
    superseded_by_compensation_id: Required[str | None]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

CompensationRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/compensation_record.schema.json",
    "source_hash": "a4ee32a01880d7f4b65b3da141d2f4dce1af5bd49b716f36e4417e0237e30146",
}

class ErasureProof(TypedDict, total=False):
    erasure_proof_id: Required[str]
    manifest_id: Required[str]
    target_ref: Required[str]
    erasure_action_ref: Required[str]
    proof_hash: Required[str]
    created_at: Required[ISO8601DateTimeString]

ErasureProofSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/erasure_proof.schema.json",
    "source_hash": "b14acee99b4f8291f68134c51c1090a4749b66858be7af9da7a790ef4c19eeca",
}

class ErrorRecord(TypedDict, total=False):
    error_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    error_family: Required[Literal["AUTHN_ERROR", "AUTHZ_ERROR", "MANIFEST_ERROR", "CONFIG_ERROR", "INPUT_BOUNDARY_ERROR", "SOURCE_COLLECTION_ERROR", "CANONICALIZATION_ERROR", "DATA_QUALITY_ERROR", "PARITY_ERROR", "TRUST_ERROR", "WORKFLOW_ERROR", "AUTHORITY_PROTOCOL_ERROR", "AUTHORITY_RECONCILIATION_ERROR", "AMENDMENT_ERROR", "RETENTION_ERROR", "PRIVACY_ERROR", "PROVENANCE_ERROR", "IDEMPOTENCY_ERROR", "SYSTEM_FAULT"]]
    error_code: Required[str]
    error_title: Required[str]
    error_description_template: Required[str]
    severity: Required[Literal["INFO", "NOTICE", "WARNING", "ERROR", "CRITICAL"]]
    blocking_class: Required[Literal["NON_BLOCKING", "BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL"]]
    blocking_effects: Required[list[ErrorRecordBlockingEffect]]
    retry_class: Required[Literal["NO_RETRY", "SAFE_RETRY", "RECONCILE_THEN_RETRY", "HUMAN_REVIEW_THEN_RETRY", "REBUILD_THEN_RETRY", "MANUAL_INTERVENTION_REQUIRED"]]
    retry_attempt_count: Required[int]
    retry_budget_class: Required[Literal["NONE", "SINGLE_ATTEMPT", "BOUNDED_EXPONENTIAL", "RECONCILIATION_GATED", "HUMAN_GATED"]]
    next_retry_at: Required[ISO8601DateTimeString]
    retry_precondition_refs: Required[list[str]]
    retry_idempotency_scope_ref: Required[str | None]
    remediation_class: Required[Literal["AUTO_RETRY", "AUTO_RECONCILE", "SPAWN_WORKFLOW", "REQUEST_CLIENT_INPUT", "REQUEST_OPERATOR_REVIEW", "REQUEST_APPROVAL", "REBUILD_ARTIFACT", "OPEN_INVESTIGATION", "SUPERSEDE_AND_REPLAN", "ABORT_TERMINALLY"]]
    remediation_owner_type: Required[Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "CLIENT", "TENANT_ADMIN", "SECURITY_OPERATOR"]]
    failure_resolution_contract: Required[FailureResolutionContract]
    invariant_enforcement_contract: Required[InvariantEnforcementContract]
    remediation_owner_ref: Required[str | None]
    reason_codes: Required[list[str]]
    affected_object_refs: Required[list[str]]
    source_object_refs: Required[list[str]]
    caused_by_error_id: Required[str | None]
    originating_activity_ref: Required[str | None]
    actor_ref: Required[str | None]
    service_ref: Required[str | None]
    authority_operation_ref: Required[str | None]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other", None]]
    artifact_retention_ref: Required[str | None]
    workflow_item_id: Required[str | None]
    remediation_task_ref: Required[str | None]
    failure_investigation_ref: Required[str | None]
    compensation_record_ref: Required[str | None]
    next_action_ref: Required[str | None]
    customer_visibility_class: Required[str]
    operator_visibility_class: Required[str]
    opened_at: Required[ISO8601DateTimeString]
    resolved_at: Required[ISO8601DateTimeString]
    resolution_state: Required[Literal["OPEN", "IN_PROGRESS", "MONITORING", "RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"]]
    resolution_basis_ref: Required[str | None]
    closure_evidence_refs: Required[list[str]]
    resolved_by_task_id: Required[str | None]
    accepted_risk_approval_ref: Required[str | None]
    accepted_risk_expires_at: Required[ISO8601DateTimeString]
    reopened_by_error_id: Required[str | None]
    dedupe_key: Required[str]
    dedupe_scope: Required[str]
    first_seen_at: Required[ISO8601DateTimeString]
    last_seen_at: Required[ISO8601DateTimeString]
    occurrence_count: Required[int]
    escalation_state: Required[Literal["NONE", "OPERATOR_ESCALATED", "RECONCILIATION_ESCALATED", "TENANT_ADMIN_ESCALATED", "SECURITY_ESCALATED", "INCIDENT_ESCALATED"]]
    escalated_at: Required[ISO8601DateTimeString]
    resolution_notes_ref: Required[str | None]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

class ErrorRecordBlockingEffect(TypedDict, total=False):
    capability_code: Required[str]
    impact_level: Required[Literal["BLOCKED", "DEGRADED", "REVIEW_REQUIRED"]]
    reason_codes: Required[list[str]]
    affected_object_refs: Required[list[str]]

ErrorRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/error_record.schema.json",
    "source_hash": "f0ff4f9d08f635a0b85b985738fafbf226292817153040ddd609d4af4acf281c",
}

class FailureInvestigation(TypedDict, total=False):
    investigation_id: Required[str]
    error_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    failure_resolution_contract: Required[FailureResolutionContract]
    investigation_class: Required[Literal["AUTHORITY_STATE_AMBIGUITY", "AMENDMENT_READINESS", "RETENTION_PRIVACY_EXCEPTION", "AUDIT_PROVENANCE_DIVERGENCE", "SECURITY_ACCESS_ANOMALY", "SYSTEM_INVARIANT_BREACH", "MULTI_ERROR_CORRELATION"]]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other", None]]
    artifact_retention_ref: Required[str | None]
    workflow_item_id: Required[str | None]
    owner_type: Required[Literal["SERVICE_OPERATOR", "REVIEWER", "APPROVER", "TENANT_ADMIN", "SECURITY_OPERATOR"]]
    owner_ref: Required[str | None]
    priority: Required[Literal["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"]]
    investigation_state: Required[Literal["OPEN", "EVIDENCE_GATHERING", "AWAITING_EXTERNAL_INPUT", "IN_REVIEW", "RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"]]
    investigation_steps_ref: Required[str]
    due_at: Required[ISO8601DateTimeString]
    opened_at: Required[ISO8601DateTimeString]
    last_activity_at: Required[ISO8601DateTimeString]
    resolved_at: Required[ISO8601DateTimeString]
    resolution_basis_ref: Required[str | None]
    outcome: Required[Literal["ROOT_CAUSE_CONFIRMED", "FALSE_POSITIVE", "RETRY_AUTHORIZED", "RECONCILIATION_REQUIRED", "REMEDIATION_SPAWNED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED", None]]
    accepted_risk_approval_ref: Required[str | None]
    superseded_by_investigation_id: Required[str | None]
    closure_evidence_refs: Required[list[str]]
    remediation_task_refs: Required[list[str]]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

FailureInvestigationSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/failure_investigation.schema.json",
    "source_hash": "4408a97aad3eaeec2a269e73db3bd44163792e958db1192d75a30d02371b5849",
}

type FailureLifecycleDashboardSourceArtifactType = Literal["ERROR_RECORD", "REMEDIATION_TASK", "COMPENSATION_RECORD", "FAILURE_INVESTIGATION", "ACCEPTED_RISK_APPROVAL", "WORKFLOW_ITEM"]

type FailureLifecycleDashboardOwnerType = Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "CLIENT", "TENANT_ADMIN", "SECURITY_OPERATOR"]

class FailureLifecycleDashboard(TypedDict, total=False):
    artifact_type: Required[Literal["FailureLifecycleDashboard"]]
    dashboard_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    root_error_ref: Required[str]
    current_error_ref: Required[str]
    lineage_error_refs_in_order: Required[list[str]]
    current_lineage_state: Required[Literal["OPEN_FAILURE", "RETRY_SCHEDULED", "REMEDIATION_ACTIVE", "INVESTIGATION_ACTIVE", "COMPENSATION_ACTIVE", "ACCEPTED_RISK_ACTIVE", "RESOLVED", "SUPERSEDED", "CANCELLED"]]
    current_state_source: Required[FailureLifecycleDashboardStateSource]
    current_owner: Required[FailureLifecycleDashboardCurrentOwner]
    next_legal_action: Required[FailureLifecycleDashboardNextLegalAction]
    blocking_scope: Required[FailureLifecycleDashboardBlockingScope]
    first_opened_at: Required[ISO8601DateTimeString]
    last_activity_at: Required[ISO8601DateTimeString]
    remediation_summary: Required[FailureLifecycleDashboardRemediationSummary]
    compensation_posture: Required[FailureLifecycleDashboardCompensationPosture]
    investigation_posture: Required[FailureLifecycleDashboardInvestigationPosture]
    accepted_risk_posture: Required[FailureLifecycleDashboardAcceptedRiskPosture]
    workflow_coordination: Required[FailureLifecycleDashboardWorkflowCoordination]
    closure_posture: Required[FailureLifecycleDashboardClosurePosture]
    lineage_refs: Required[FailureLifecycleDashboardLineageRefs]
    underlying_error_visibility_policy: Required[Literal["UNDERLYING_ERROR_ALWAYS_VISIBLE"]]
    accepted_risk_owner_policy: Required[Literal["ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY"]]
    data_source_policy: Required[Literal["PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY"]]
    log_reconstruction_policy: Required[Literal["NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION"]]
    updated_at: Required[ISO8601DateTimeString]

class FailureLifecycleDashboardStateSource(TypedDict, total=False):
    source_artifact_type: Required[FailureLifecycleDashboardSourceArtifactType]
    source_ref: Required[str]
    state_code: Required[str]
    state_changed_at: Required[ISO8601DateTimeString]

class FailureLifecycleDashboardCurrentOwner(TypedDict, total=False):
    owner_type: Required[FailureLifecycleDashboardOwnerType]
    owner_ref_or_null: Required[str | None]
    source_artifact_type: Required[FailureLifecycleDashboardSourceArtifactType]
    source_ref: Required[str]

class FailureLifecycleDashboardNextLegalAction(TypedDict, total=False):
    action_state: Required[Literal["ACTION_AVAILABLE", "WAITING_ON_EXTERNAL", "WAITING_ON_SCHEDULE", "REVIEW_DUE", "NO_FURTHER_ACTION"]]
    action_code_or_null: Required[str | None]
    action_ref_or_null: Required[str | None]
    source_artifact_type_or_null: Required[Literal["ERROR_RECORD", "REMEDIATION_TASK", "COMPENSATION_RECORD", "FAILURE_INVESTIGATION", "ACCEPTED_RISK_APPROVAL", "WORKFLOW_ITEM", None]]
    due_at_or_null: Required[ISO8601DateTimeString]
    waiting_on_actor_or_null: Required[Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM", None]]
    reason_codes: Required[list[str]]

class FailureLifecycleDashboardBlockingScope(TypedDict, total=False):
    blocking_class: Required[Literal["NON_BLOCKING", "BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL"]]
    reason_codes: Required[list[str]]
    affected_object_refs: Required[list[str]]
    workflow_item_ref_or_null: Required[str | None]

class FailureLifecycleDashboardRemediationSummary(TypedDict, total=False):
    active_task_ref_or_null: Required[str | None]
    latest_task_ref_or_null: Required[str | None]
    task_state_or_null: Required[Literal["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED", "SUPERSEDED", None]]
    task_owner_type_or_null: Required[Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "CLIENT", "TENANT_ADMIN", "SECURITY_OPERATOR", None]]
    task_owner_ref_or_null: Required[str | None]
    due_at_or_null: Required[ISO8601DateTimeString]
    error_resolution_effect_or_null: Required[Literal["ERROR_REMAINS_OPEN", "ERROR_MOVES_TO_IN_PROGRESS", "ERROR_MOVES_TO_MONITORING", "ERROR_MOVES_TO_RESOLVED", "ERROR_MOVES_TO_ACCEPTED_RISK", "ERROR_MOVES_TO_SUPERSEDED", "ERROR_MOVES_TO_CANCELLED", None]]

class FailureLifecycleDashboardCompensationPosture(TypedDict, total=False):
    state: Required[Literal["NONE", "PLANNED", "IN_PROGRESS", "APPLIED", "VERIFIED", "FAILED", "CANCELLED", "SUPERSEDED"]]
    active_compensation_ref_or_null: Required[str | None]
    latest_compensation_ref_or_null: Required[str | None]
    target_object_refs: Required[list[str]]
    verification_ref_or_null: Required[str | None]
    resolution_basis_ref_or_null: Required[str | None]
    closure_evidence_refs: Required[list[str]]

class FailureLifecycleDashboardInvestigationPosture(TypedDict, total=False):
    state: Required[Literal["NONE", "ACTIVE", "RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"]]
    active_investigation_ref_or_null: Required[str | None]
    latest_investigation_ref_or_null: Required[str | None]
    accepted_risk_approval_ref_or_null: Required[str | None]
    outcome_or_null: Required[Literal["ROOT_CAUSE_CONFIRMED", "FALSE_POSITIVE", "RETRY_AUTHORIZED", "RECONCILIATION_REQUIRED", "REMEDIATION_SPAWNED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED", None]]

class FailureLifecycleDashboardAcceptedRiskPosture(TypedDict, total=False):
    state: Required[Literal["NONE", "ACTIVE", "EXPIRED", "REVOKED", "SUPERSEDED"]]
    approval_ref_or_null: Required[str | None]
    decision_basis_or_null: Required[Literal["EXPLICIT_APPROVAL", "POLICY_BASIS", None]]
    approver_type_or_null: Required[Literal["APPROVER", "TENANT_ADMIN", "SECURITY_OPERATOR", "SYSTEM_POLICY", None]]
    approver_ref_or_null: Required[str | None]
    bounded_scope_refs: Required[list[str]]
    expires_at_or_null: Required[ISO8601DateTimeString]
    revoked_at_or_null: Required[ISO8601DateTimeString]
    accountable_owner_type_or_null: Required[Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "CLIENT", "TENANT_ADMIN", "SECURITY_OPERATOR", None]]
    accountable_owner_ref_or_null: Required[str | None]

class FailureLifecycleDashboardWorkflowCoordination(TypedDict, total=False):
    workflow_item_ref_or_null: Required[str | None]
    lifecycle_state_or_null: Required[Literal["OPEN", "IN_PROGRESS", "WAITING_ON_CLIENT", "WAITING_ON_AUTHORITY", "BLOCKED", "DONE", "CANCELLED", "STALE", None]]
    current_assignee_ref_or_null: Required[str | None]
    waiting_on_actor_or_null: Required[Literal["NONE", "CUSTOMER", "STAFF", "AUTHORITY", "SYSTEM", None]]
    customer_status_projection_or_null: Required[Literal["UNDER_REVIEW", "ACTION_REQUIRED", "WAITING_ON_CONFIRMATION", "RESOLVED", "CLOSED", None]]

class FailureLifecycleDashboardClosurePosture(TypedDict, total=False):
    resolution_state: Required[Literal["OPEN", "IN_PROGRESS", "MONITORING", "RESOLVED", "ACCEPTED_RISK", "SUPERSEDED", "CANCELLED"]]
    resolution_basis_ref_or_null: Required[str | None]
    closure_evidence_refs: Required[list[str]]
    resolved_by_task_id_or_null: Required[str | None]
    resolved_at_or_null: Required[ISO8601DateTimeString]

class FailureLifecycleDashboardLineageRefs(TypedDict, total=False):
    remediation_task_refs: Required[list[str]]
    compensation_record_refs: Required[list[str]]
    failure_investigation_refs: Required[list[str]]
    accepted_risk_approval_refs: Required[list[str]]
    workflow_item_refs: Required[list[str]]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

FailureLifecycleDashboardSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/failure_lifecycle_dashboard.schema.json",
    "source_hash": "eaf04798471c8509a9ef22e7c6ed20f1e1cc833449d7f0b4bae29606ed25a2a9",
}

class FailureResolutionContract(TypedDict, total=False):
    contract_version: Required[Literal["FAILURE_RESOLUTION_V1"]]
    lifecycle_role: Required[Literal["ERROR_RECORD", "REMEDIATION_TASK", "COMPENSATION_RECORD", "FAILURE_INVESTIGATION", "ACCEPTED_RISK_APPROVAL"]]
    role_specific_binding_policy: Required[Literal["ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS", "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR", "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE", "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE", "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS"]]
    material_failure_policy: Required[Literal["NO_MATERIAL_FAILURE_WITHOUT_DURABLE_OBJECT"]]
    ownership_policy: Required[Literal["OWNER_TYPE_AND_REF_OR_EXPLICIT_SYSTEM_OWNER_REQUIRED"]]
    next_action_policy: Required[Literal["OPEN_FAILURES_REQUIRE_ONE_LAWFUL_NEXT_PATH"]]
    retry_policy: Required[Literal["RETRY_CLASS_BUDGET_AND_PRECONDITIONS_BIND_EXECUTION"]]
    closure_policy: Required[Literal["TERMINAL_OR_COMPLETED_STATES_REQUIRE_BASIS_EVIDENCE_AND_AUDIT"]]
    accepted_risk_policy: Required[Literal["ACCEPTED_RISK_REQUIRES_APPROVAL_EXPIRY_AND_BOUNDED_SCOPE"]]
    linkage_policy: Required[Literal["ERROR_TASK_COMPENSATION_INVESTIGATION_APPROVAL_LINKS_MUST_STAY_COHERENT"]]

FailureResolutionContractSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/failure_resolution_contract.schema.json",
    "source_hash": "8f2aa4dfc10855f3385abe43ad110e6317c3391b5ee0b5911662a1f565fb896f",
}

class LogRecord(TypedDict, total=False):
    artifact_type: Required[Literal["LogRecord"]]
    log_record_id: Required[str]
    timestamp: Required[ISO8601DateTimeString]
    severity: Required[Literal["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"]]
    log_family: Required[Literal["RUNTIME", "SESSION_SECURITY", "ACCESS_CONTROL", "PRIVACY_RETENTION", "AUTHORITY_EDGE"]]
    access_tier: Required[Literal["STANDARD_OPERATIONS", "SECURITY_RESTRICTED", "PRIVACY_RESTRICTED"]]
    retention_class: Required[str]
    service_name: Required[str]
    environment_ref: Required[str]
    resource_ref: Required[TelemetryResource]
    event_code: Required[str]
    correlation_context: Required[TelemetryResource]
    message_template: Required[str]
    structured_fields: Required[dict[str, TelemetryResource]]

LogRecordSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/log_record.schema.json",
    "source_hash": "19c4427772a90b4ac60cec4d74c311015eba6aa7d4932845d1e6eaff449095a4",
}

class MetricEvent(TypedDict, total=False):
    metric_event_id: Required[str]
    metric_family: Required[Literal["RUN_OUTCOME_RATE", "NIGHTLY_BATCH_OUTCOME_RATE", "AUTHORITY_REQUEST_OUTCOME_RATE", "RECONCILIATION_RESOLUTION_RATE", "AMENDMENT_OUTCOME_RATE", "EXPERIENCE_STREAM_RESUME_REBASE_RATE", "STALE_VIEW_CONFLICT_RATE", "RELEASE_CANARY_ABORT_RATE", "MIGRATION_OUTCOME_RATE", "RESTORE_DRILL_SUCCESS_RATE", "RESTORE_DRILL_AGE", "COMPLETENESS_SCORE_DISTRIBUTION", "DATA_QUALITY_SCORE_DISTRIBUTION", "PARITY_CLASSIFICATION_DISTRIBUTION", "TRUST_BAND_DISTRIBUTION", "GRAPH_CRITICAL_PATH_COVERAGE_DISTRIBUTION", "MODULE_LATENCY", "QUEUE_DELAY", "OPERATOR_DIGEST_PUBLISH_LATENCY", "NIGHTLY_SELECTION_DISPOSITION_COUNT", "RETRY_VOLUME", "DUPLICATE_SUPPRESSION_VOLUME", "RETENTION_LIMITATION_VOLUME", "ERASURE_THROUGHPUT", "STREAM_HEARTBEAT_LAG", "OUTBOX_BACKLOG_AGE", "INBOX_DEDUPE_HIT_RATE", "SECRET_ROTATION_LAG", "BACKUP_FRESHNESS_BY_RECOVERY_TIER", "STEP_UP_EVENTS", "ACCESS_DENIALS", "MASKED_VS_FULL_SENSITIVE_VIEWS", "EXPORT_ATTEMPTS", "LEGAL_HOLD_BLOCKS", "ERASURE_BLOCKS", "CSRF_REJECTION_RATE", "SESSION_REVOCATIONS", "EGRESS_POLICY_VIOLATIONS", "SIGNED_BUILD_VERIFICATION_FAILURES"]]
    instrument_kind: Required[Literal["COUNTER", "GAUGE", "HISTOGRAM"]]
    resource_ref: Required[TelemetryResource]
    observed_at: Required[ISO8601DateTimeString]
    value: Required[float]
    unit: Required[str | None]
    dimensions: Required[TelemetryResource]
    correlation_context: Required[TelemetryResource]

MetricEventSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/metric_event.schema.json",
    "source_hash": "f3a375bab8664cf2375fc3a01b12e4967c19c12e6a6a3aab61bb8bc8cf639768",
}

class RemediationTask(TypedDict, total=False):
    task_id: Required[str]
    error_id: Required[str]
    manifest_id: Required[str]
    root_manifest_id: Required[str]
    task_type: Required[Literal["FIX_DATA", "RESOLVE_CONFLICT", "REVIEW_PARITY", "APPROVE_OVERRIDE", "RELINK_AUTHORITY", "RETRY_AUTHORITY_OPERATION", "RECONCILE_SUBMISSION_STATE", "REQUEST_SUPPORTING_EVIDENCE", "CHECK_RETENTION_HOLD", "REPLAY_RUN", "ESCALATE_SECURITY_ISSUE", "OPEN_FAILURE_INVESTIGATION"]]
    owner_type: Required[Literal["SYSTEM", "SERVICE_OPERATOR", "REVIEWER", "APPROVER", "CLIENT", "TENANT_ADMIN", "SECURITY_OPERATOR"]]
    owner_ref: Required[str | None]
    failure_resolution_contract: Required[FailureResolutionContract]
    due_at: Required[ISO8601DateTimeString]
    priority: Required[Literal["LOW", "NORMAL", "HIGH", "URGENT", "CRITICAL"]]
    task_state: Required[Literal["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "COMPLETED", "CANCELLED", "SUPERSEDED"]]
    remediation_steps_ref: Required[str]
    blocking_class: Required[Literal["NON_BLOCKING", "BLOCKS_AUTOMATION", "BLOCKS_REVIEW_PROGRESS", "BLOCKS_FILING", "BLOCKS_AMENDMENT", "BLOCKS_ERASURE", "BLOCKS_RUN", "BLOCKS_AUTHORITY_CALL"]]
    retention_class: Required[Literal["regulated_record", "derived_artifact", "operational_log", "analytics_projection", "policy_governed_other", None]]
    artifact_retention_ref: Required[str | None]
    workflow_item_id: Required[str | None]
    superseded_by_task_id: Required[str | None]
    closure_outcome: Required[Literal["FIX_APPLIED", "CONFLICT_RESOLVED", "PARITY_REVIEW_COMPLETED", "OVERRIDE_APPROVED", "AUTHORITY_RELINKED", "AUTHORITY_RETRIED", "SUBMISSION_RECONCILED", "EVIDENCE_REQUESTED", "HOLD_CONFIRMED", "RUN_REPLAYED", "SECURITY_ESCALATED", "INVESTIGATION_OPENED", "ACCEPTED_RISK", "CANCELLED", "SUPERSEDED", None]]
    resolution_basis_ref: Required[str | None]
    closure_evidence_refs: Required[list[str]]
    error_resolution_effect: Required[Literal["ERROR_REMAINS_OPEN", "ERROR_MOVES_TO_IN_PROGRESS", "ERROR_MOVES_TO_MONITORING", "ERROR_MOVES_TO_RESOLVED", "ERROR_MOVES_TO_ACCEPTED_RISK", "ERROR_MOVES_TO_SUPERSEDED", "ERROR_MOVES_TO_CANCELLED"]]
    created_at: Required[ISO8601DateTimeString]
    started_at: Required[ISO8601DateTimeString]
    completed_at: Required[ISO8601DateTimeString]
    accepted_risk_approval_ref: Required[str | None]
    investigation_ref: Required[str | None]
    audit_refs: Required[list[str]]
    provenance_refs: Required[list[str]]

RemediationTaskSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/remediation_task.schema.json",
    "source_hash": "7667724987bf13d3a9a0fc1a45b2394d48806e34907050a038986a67fe302897",
}

type TelemetryResourceResourceRef = str

type TelemetryResourceAttributeValue = str | float | int | bool | None

class TelemetryResource(TypedDict, total=False):
    resource_id: Required[str]
    service_name: Required[str]
    environment_ref: Required[str]
    build_ref: Required[str]
    deployment_identity: Required[dict[str, JSONValue]]
    resource_attributes: NotRequired[TelemetryResourceAttributeMap]

class TelemetryResourceAttributeMap(TypedDict, total=False):
    pass

class TelemetryResourceCorrelationContext(TypedDict, total=False):
    tenant_id: NotRequired[str]
    client_id: NotRequired[str | None]
    manifest_id: NotRequired[str | None]
    root_manifest_id: NotRequired[str | None]
    parent_manifest_id: NotRequired[str | None]
    continuation_of_manifest_id: NotRequired[str | None]
    replay_of_manifest_id: NotRequired[str | None]
    nightly_batch_run_ref: NotRequired[str | None]
    nightly_window_key: NotRequired[str | None]
    selection_disposition: NotRequired[Literal["EXECUTE_NEW_MANIFEST", "EXECUTE_CONTINUATION_CHILD", "REUSE_EXISTING_TERMINAL_RESULT", "DEFER_ACTIVE_ATTEMPT", "DEFER_RETRY_WINDOW", "ESCALATE_ONLY", "SKIP_INELIGIBLE", None]]
    trace_id: NotRequired[str | None]
    span_id: NotRequired[str | None]
    run_kind: NotRequired[Literal["INTERACTIVE", "NIGHTLY", "BACKFILL", "REPLAY", "REMEDIATION", "AMENDMENT", "MIGRATION", None]]
    mode: NotRequired[Literal["COMPLIANCE", "ANALYSIS", None]]
    replay_class: NotRequired[Literal["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS", None]]
    comparison_mode: NotRequired[Literal["EXACT_HASH_MATCH", "COUNTERFACTUAL_DECLARED", "LIMITED_HISTORICAL_COMPARISON", "BASIS_INCOMPLETE", "BASIS_CORRUPT", None]]
    basis_validation_state: NotRequired[Literal["VALID", "RETENTION_LIMITED", "MISSING_DEPENDENCY", "CORRUPT", "SCHEMA_INCOMPATIBLE", "BUILD_UNAVAILABLE", None]]
    idempotency_key: NotRequired[str | None]
    access_binding_hash: NotRequired[str | None]
    continuation_basis: NotRequired[str | None]
    input_inheritance_mode: NotRequired[Literal["FRESH_CHILD_COLLECTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    config_inheritance_mode: NotRequired[Literal["FRESH_CHILD_RESOLUTION", "REPLAY_EXACT", "RECOVERY_EXACT", "HISTORICAL_EXPLICIT", None]]
    gate_code: NotRequired[str | None]
    workflow_item_id: NotRequired[str | None]
    task_id: NotRequired[str | None]
    investigation_id: NotRequired[str | None]
    compensation_id: NotRequired[str | None]
    accepted_risk_approval_id: NotRequired[str | None]
    submission_record_id: NotRequired[str | None]
    drift_id: NotRequired[str | None]
    amendment_case_id: NotRequired[str | None]
    amendment_bundle_id: NotRequired[str | None]
    baseline_envelope_id: NotRequired[str | None]
    retroactive_impact_id: NotRequired[str | None]
    authority_operation_id: NotRequired[str | None]
    error_id: NotRequired[str | None]
    retention_class: NotRequired[str | None]
    service_name: NotRequired[str | None]
    environment_ref: NotRequired[str | None]
    code_build_id: NotRequired[str | None]
    expected_execution_basis_hash: NotRequired[str | None]
    actual_execution_basis_hash: NotRequired[str | None]
    expected_deterministic_outcome_hash: NotRequired[str | None]
    actual_deterministic_outcome_hash: NotRequired[str | None]
    manifest_lineage_trace_ref: NotRequired[str | None]
    manifest_branch_decision: NotRequired[ManifestBranchDecisionContract]
    manifest_start_claim: NotRequired[ManifestStartClaimContract]

TelemetryResourceSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/telemetry_resource.schema.json",
    "source_hash": "6fcd25e2766afe7043d8fc5573fd4a43cf657c5c697e0833588a5599ea491ec9",
}

class TraceSpan(TypedDict, total=False):
    artifact_type: Required[Literal["TraceSpan"]]
    span_scope_class: Required[Literal["MANIFEST_RUNTIME"]]
    trace_id: Required[str]
    span_id: Required[str]
    parent_span_id: Required[str | None]
    manifest_id: Required[str]
    resource_ref: Required[TelemetryResource]
    span_code: Required[Literal["RUN_ROOT", "PRIOR_MANIFEST_CONTEXT_LOAD", "REUSE_CONTINUATION_DECISION", "CONFIG_RESOLVE_OR_INHERITANCE_DECISION", "EXISTING_DECISION_BUNDLE_RELOAD", "MANIFEST_FREEZE", "MANIFEST_START_CLAIM", "SOURCE_COLLECTION", "SNAPSHOT_BUILD", "COMPUTE", "PARITY", "TRUST", "GRAPH_BUILD", "FILING_PACKET_BUILD", "AUTHORITY_REQUEST_BUILD", "AUTHORITY_TRANSMIT", "AUTHORITY_RECONCILE", "DRIFT_DETECT", "AMENDMENT_EVALUATE", "RETENTION_APPLY", "ERASURE_EXECUTE", "OTHER"]]
    sampling_class: Required[Literal["MANDATORY_FORENSIC", "DETERMINISTIC_RETAIN", "SAMPLED_OPERATIONAL"]]
    retention_class: Required[str]
    started_at: Required[ISO8601DateTimeString]
    ended_at: Required[ISO8601DateTimeString]
    status_code: Required[Literal["UNSET", "OK", "ERROR"]]
    correlation_context: Required[TelemetryResource]
    span_attributes: Required[TelemetryResource]

TraceSpanSchemaLineage = {
    "schema_id": "https://taxat.dev/schemas/trace_span.schema.json",
    "source_hash": "824e99148781a7cb5ba8aaeb88a23762c676aef65996cac7108179af857bbf13",
}

RetentionFailureAndObservabilityBindingManifest = {"family_ref": "RETENTION_FAILURE_AND_OBSERVABILITY", "schema_count": 12}
