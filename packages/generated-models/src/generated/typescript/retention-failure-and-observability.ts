/* DO NOT EDIT: generated downstream from packages/contracts-core. */
import type { ExactDecimalString, ISO8601DateTimeString, JsonValue } from "./primitives";

export type AuditEvent = {
  "manifest_id": string;
} | {
  "correlation_context": {
    "submission_record_id": string;
  };
} | {
  "correlation_context": {
    "nightly_batch_run_ref": string;
  };
} | {
  "correlation_context": {
    "authority_operation_id": string;
  };
} & {
  "actor_ref": string;
} | {
  "service_ref": string;
};
export const AuditEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/audit_event.schema.json", sourceHash: "06e7edebf67e57edd998238bd42b5200ba334178157d272501ccc23b5feb51c2" } as const;

export type CompensationRecord = {
  "compensation_id": string;
  "error_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "failure_resolution_contract": FailureResolutionContract & {
    "lifecycle_role"?: "COMPENSATION_RECORD";
    "role_specific_binding_policy"?: "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE";
  };
  "owner_type": "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "TENANT_ADMIN" | "SECURITY_OPERATOR";
  "owner_ref": string | null;
  "compensation_mode": "NONE" | "MARK_AS_VOID" | "MARK_AS_SUPERSEDED" | "REVERT_DERIVED_ONLY" | "OPEN_RECONCILIATION" | "PRESERVE_AND_LIMIT" | "REQUIRE_MANUAL_SETTLEMENT";
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other" | null;
  "artifact_retention_ref": string | null;
  "workflow_item_id": string | null;
  "target_object_refs": Array<string>;
  "compensation_status": "PLANNED" | "IN_PROGRESS" | "APPLIED" | "VERIFIED" | "FAILED" | "CANCELLED" | "SUPERSEDED";
  "compensation_steps_ref": string;
  "compensated_at": ISO8601DateTimeString;
  "verification_ref": string | null;
  "resolution_basis_ref": string | null;
  "closure_evidence_refs": Array<string>;
  "created_at": ISO8601DateTimeString;
  "superseded_by_compensation_id": string | null;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const CompensationRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/compensation_record.schema.json", sourceHash: "a4ee32a01880d7f4b65b3da141d2f4dce1af5bd49b716f36e4417e0237e30146" } as const;

export type ErasureProof = {
  "erasure_proof_id": string;
  "manifest_id": string;
  "target_ref": string;
  "erasure_action_ref": string;
  "proof_hash": string;
  "created_at": ISO8601DateTimeString;
};
export const ErasureProofSchemaLineage = { schemaId: "https://taxat.dev/schemas/erasure_proof.schema.json", sourceHash: "b14acee99b4f8291f68134c51c1090a4749b66858be7af9da7a790ef4c19eeca" } as const;

