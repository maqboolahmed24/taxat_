import {
  bindRetentionToErrorAndRemediation,
  type ArtifactRetentionRecord,
  type RetentionTagRecord,
} from "../../../backend-retention/src/index.ts";
import {
  acceptedRiskApprovalRef,
  buildAcceptedRiskApproval,
  buildCompensationRecord,
  buildFailureInvestigation,
  buildFailureResolutionContract,
  buildRemediationTask,
  compensationRecordRef,
  failureInvestigationRef,
  remediationTaskRef,
  type AcceptedRiskApproval,
  type AcceptedRiskApprovalInput,
  type AcceptedRiskApproverType,
  type AcceptedRiskDecisionBasis,
  type CompensationRecord,
  type CompensationRecordInput,
  type FailureCompanionOwnerType,
  type FailureCompensationOwnerType,
  type FailureInvestigation,
  type FailureInvestigationInput,
  type FailureInvestigationOwnerType,
  type RemediationTask,
  type RemediationTaskInput,
} from "../../../backend-workflow/src/index.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  assertRetentionAnchorLinkage,
  RetentionFailureBindingError,
} from "./assert_retention_anchor_linkage.ts";
import {
  RETENTION_PRIVACY_ERROR_CONDITION_MAP,
  type OpenRetentionOrPrivacyErrorResult,
  type RetentionPrivacyErrorRecord,
} from "./open_retention_or_privacy_error.ts";

export type RetentionFollowUpAcceptedRiskInput = {
  approver_ref?: string | null;
  approver_type?: AcceptedRiskApproverType;
  decision_basis?: AcceptedRiskDecisionBasis;
  expires_at: string;
  policy_basis_ref?: string | null;
  rationale_ref: string;
};

export type BindRetentionFollowUpObjectsInput = {
  accepted_risk?: RetentionFollowUpAcceptedRiskInput | null;
  artifact_retention: ArtifactRetentionRecord;
  compensation_owner_ref?: string | null;
  compensation_owner_type?: FailureCompensationOwnerType;
  due_at?: string | null;
  investigation_owner_ref?: string | null;
  investigation_owner_type?: FailureInvestigationOwnerType;
  opened_error: OpenRetentionOrPrivacyErrorResult;
  remediation_owner_ref?: string | null;
  remediation_owner_type?: FailureCompanionOwnerType;
  retention_tag: RetentionTagRecord;
};

export type RetentionFollowUpObjects = {
  accepted_risk_approval: AcceptedRiskApproval | null;
  compensation_record: CompensationRecord | null;
  failure_investigation: FailureInvestigation | null;
  remediation_task: RemediationTask | null;
};

function bindingError(detail: string): never {
  throw new RetentionFailureBindingError("RETENTION_FAILURE_BINDING_INVALID", detail);
}

function refId(ref: string, prefix: string) {
  if (!ref.startsWith(prefix)) {
    bindingError(`${ref} must start with ${prefix}`);
  }
  return ref.slice(prefix.length);
}

function addDays(instant: string, days: number) {
  return new Date(Date.parse(instant) + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

function ownerRefOrDefault(ownerType: FailureCompanionOwnerType, explicit: string | null | undefined) {
  if (ownerType === "SYSTEM") {
    return null;
  }
  return explicit ?? "operator://retention-control";
}

function compensationOwnerRefOrDefault(
  ownerType: FailureCompensationOwnerType,
  explicit: string | null | undefined,
) {
  if (ownerType === "SYSTEM") {
    return null;
  }
  return explicit ?? "operator://retention-compensation";
}

function investigationOwnerRefOrDefault(
  ownerType: FailureInvestigationOwnerType,
  explicit: string | null | undefined,
) {
  return explicit ?? "operator://retention-investigation";
}

function auditRefs(errorRecord: RetentionPrivacyErrorRecord, suffix: string) {
  return [
    ...errorRecord.audit_refs,
    `audit-publication://retention-follow-up/${suffix}/${stableJsonHash({
      error_id: errorRecord.error_id,
      suffix,
    })}`,
  ];
}

function provenanceRefs(errorRecord: RetentionPrivacyErrorRecord, retainedBasisRef: string) {
  return [...new Set([...errorRecord.provenance_refs, retainedBasisRef])].sort((left, right) =>
    left.localeCompare(right),
  );
}

function assertErrorRefMatchesBuiltObjects(input: {
  accepted_risk_approval: AcceptedRiskApproval | null;
  compensation_record: CompensationRecord | null;
  error_record: RetentionPrivacyErrorRecord;
  failure_investigation: FailureInvestigation | null;
  remediation_task: RemediationTask | null;
}) {
  if (
    input.remediation_task &&
    input.error_record.remediation_task_ref !== remediationTaskRef(input.remediation_task)
  ) {
    bindingError("ErrorRecord.remediation_task_ref must match the built RemediationTask");
  }
  if (
    input.failure_investigation &&
    input.error_record.failure_investigation_ref !==
      failureInvestigationRef(input.failure_investigation)
  ) {
    bindingError(
      "ErrorRecord.failure_investigation_ref must match the built FailureInvestigation",
    );
  }
  if (
    input.compensation_record &&
    input.error_record.compensation_record_ref !== compensationRecordRef(input.compensation_record)
  ) {
    bindingError("ErrorRecord.compensation_record_ref must match the built CompensationRecord");
  }
  if (
    input.accepted_risk_approval &&
    input.error_record.accepted_risk_approval_ref !== null &&
    input.error_record.accepted_risk_approval_ref !==
      acceptedRiskApprovalRef(input.accepted_risk_approval)
  ) {
    bindingError(
      "ErrorRecord.accepted_risk_approval_ref must match the built AcceptedRiskApproval",
    );
  }
}

function buildRetentionRemediationTask(input: {
  artifact_retention: ArtifactRetentionRecord;
  due_at: string | null;
  error_record: RetentionPrivacyErrorRecord;
  owner_ref: string | null;
  owner_type: FailureCompanionOwnerType;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}) {
  if (input.error_record.remediation_task_ref === null) {
    return null;
  }
  const taskId = refId(input.error_record.remediation_task_ref, "remediation-task://");
  const companion = {
    audit_refs: auditRefs(input.error_record, "remediation-opened"),
    blocking_class: "BLOCKS_ERASURE",
    created_at: input.error_record.opened_at,
    due_at: input.due_at,
    error_id: input.error_record.error_id,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "REMEDIATION_TASK",
    }),
    manifest_id: input.error_record.manifest_id,
    owner_ref: input.owner_ref,
    owner_type: input.owner_type,
    provenance_refs: provenanceRefs(input.error_record, input.retained_basis_ref),
    remediation_steps_ref: `remediation-steps://retention/${stableJsonHash({
      error_id: input.error_record.error_id,
    })}`,
    root_manifest_id: input.error_record.root_manifest_id,
    task_id: taskId,
    task_type: "CHECK_RETENTION_HOLD",
    workflow_item_id: input.error_record.workflow_item_id,
  } satisfies RemediationTaskInput;
  const taskInput = bindRetentionToErrorAndRemediation({
    artifact_retention: input.artifact_retention,
    companion,
    kind: "REMEDIATION_TASK",
    retained_basis_ref: input.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  return buildRemediationTask(taskInput);
}

function buildRetentionCompensation(input: {
  artifact_retention: ArtifactRetentionRecord;
  error_record: RetentionPrivacyErrorRecord;
  owner_ref: string | null;
  owner_type: FailureCompensationOwnerType;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}) {
  if (input.error_record.compensation_record_ref === null) {
    return null;
  }
  const compensationId = refId(
    input.error_record.compensation_record_ref,
    "compensation-record://",
  );
  const companion = {
    audit_refs: auditRefs(input.error_record, "compensation-planned"),
    compensation_id: compensationId,
    compensation_mode: "PRESERVE_AND_LIMIT",
    compensation_steps_ref: `compensation-steps://retention/${stableJsonHash({
      error_id: input.error_record.error_id,
    })}`,
    created_at: input.error_record.opened_at,
    error_id: input.error_record.error_id,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "COMPENSATION_RECORD",
    }),
    manifest_id: input.error_record.manifest_id,
    owner_ref: input.owner_ref,
    owner_type: input.owner_type,
    provenance_refs: provenanceRefs(input.error_record, input.retained_basis_ref),
    root_manifest_id: input.error_record.root_manifest_id,
    target_object_refs: input.error_record.affected_object_refs,
    workflow_item_id: input.error_record.workflow_item_id,
  } satisfies CompensationRecordInput;
  const compensationInput = bindRetentionToErrorAndRemediation({
    artifact_retention: input.artifact_retention,
    companion,
    kind: "COMPENSATION_RECORD",
    retained_basis_ref: input.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  return buildCompensationRecord(compensationInput);
}

function buildRetentionInvestigation(input: {
  artifact_retention: ArtifactRetentionRecord;
  due_at: string | null;
  error_record: RetentionPrivacyErrorRecord;
  owner_ref: string;
  owner_type: FailureInvestigationOwnerType;
  remediation_task: RemediationTask | null;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}) {
  if (input.error_record.failure_investigation_ref === null) {
    return null;
  }
  const investigationId = refId(
    input.error_record.failure_investigation_ref,
    "failure-investigation://",
  );
  const companion = {
    audit_refs: auditRefs(input.error_record, "investigation-opened"),
    due_at: input.due_at,
    error_id: input.error_record.error_id,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "FAILURE_INVESTIGATION",
    }),
    investigation_class: "RETENTION_PRIVACY_EXCEPTION",
    investigation_id: investigationId,
    investigation_steps_ref: `investigation-steps://retention/${stableJsonHash({
      error_id: input.error_record.error_id,
    })}`,
    manifest_id: input.error_record.manifest_id,
    opened_at: input.error_record.opened_at,
    owner_ref: input.owner_ref,
    owner_type: input.owner_type,
    priority:
      input.error_record.severity === "CRITICAL"
        ? "CRITICAL"
        : input.error_record.severity === "ERROR"
          ? "HIGH"
          : "NORMAL",
    provenance_refs: provenanceRefs(input.error_record, input.retained_basis_ref),
    remediation_task_refs: input.remediation_task
      ? [remediationTaskRef(input.remediation_task)]
      : [],
    root_manifest_id: input.error_record.root_manifest_id,
    workflow_item_id: input.error_record.workflow_item_id,
  } satisfies FailureInvestigationInput;
  const investigationInput = bindRetentionToErrorAndRemediation({
    artifact_retention: input.artifact_retention,
    companion,
    kind: "FAILURE_INVESTIGATION",
    retained_basis_ref: input.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  return buildFailureInvestigation(investigationInput);
}

function buildRetentionAcceptedRisk(input: {
  accepted_risk: RetentionFollowUpAcceptedRiskInput | null | undefined;
  artifact_retention: ArtifactRetentionRecord;
  error_record: RetentionPrivacyErrorRecord;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}) {
  if (!input.accepted_risk) {
    return null;
  }
  const decisionBasis = input.accepted_risk.decision_basis ?? "POLICY_BASIS";
  const approverType =
    input.accepted_risk.approver_type ??
    (decisionBasis === "POLICY_BASIS" ? "SYSTEM_POLICY" : "APPROVER");
  const approvalId = `accepted-risk.${stableJsonHash({
    error_id: input.error_record.error_id,
    retained_basis_ref: input.retained_basis_ref,
  })}`;
  const companion = {
    accepted_risk_approval_id: approvalId,
    approved_at: input.error_record.opened_at,
    approver_ref:
      decisionBasis === "EXPLICIT_APPROVAL"
        ? (input.accepted_risk.approver_ref ?? "approver://retention-exception")
        : null,
    approver_type: approverType,
    audit_refs: auditRefs(input.error_record, "accepted-risk-active"),
    bounded_scope_refs: input.error_record.affected_object_refs,
    decision_basis: decisionBasis,
    error_id: input.error_record.error_id,
    expires_at: input.accepted_risk.expires_at,
    failure_resolution_contract: buildFailureResolutionContract({
      lifecycle_role: "ACCEPTED_RISK_APPROVAL",
    }),
    manifest_id: input.error_record.manifest_id,
    policy_basis_ref:
      decisionBasis === "POLICY_BASIS"
        ? (input.accepted_risk.policy_basis_ref ?? input.retained_basis_ref)
        : null,
    provenance_refs: provenanceRefs(input.error_record, input.retained_basis_ref),
    rationale_ref: input.accepted_risk.rationale_ref,
    root_manifest_id: input.error_record.root_manifest_id,
    workflow_item_id: input.error_record.workflow_item_id,
  } satisfies AcceptedRiskApprovalInput;
  const approvalInput = bindRetentionToErrorAndRemediation({
    artifact_retention: input.artifact_retention,
    companion,
    kind: "ACCEPTED_RISK_APPROVAL",
    retained_basis_ref: input.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  return buildAcceptedRiskApproval(approvalInput);
}

export function bindRetentionFollowUpObjects(
  input: BindRetentionFollowUpObjectsInput,
): RetentionFollowUpObjects {
  const errorRecord = input.opened_error.error_record;
  const anchor = assertRetentionAnchorLinkage({
    artifact_retention: input.artifact_retention,
    companions: [
      {
        artifact_retention_ref: errorRecord.artifact_retention_ref,
        label: "ErrorRecord",
        retention_class: errorRecord.retention_class,
      },
    ],
    retained_basis_ref: input.opened_error.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  const mapping = RETENTION_PRIVACY_ERROR_CONDITION_MAP[input.opened_error.condition];
  const dueAt = input.due_at ?? addDays(errorRecord.opened_at, 1);
  const remediationOwnerType =
    input.remediation_owner_type ?? errorRecord.remediation_owner_type;
  const remediationTask = mapping.requires_remediation_task
    ? buildRetentionRemediationTask({
        artifact_retention: anchor.artifact_retention,
        due_at: dueAt,
        error_record: errorRecord,
        owner_ref: ownerRefOrDefault(remediationOwnerType, input.remediation_owner_ref),
        owner_type: remediationOwnerType,
        retained_basis_ref: anchor.retained_basis_ref,
        retention_tag: anchor.retention_tag,
      })
    : null;
  const compensationOwnerType = input.compensation_owner_type ?? "SERVICE_OPERATOR";
  const compensationRecord = mapping.requires_compensation
    ? buildRetentionCompensation({
        artifact_retention: anchor.artifact_retention,
        error_record: errorRecord,
        owner_ref: compensationOwnerRefOrDefault(
          compensationOwnerType,
          input.compensation_owner_ref,
        ),
        owner_type: compensationOwnerType,
        retained_basis_ref: anchor.retained_basis_ref,
        retention_tag: anchor.retention_tag,
      })
    : null;
  const investigationOwnerType = input.investigation_owner_type ?? "SERVICE_OPERATOR";
  const failureInvestigation = mapping.requires_investigation
    ? buildRetentionInvestigation({
        artifact_retention: anchor.artifact_retention,
        due_at: dueAt,
        error_record: errorRecord,
        owner_ref: investigationOwnerRefOrDefault(
          investigationOwnerType,
          input.investigation_owner_ref,
        ),
        owner_type: investigationOwnerType,
        remediation_task: remediationTask,
        retained_basis_ref: anchor.retained_basis_ref,
        retention_tag: anchor.retention_tag,
      })
    : null;
  const acceptedRiskApproval = buildRetentionAcceptedRisk({
    accepted_risk: input.accepted_risk,
    artifact_retention: anchor.artifact_retention,
    error_record: errorRecord,
    retained_basis_ref: anchor.retained_basis_ref,
    retention_tag: anchor.retention_tag,
  });

  assertErrorRefMatchesBuiltObjects({
    accepted_risk_approval: acceptedRiskApproval,
    compensation_record: compensationRecord,
    error_record: errorRecord,
    failure_investigation: failureInvestigation,
    remediation_task: remediationTask,
  });

  return {
    accepted_risk_approval: acceptedRiskApproval,
    compensation_record: compensationRecord,
    failure_investigation: failureInvestigation,
    remediation_task: remediationTask,
  };
}