export type ErrorRecord = {
  "error_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "error_family": "AUTHN_ERROR" | "AUTHZ_ERROR" | "MANIFEST_ERROR" | "CONFIG_ERROR" | "INPUT_BOUNDARY_ERROR" | "SOURCE_COLLECTION_ERROR" | "CANONICALIZATION_ERROR" | "DATA_QUALITY_ERROR" | "PARITY_ERROR" | "TRUST_ERROR" | "WORKFLOW_ERROR" | "AUTHORITY_PROTOCOL_ERROR" | "AUTHORITY_RECONCILIATION_ERROR" | "AMENDMENT_ERROR" | "RETENTION_ERROR" | "PRIVACY_ERROR" | "PROVENANCE_ERROR" | "IDEMPOTENCY_ERROR" | "SYSTEM_FAULT";
  "error_code": string;
  "error_title": string;
  "error_description_template": string;
  "severity": "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";
  "blocking_class": "NON_BLOCKING" | "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL";
  "blocking_effects": Array<ErrorRecordBlockingEffect>;
  "retry_class": "NO_RETRY" | "SAFE_RETRY" | "RECONCILE_THEN_RETRY" | "HUMAN_REVIEW_THEN_RETRY" | "REBUILD_THEN_RETRY" | "MANUAL_INTERVENTION_REQUIRED";
  "retry_attempt_count": number;
  "retry_budget_class": "NONE" | "SINGLE_ATTEMPT" | "BOUNDED_EXPONENTIAL" | "RECONCILIATION_GATED" | "HUMAN_GATED";
  "next_retry_at": ISO8601DateTimeString;
  "retry_precondition_refs": Array<string>;
  "retry_idempotency_scope_ref": string | null;
  "remediation_class": "AUTO_RETRY" | "AUTO_RECONCILE" | "SPAWN_WORKFLOW" | "REQUEST_CLIENT_INPUT" | "REQUEST_OPERATOR_REVIEW" | "REQUEST_APPROVAL" | "REBUILD_ARTIFACT" | "OPEN_INVESTIGATION" | "SUPERSEDE_AND_REPLAN" | "ABORT_TERMINALLY";
  "remediation_owner_type": "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "CLIENT" | "TENANT_ADMIN" | "SECURITY_OPERATOR";
  "failure_resolution_contract": FailureResolutionContract & {
    "lifecycle_role"?: "ERROR_RECORD";
    "role_specific_binding_policy"?: "ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS";
  };
  "invariant_enforcement_contract": InvariantEnforcementContract & {
    "boundary_scope"?: "ERROR_RECORD";
    "boundary_specific_binding_policy"?: "ERROR_RETAINS_INVARIANT_CLASS_FAULT_CODE_AND_TERMINAL_BINDING";
  };
  "remediation_owner_ref": string | null;
  "reason_codes": Array<string>;
  "affected_object_refs": Array<string>;
  "source_object_refs": Array<string>;
  "caused_by_error_id": string | null;
  "originating_activity_ref": string | null;
  "actor_ref": string | null;
  "service_ref": string | null;
  "authority_operation_ref": string | null;
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other" | null;
  "artifact_retention_ref": string | null;
  "workflow_item_id": string | null;
  "remediation_task_ref": string | null;
  "failure_investigation_ref": string | null;
  "compensation_record_ref": string | null;
  "next_action_ref": string | null;
  "customer_visibility_class": string;
  "operator_visibility_class": string;
  "opened_at": ISO8601DateTimeString;
  "resolved_at": ISO8601DateTimeString;
  "resolution_state": "OPEN" | "IN_PROGRESS" | "MONITORING" | "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED";
  "resolution_basis_ref": string | null;
  "closure_evidence_refs": Array<string>;
  "resolved_by_task_id": string | null;
  "accepted_risk_approval_ref": string | null;
  "accepted_risk_expires_at": ISO8601DateTimeString;
  "reopened_by_error_id": string | null;
  "dedupe_key": string;
  "dedupe_scope": string;
  "first_seen_at": ISO8601DateTimeString;
  "last_seen_at": ISO8601DateTimeString;
  "occurrence_count": number;
  "escalation_state": "NONE" | "OPERATOR_ESCALATED" | "RECONCILIATION_ESCALATED" | "TENANT_ADMIN_ESCALATED" | "SECURITY_ESCALATED" | "INCIDENT_ESCALATED";
  "escalated_at": ISO8601DateTimeString;
  "resolution_notes_ref": string | null;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const ErrorRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/error_record.schema.json", sourceHash: "f0ff4f9d08f635a0b85b985738fafbf226292817153040ddd609d4af4acf281c" } as const;

export type ErrorRecordBlockingEffect = {
  "capability_code": string;
  "impact_level": "BLOCKED" | "DEGRADED" | "REVIEW_REQUIRED";
  "reason_codes": Array<string>;
  "affected_object_refs": Array<string>;
};

export type FailureInvestigation = {
  "investigation_id": string;
  "error_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "failure_resolution_contract": FailureResolutionContract & {
    "lifecycle_role"?: "FAILURE_INVESTIGATION";
    "role_specific_binding_policy"?: "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE";
  };
  "investigation_class": "AUTHORITY_STATE_AMBIGUITY" | "AMENDMENT_READINESS" | "RETENTION_PRIVACY_EXCEPTION" | "AUDIT_PROVENANCE_DIVERGENCE" | "SECURITY_ACCESS_ANOMALY" | "SYSTEM_INVARIANT_BREACH" | "MULTI_ERROR_CORRELATION";
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other" | null;
  "artifact_retention_ref": string | null;
  "workflow_item_id": string | null;
  "owner_type": "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "TENANT_ADMIN" | "SECURITY_OPERATOR";
  "owner_ref": string | null;
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
  "investigation_state": "OPEN" | "EVIDENCE_GATHERING" | "AWAITING_EXTERNAL_INPUT" | "IN_REVIEW" | "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED";
  "investigation_steps_ref": string;
  "due_at": ISO8601DateTimeString;
  "opened_at": ISO8601DateTimeString;
  "last_activity_at": ISO8601DateTimeString;
  "resolved_at": ISO8601DateTimeString;
  "resolution_basis_ref": string | null;
  "outcome": "ROOT_CAUSE_CONFIRMED" | "FALSE_POSITIVE" | "RETRY_AUTHORIZED" | "RECONCILIATION_REQUIRED" | "REMEDIATION_SPAWNED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED" | null;
  "accepted_risk_approval_ref": string | null;
  "superseded_by_investigation_id": string | null;
  "closure_evidence_refs": Array<string>;
  "remediation_task_refs": Array<string>;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const FailureInvestigationSchemaLineage = { schemaId: "https://taxat.dev/schemas/failure_investigation.schema.json", sourceHash: "4408a97aad3eaeec2a269e73db3bd44163792e958db1192d75a30d02371b5849" } as const;

export type FailureLifecycleDashboard = {
  "artifact_type": "FailureLifecycleDashboard";
  "dashboard_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "root_error_ref": string;
  "current_error_ref": string;
  "lineage_error_refs_in_order": Array<string>;
  "current_lineage_state": "OPEN_FAILURE" | "RETRY_SCHEDULED" | "REMEDIATION_ACTIVE" | "INVESTIGATION_ACTIVE" | "COMPENSATION_ACTIVE" | "ACCEPTED_RISK_ACTIVE" | "RESOLVED" | "SUPERSEDED" | "CANCELLED";
  "current_state_source": FailureLifecycleDashboardStateSource;
  "current_owner": FailureLifecycleDashboardCurrentOwner;
  "next_legal_action": FailureLifecycleDashboardNextLegalAction;
  "blocking_scope": FailureLifecycleDashboardBlockingScope;
  "first_opened_at": ISO8601DateTimeString;
  "last_activity_at": ISO8601DateTimeString;
  "remediation_summary": FailureLifecycleDashboardRemediationSummary;
  "compensation_posture": FailureLifecycleDashboardCompensationPosture;
  "investigation_posture": FailureLifecycleDashboardInvestigationPosture;
  "accepted_risk_posture": FailureLifecycleDashboardAcceptedRiskPosture;
  "workflow_coordination": FailureLifecycleDashboardWorkflowCoordination;
  "closure_posture": FailureLifecycleDashboardClosurePosture;
  "lineage_refs": FailureLifecycleDashboardLineageRefs;
  "underlying_error_visibility_policy": "UNDERLYING_ERROR_ALWAYS_VISIBLE";
  "accepted_risk_owner_policy": "ACCEPTED_RISK_REQUIRES_ACCOUNTABLE_OWNER_AND_EXPIRY";
  "data_source_policy": "PERSISTED_FAILURE_OBJECTS_WORKFLOW_AUDIT_AND_PROVENANCE_ONLY";
  "log_reconstruction_policy": "NO_LOG_ONLY_OR_FREE_TEXT_STATUS_RECONSTRUCTION";
  "updated_at": ISO8601DateTimeString;
};
export const FailureLifecycleDashboardSchemaLineage = { schemaId: "https://taxat.dev/schemas/failure_lifecycle_dashboard.schema.json", sourceHash: "eaf04798471c8509a9ef22e7c6ed20f1e1cc833449d7f0b4bae29606ed25a2a9" } as const;

export type FailureLifecycleDashboardSourceArtifactType = "ERROR_RECORD" | "REMEDIATION_TASK" | "COMPENSATION_RECORD" | "FAILURE_INVESTIGATION" | "ACCEPTED_RISK_APPROVAL" | "WORKFLOW_ITEM";

export type FailureLifecycleDashboardOwnerType = "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "CLIENT" | "TENANT_ADMIN" | "SECURITY_OPERATOR";

export type FailureLifecycleDashboardStateSource = {
  "source_artifact_type": FailureLifecycleDashboardSourceArtifactType;
  "source_ref": string;
  "state_code": string;
  "state_changed_at": ISO8601DateTimeString;
};

export type FailureLifecycleDashboardCurrentOwner = {
  "owner_type": FailureLifecycleDashboardOwnerType;
  "owner_ref_or_null": string | null;
  "source_artifact_type": FailureLifecycleDashboardSourceArtifactType;
  "source_ref": string;
};

export type FailureLifecycleDashboardNextLegalAction = {
  "action_state": "ACTION_AVAILABLE" | "WAITING_ON_EXTERNAL" | "WAITING_ON_SCHEDULE" | "REVIEW_DUE" | "NO_FURTHER_ACTION";
  "action_code_or_null": string | null;
  "action_ref_or_null": string | null;
  "source_artifact_type_or_null": "ERROR_RECORD" | "REMEDIATION_TASK" | "COMPENSATION_RECORD" | "FAILURE_INVESTIGATION" | "ACCEPTED_RISK_APPROVAL" | "WORKFLOW_ITEM" | null;
  "due_at_or_null": ISO8601DateTimeString;
  "waiting_on_actor_or_null": "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM" | null;
  "reason_codes": Array<string>;
};

export type FailureLifecycleDashboardBlockingScope = {
  "blocking_class": "NON_BLOCKING" | "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL";
  "reason_codes": Array<string>;
  "affected_object_refs": Array<string>;
  "workflow_item_ref_or_null": string | null;
};

export type FailureLifecycleDashboardRemediationSummary = {
  "active_task_ref_or_null": string | null;
  "latest_task_ref_or_null": string | null;
  "task_state_or_null": "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "CANCELLED" | "SUPERSEDED" | null;
  "task_owner_type_or_null": "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "CLIENT" | "TENANT_ADMIN" | "SECURITY_OPERATOR" | null;
  "task_owner_ref_or_null": string | null;
  "due_at_or_null": ISO8601DateTimeString;
  "error_resolution_effect_or_null": "ERROR_REMAINS_OPEN" | "ERROR_MOVES_TO_IN_PROGRESS" | "ERROR_MOVES_TO_MONITORING" | "ERROR_MOVES_TO_RESOLVED" | "ERROR_MOVES_TO_ACCEPTED_RISK" | "ERROR_MOVES_TO_SUPERSEDED" | "ERROR_MOVES_TO_CANCELLED" | null;
};

export type FailureLifecycleDashboardCompensationPosture = {
  "state": "NONE" | "PLANNED" | "IN_PROGRESS" | "APPLIED" | "VERIFIED" | "FAILED" | "CANCELLED" | "SUPERSEDED";
  "active_compensation_ref_or_null": string | null;
  "latest_compensation_ref_or_null": string | null;
  "target_object_refs": Array<string>;
  "verification_ref_or_null": string | null;
  "resolution_basis_ref_or_null": string | null;
  "closure_evidence_refs": Array<string>;
};

export type FailureLifecycleDashboardInvestigationPosture = {
  "state": "NONE" | "ACTIVE" | "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED";
  "active_investigation_ref_or_null": string | null;
  "latest_investigation_ref_or_null": string | null;
  "accepted_risk_approval_ref_or_null": string | null;
  "outcome_or_null": "ROOT_CAUSE_CONFIRMED" | "FALSE_POSITIVE" | "RETRY_AUTHORIZED" | "RECONCILIATION_REQUIRED" | "REMEDIATION_SPAWNED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED" | null;
};

export type FailureLifecycleDashboardAcceptedRiskPosture = {
  "state": "NONE" | "ACTIVE" | "EXPIRED" | "REVOKED" | "SUPERSEDED";
  "approval_ref_or_null": string | null;
  "decision_basis_or_null": "EXPLICIT_APPROVAL" | "POLICY_BASIS" | null;
  "approver_type_or_null": "APPROVER" | "TENANT_ADMIN" | "SECURITY_OPERATOR" | "SYSTEM_POLICY" | null;
  "approver_ref_or_null": string | null;
  "bounded_scope_refs": Array<string>;
  "expires_at_or_null": ISO8601DateTimeString;
  "revoked_at_or_null": ISO8601DateTimeString;
  "accountable_owner_type_or_null": "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "CLIENT" | "TENANT_ADMIN" | "SECURITY_OPERATOR" | null;
  "accountable_owner_ref_or_null": string | null;
};

export type FailureLifecycleDashboardWorkflowCoordination = {
  "workflow_item_ref_or_null": string | null;
  "lifecycle_state_or_null": "OPEN" | "IN_PROGRESS" | "WAITING_ON_CLIENT" | "WAITING_ON_AUTHORITY" | "BLOCKED" | "DONE" | "CANCELLED" | "STALE" | null;
  "current_assignee_ref_or_null": string | null;
  "waiting_on_actor_or_null": "NONE" | "CUSTOMER" | "STAFF" | "AUTHORITY" | "SYSTEM" | null;
  "customer_status_projection_or_null": "UNDER_REVIEW" | "ACTION_REQUIRED" | "WAITING_ON_CONFIRMATION" | "RESOLVED" | "CLOSED" | null;
};

export type FailureLifecycleDashboardClosurePosture = {
  "resolution_state": "OPEN" | "IN_PROGRESS" | "MONITORING" | "RESOLVED" | "ACCEPTED_RISK" | "SUPERSEDED" | "CANCELLED";
  "resolution_basis_ref_or_null": string | null;
  "closure_evidence_refs": Array<string>;
  "resolved_by_task_id_or_null": string | null;
  "resolved_at_or_null": ISO8601DateTimeString;
};

export type FailureLifecycleDashboardLineageRefs = {
  "remediation_task_refs": Array<string>;
  "compensation_record_refs": Array<string>;
  "failure_investigation_refs": Array<string>;
  "accepted_risk_approval_refs": Array<string>;
  "workflow_item_refs": Array<string>;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};

export type FailureResolutionContract = {
  "contract_version": "FAILURE_RESOLUTION_V1";
  "lifecycle_role": "ERROR_RECORD" | "REMEDIATION_TASK" | "COMPENSATION_RECORD" | "FAILURE_INVESTIGATION" | "ACCEPTED_RISK_APPROVAL";
  "role_specific_binding_policy": "ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS" | "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR" | "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE" | "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE" | "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS";
  "material_failure_policy": "NO_MATERIAL_FAILURE_WITHOUT_DURABLE_OBJECT";
  "ownership_policy": "OWNER_TYPE_AND_REF_OR_EXPLICIT_SYSTEM_OWNER_REQUIRED";
  "next_action_policy": "OPEN_FAILURES_REQUIRE_ONE_LAWFUL_NEXT_PATH";
  "retry_policy": "RETRY_CLASS_BUDGET_AND_PRECONDITIONS_BIND_EXECUTION";
  "closure_policy": "TERMINAL_OR_COMPLETED_STATES_REQUIRE_BASIS_EVIDENCE_AND_AUDIT";
  "accepted_risk_policy": "ACCEPTED_RISK_REQUIRES_APPROVAL_EXPIRY_AND_BOUNDED_SCOPE";
  "linkage_policy": "ERROR_TASK_COMPENSATION_INVESTIGATION_APPROVAL_LINKS_MUST_STAY_COHERENT";
};
export const FailureResolutionContractSchemaLineage = { schemaId: "https://taxat.dev/schemas/failure_resolution_contract.schema.json", sourceHash: "8f2aa4dfc10855f3385abe43ad110e6317c3391b5ee0b5911662a1f565fb896f" } as const;

export type LogRecord = {
  "correlation_context"?: {
    "service_name": string;
    "environment_ref": string;
  };
};
export const LogRecordSchemaLineage = { schemaId: "https://taxat.dev/schemas/log_record.schema.json", sourceHash: "19c4427772a90b4ac60cec4d74c311015eba6aa7d4932845d1e6eaff449095a4" } as const;

export type MetricEvent = {
  "correlation_context"?: {
    "service_name": string;
    "environment_ref": string;
  };
};
export const MetricEventSchemaLineage = { schemaId: "https://taxat.dev/schemas/metric_event.schema.json", sourceHash: "f3a375bab8664cf2375fc3a01b12e4967c19c12e6a6a3aab61bb8bc8cf639768" } as const;

export type RemediationTask = {
  "task_id": string;
  "error_id": string;
  "manifest_id": string;
  "root_manifest_id": string;
  "task_type": "FIX_DATA" | "RESOLVE_CONFLICT" | "REVIEW_PARITY" | "APPROVE_OVERRIDE" | "RELINK_AUTHORITY" | "RETRY_AUTHORITY_OPERATION" | "RECONCILE_SUBMISSION_STATE" | "REQUEST_SUPPORTING_EVIDENCE" | "CHECK_RETENTION_HOLD" | "REPLAY_RUN" | "ESCALATE_SECURITY_ISSUE" | "OPEN_FAILURE_INVESTIGATION";
  "owner_type": "SYSTEM" | "SERVICE_OPERATOR" | "REVIEWER" | "APPROVER" | "CLIENT" | "TENANT_ADMIN" | "SECURITY_OPERATOR";
  "owner_ref": string | null;
  "failure_resolution_contract": FailureResolutionContract & {
    "lifecycle_role"?: "REMEDIATION_TASK";
    "role_specific_binding_policy"?: "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR";
  };
  "due_at": ISO8601DateTimeString;
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" | "CRITICAL";
  "task_state": "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "WAITING" | "COMPLETED" | "CANCELLED" | "SUPERSEDED";
  "remediation_steps_ref": string;
  "blocking_class": "NON_BLOCKING" | "BLOCKS_AUTOMATION" | "BLOCKS_REVIEW_PROGRESS" | "BLOCKS_FILING" | "BLOCKS_AMENDMENT" | "BLOCKS_ERASURE" | "BLOCKS_RUN" | "BLOCKS_AUTHORITY_CALL";
  "retention_class": "regulated_record" | "derived_artifact" | "operational_log" | "analytics_projection" | "policy_governed_other" | null;
  "artifact_retention_ref": string | null;
  "workflow_item_id": string | null;
  "superseded_by_task_id": string | null;
  "closure_outcome": "FIX_APPLIED" | "CONFLICT_RESOLVED" | "PARITY_REVIEW_COMPLETED" | "OVERRIDE_APPROVED" | "AUTHORITY_RELINKED" | "AUTHORITY_RETRIED" | "SUBMISSION_RECONCILED" | "EVIDENCE_REQUESTED" | "HOLD_CONFIRMED" | "RUN_REPLAYED" | "SECURITY_ESCALATED" | "INVESTIGATION_OPENED" | "ACCEPTED_RISK" | "CANCELLED" | "SUPERSEDED" | null;
  "resolution_basis_ref": string | null;
  "closure_evidence_refs": Array<string>;
  "error_resolution_effect": "ERROR_REMAINS_OPEN" | "ERROR_MOVES_TO_IN_PROGRESS" | "ERROR_MOVES_TO_MONITORING" | "ERROR_MOVES_TO_RESOLVED" | "ERROR_MOVES_TO_ACCEPTED_RISK" | "ERROR_MOVES_TO_SUPERSEDED" | "ERROR_MOVES_TO_CANCELLED";
  "created_at": ISO8601DateTimeString;
  "started_at": ISO8601DateTimeString;
  "completed_at": ISO8601DateTimeString;
  "accepted_risk_approval_ref": string | null;
  "investigation_ref": string | null;
  "audit_refs": Array<string>;
  "provenance_refs": Array<string>;
};
export const RemediationTaskSchemaLineage = { schemaId: "https://taxat.dev/schemas/remediation_task.schema.json", sourceHash: "7667724987bf13d3a9a0fc1a45b2394d48806e34907050a038986a67fe302897" } as const;

export type TelemetryResource = {
  "resource_id": string;
  "service_name": string;
  "environment_ref": string;
  "build_ref": string;
  "deployment_identity": {
    "deployment_ref": string;
    "instance_ref": string;
    "started_at": ISO8601DateTimeString;
    "ended_at"?: ISO8601DateTimeString;
  };
  "resource_attributes"?: TelemetryResourceAttributeMap;
};
export const TelemetryResourceSchemaLineage = { schemaId: "https://taxat.dev/schemas/telemetry_resource.schema.json", sourceHash: "6fcd25e2766afe7043d8fc5573fd4a43cf657c5c697e0833588a5599ea491ec9" } as const;

export type TelemetryResourceResourceRef = string;

export type TelemetryResourceAttributeValue = string | number | number | boolean | null;

export type TelemetryResourceAttributeMap = {
  [key: string]: TelemetryResourceAttributeValue;
};

export type TelemetryResourceCorrelationContext = {
  "tenant_id"?: string;
  "client_id"?: string | null;
  "manifest_id"?: string | null;
  "root_manifest_id"?: string | null;
  "parent_manifest_id"?: string | null;
  "continuation_of_manifest_id"?: string | null;
  "replay_of_manifest_id"?: string | null;
  "nightly_batch_run_ref"?: string | null;
  "nightly_window_key"?: string | null;
  "selection_disposition"?: "EXECUTE_NEW_MANIFEST" | "EXECUTE_CONTINUATION_CHILD" | "REUSE_EXISTING_TERMINAL_RESULT" | "DEFER_ACTIVE_ATTEMPT" | "DEFER_RETRY_WINDOW" | "ESCALATE_ONLY" | "SKIP_INELIGIBLE" | null;
  "trace_id"?: string | null;
  "span_id"?: string | null;
  "run_kind"?: "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION" | null;
  "mode"?: "COMPLIANCE" | "ANALYSIS" | null;
  "replay_class"?: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  "comparison_mode"?: "EXACT_HASH_MATCH" | "COUNTERFACTUAL_DECLARED" | "LIMITED_HISTORICAL_COMPARISON" | "BASIS_INCOMPLETE" | "BASIS_CORRUPT" | null;
  "basis_validation_state"?: "VALID" | "RETENTION_LIMITED" | "MISSING_DEPENDENCY" | "CORRUPT" | "SCHEMA_INCOMPATIBLE" | "BUILD_UNAVAILABLE" | null;
  "idempotency_key"?: string | null;
  "access_binding_hash"?: string | null;
  "continuation_basis"?: string | null;
  "input_inheritance_mode"?: "FRESH_CHILD_COLLECTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "config_inheritance_mode"?: "FRESH_CHILD_RESOLUTION" | "REPLAY_EXACT" | "RECOVERY_EXACT" | "HISTORICAL_EXPLICIT" | null;
  "gate_code"?: string | null;
  "workflow_item_id"?: string | null;
  "task_id"?: string | null;
  "investigation_id"?: string | null;
  "compensation_id"?: string | null;
  "accepted_risk_approval_id"?: string | null;
  "submission_record_id"?: string | null;
  "drift_id"?: string | null;
  "amendment_case_id"?: string | null;
  "amendment_bundle_id"?: string | null;
  "baseline_envelope_id"?: string | null;
  "retroactive_impact_id"?: string | null;
  "authority_operation_id"?: string | null;
  "error_id"?: string | null;
  "retention_class"?: string | null;
  "service_name"?: string | null;
  "environment_ref"?: string | null;
  "code_build_id"?: string | null;
  "expected_execution_basis_hash"?: string | null;
  "actual_execution_basis_hash"?: string | null;
  "expected_deterministic_outcome_hash"?: string | null;
  "actual_deterministic_outcome_hash"?: string | null;
  "manifest_lineage_trace_ref"?: string | null;
  "manifest_branch_decision"?: ManifestBranchDecisionContract;
  "manifest_start_claim"?: ManifestStartClaimContract;
};

export type TraceSpan = {
  "correlation_context"?: {
    "manifest_id": string;
    "trace_id": string;
    "span_id": string;
    "service_name": string;
    "environment_ref": string;
  };
};
export const TraceSpanSchemaLineage = { schemaId: "https://taxat.dev/schemas/trace_span.schema.json", sourceHash: "824e99148781a7cb5ba8aaeb88a23762c676aef65996cac7108179af857bbf13" } as const;

export const RetentionFailureAndObservabilityBindingManifest = { familyRef: "RETENTION_FAILURE_AND_OBSERVABILITY", schemaCount: 12 } as const;
